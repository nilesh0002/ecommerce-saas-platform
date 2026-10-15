import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { getCurrentUser, invalidateCurrentUser } from '../security/current-user';
import { toAuthUser } from '../security/role-policy';

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

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.accessToken;
    if (!token) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload & AuthUser;
    if (!payload.id || !payload.email) throw new AppError(401, 'Invalid access token', 'INVALID_TOKEN');
    const user = await getCurrentUser(payload.id);
    if (!user || !user.isActive) throw new AppError(401, 'Account is inactive', 'ACCOUNT_INACTIVE');
    req.user = toAuthUser(user);
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

export const invalidateAuthenticatedUser = invalidateCurrentUser;
