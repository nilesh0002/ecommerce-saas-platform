import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import { generateOtp, hashToken, randomToken } from '../../utils/crypto';
import { sendOtpEmail, sendPasswordResetEmail } from '../../utils/mailer';
import { revokeUserAccess } from '../../sockets';

const accessOptions: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'] };

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  emailVerified: boolean;
}

const publicUser = (user: PublicUser): PublicUser => user;

export async function issueTokens(user: PublicUser) {
  const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_ACCESS_SECRET, accessOptions);
  const refreshToken = randomToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN)),
    },
  });
  return { accessToken, refreshToken };
}

function parseDuration(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
  return amount * multiplier;
}

export async function register(input: {
  email: string; password: string; firstName: string; lastName: string; phone?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, 'An account with this email already exists', 'EMAIL_EXISTS');
  const passwordHash = await bcrypt.hash(input.password, 12);
  const otp = generateOtp();
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      otpHash: hashToken(otp),
      otpExpiresAt: new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60000),
      cart: { create: {} },
      wishlist: { create: {} },
    },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, emailVerified: true },
  });
  await sendOtpEmail(user.email, otp);
  return { user: publicUser(user), tokens: await issueTokens(user) };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, emailVerified: true, passwordHash: true, isActive: true },
  });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) throw new AppError(403, 'Account is inactive', 'ACCOUNT_INACTIVE');
  const safeUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified,
  };
  return { user: publicUser(safeUser), tokens: await issueTokens(safeUser) };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, emailVerified: true },
  });
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  return user;
}

export async function verifyOtp(email: string, otp: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.otpHash || !user.otpExpiresAt || user.otpExpiresAt < new Date() || user.otpHash !== hashToken(otp)) {
    throw new AppError(400, 'Invalid or expired OTP', 'INVALID_OTP');
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, otpHash: null, otpExpiresAt: null },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, emailVerified: true },
  });
  return { user: publicUser(updated), tokens: await issueTokens(updated) };
}

export async function refresh(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, emailVerified: true, isActive: true } } },
  });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.user.isActive) {
    throw new AppError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }
  const tokens = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const next = randomToken();
    await tx.refreshToken.create({
      data: { tokenHash: hashToken(next), userId: stored.userId, expiresAt: new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN)) },
    });
    return { accessToken: jwt.sign({ id: stored.user.id, email: stored.user.email, role: stored.user.role }, env.JWT_ACCESS_SECRET, accessOptions), refreshToken: next };
  });
  return { user: publicUser(stored.user), tokens };
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) return;
  const token = randomToken();
  await prisma.user.update({ where: { id: user.id }, data: { resetTokenHash: hashToken(token), resetTokenExpiresAt: new Date(Date.now() + env.PASSWORD_RESET_EXPIRY_MINUTES * 60000) } });
  await sendPasswordResetEmail(user.email, token);
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const user = await prisma.user.findFirst({ where: { resetTokenHash: hashToken(token), resetTokenExpiresAt: { gt: new Date() } } });
  if (!user) throw new AppError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN');
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12), resetTokenHash: null, resetTokenExpiresAt: null } }),
    prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await revokeUserAccess(user.id);
}

