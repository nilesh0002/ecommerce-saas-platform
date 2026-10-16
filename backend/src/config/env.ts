import 'dotenv/config';
import { z } from 'zod';

// Ensure DIRECT_URL defaults to DATABASE_URL if not explicitly set
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required').default('redis://localhost:6379'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL').default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.coerce.boolean().optional(),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().default(10),
  PASSWORD_RESET_EXPIRY_MINUTES: z.coerce.number().int().positive().default(30),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  TAX_RATE: z.coerce.number().min(0).max(1).default(0.18),
  SHIPPING_FLAT_RATE_PAISE: z.coerce.number().int().nonnegative().default(9900),
  FREE_SHIPPING_THRESHOLD_PAISE: z.coerce.number().int().nonnegative().default(1000000),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  SENTRY_DSN: z.union([z.string().url(), z.literal('')]).optional(),
  CORS_ORIGINS: z.string().min(1, 'CORS_ORIGINS is required').default('http://localhost:3000'),
}).superRefine((data, ctx) => {
  const isProduction = data.NODE_ENV === 'production';

  if (isProduction) {
    // 1. Check required variables in production
    const requiredVars: Array<{ key: keyof typeof data; val: unknown }> = [
      { key: 'DATABASE_URL', val: data.DATABASE_URL },
      { key: 'REDIS_URL', val: data.REDIS_URL },
      { key: 'FRONTEND_URL', val: data.FRONTEND_URL },
      { key: 'JWT_ACCESS_SECRET', val: data.JWT_ACCESS_SECRET },
      { key: 'JWT_REFRESH_SECRET', val: data.JWT_REFRESH_SECRET },
      { key: 'CORS_ORIGINS', val: data.CORS_ORIGINS },
    ];

    for (const item of requiredVars) {
      if (!item.val || (typeof item.val === 'string' && item.val.trim() === '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [item.key],
          message: `${String(item.key)} is required in production`,
        });
      }
    }

    // 2. Fail if JWT secrets are shorter than 32 characters
    if (data.JWT_ACCESS_SECRET && data.JWT_ACCESS_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message: 'JWT_ACCESS_SECRET must be at least 32 characters in production',
      });
    }

    if (data.JWT_REFRESH_SECRET && data.JWT_REFRESH_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must be at least 32 characters in production',
      });
    }

    // 3. Fail if CORS_ORIGINS contains "*"
    const originList = data.CORS_ORIGINS.split(',').map((origin) => origin.trim());
    if (data.CORS_ORIGINS.includes('*') || originList.includes('*')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGINS'],
        message: 'CORS_ORIGINS cannot contain wildcard "*" in production',
      });
    }

    // 4. Fail if cookies are not configured as Secure
    if (data.COOKIE_SECURE === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECURE'],
        message: 'Cookies must be configured as Secure in production (COOKIE_SECURE cannot be false)',
      });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

function parseEnvironment(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formattedErrors = result.error.issues.map(
      (issue) => `  ❌ [${issue.path.join('.') || 'CONFIG'}]: ${issue.message}`
    ).join('\n');

    console.error('\n========================================================');
    console.error('🚫 FATAL: Environment validation failed on startup:');
    console.error('========================================================');
    console.error(formattedErrors);
    console.error('========================================================\n');

    if (process.env.NODE_ENV === 'test') {
      throw new Error(`Environment validation failed:\n${formattedErrors}`);
    }

    process.exit(1);
  }
  return result.data;
}

export const env = parseEnvironment();
