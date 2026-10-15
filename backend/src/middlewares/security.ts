import { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

export const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return Array.from(value).filter((character) => {
      const code = character.charCodeAt(0);
      return !(code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127);
    }).join('').trim();
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeValue(item)]));
  }
  return value;
};

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && !Buffer.isBuffer(req.body)) req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query) as Request['query'];
  req.params = sanitizeValue(req.params) as Request['params'];
  next();
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path.includes('/payments/webhook'),
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many write requests' } },
});
