import { Request, Response } from 'express';
import { z } from 'zod';
import * as service from './service';
import { forgotPasswordSchema, loginSchema, otpSchema, registerSchema, resetPasswordSchema } from './validation';
import { AppError } from '../../utils/errors';
import { getAuthCookieOptions } from '../../config/cookies';

function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }): void {
  const cookieOptions = getAuthCookieOptions();
  res.cookie('accessToken', tokens.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', tokens.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export async function register(req: Request, res: Response): Promise<void> {
  const result = await service.register(registerSchema.parse(req.body));
  setAuthCookies(res, result.tokens);
  res.status(201).json({ success: true, data: result });
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await service.login(...Object.values(loginSchema.parse(req.body)) as [string, string]);
  setAuthCookies(res, result.tokens);
  res.json({ success: true, data: result });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
  res.json({ success: true, data: await service.getCurrentUser(req.user.id) });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const result = await service.verifyOtp(...Object.values(otpSchema.parse(req.body)) as [string, string]);
  setAuthCookies(res, result.tokens);
  res.json({ success: true, data: result });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError(401, 'Refresh token required', 'REFRESH_REQUIRED');
  const result = await service.refresh(token);
  setAuthCookies(res, result.tokens);
  res.json({ success: true, data: result });
}

export async function logout(req: Request, res: Response): Promise<void> {
  if (req.cookies?.refreshToken) await service.revokeRefreshToken(req.cookies.refreshToken);
  const cookieOptions = getAuthCookieOptions();
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.json({ success: true, data: { message: 'Logged out successfully' } });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  await service.requestPasswordReset(forgotPasswordSchema.parse(req.body).email);
  res.json({ success: true, data: { message: 'If the account exists, reset instructions have been sent' } });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const input = resetPasswordSchema.parse(req.body);
  await service.resetPassword(input.token, input.password);
  res.json({ success: true, data: { message: 'Password reset successfully' } });
}

export const validateBody = <T extends z.ZodType>(schema: T) => (req: Request, _res: Response, next: (error?: unknown) => void) => {
  req.body = schema.parse(req.body);
  next();
};
