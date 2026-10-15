import { createHash, randomBytes } from 'node:crypto';

export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('hex');
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
export const generateOtp = (): string => String(Math.floor(100000 + Math.random() * 900000));
