import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(30).optional(),
});
export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(72),
});
export const otpSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  otp: z.string().regex(/^\d{6}$/),
});
export const forgotPasswordSchema = z.object({ email: z.string().email().transform((value) => value.toLowerCase()) });
export const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8).max(72),
});
