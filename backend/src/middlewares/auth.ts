import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.accessToken;
    if (!token) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload & AuthUser;
    if (!payload.id || !payload.email || !payload.role) throw new AppError(401, 'Invalid access token', 'INVALID_TOKEN');
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, 'Invalid or expired access token', 'INVALID_TOKEN'));
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Authentication required', 'AUTH_REQUIRED'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'Insufficient permissions', 'FORBIDDEN'));
      return;
    }
    next();
  };
}

export async function loadCurrentUser(req: Request): Promise<void> {
  if (!req.user) return;
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isActive: true } });
  if (!user?.isActive) throw new AppError(401, 'Account is inactive', 'ACCOUNT_INACTIVE');
}
