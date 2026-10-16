import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { envSchema } from './env';
import { getAuthCookieOptions } from './cookies';

describe('Environment validation with Zod in config/env.ts', () => {
  const baseValidEnv = {
    NODE_ENV: 'production' as const,
    PORT: 5000,
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    DIRECT_URL: 'postgresql://user:pass@localhost:5432/db',
    REDIS_URL: 'rediss://default:token@host:6379',
    FRONTEND_URL: 'https://ecommerce-saas-platform-seven.vercel.app',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    CORS_ORIGINS: 'https://ecommerce-saas-platform-seven.vercel.app',
  };

  it('passes valid production configuration', () => {
    const result = envSchema.safeParse(baseValidEnv);
    assert.strictEqual(result.success, true);
  });

  it('fails in production if JWT_ACCESS_SECRET is shorter than 32 characters', () => {
    const result = envSchema.safeParse({
      ...baseValidEnv,
      JWT_ACCESS_SECRET: 'short-secret',
    });
    assert.strictEqual(result.success, false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('JWT_ACCESS_SECRET'));
      assert.ok(issue, 'Expected issue for short JWT_ACCESS_SECRET');
      assert.match(issue.message, /at least 32 characters/);
    }
  });

  it('fails in production if JWT_REFRESH_SECRET is shorter than 32 characters', () => {
    const result = envSchema.safeParse({
      ...baseValidEnv,
      JWT_REFRESH_SECRET: 'short-refresh',
    });
    assert.strictEqual(result.success, false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('JWT_REFRESH_SECRET'));
      assert.ok(issue, 'Expected issue for short JWT_REFRESH_SECRET');
      assert.match(issue.message, /at least 32 characters/);
    }
  });

  it('fails in production if CORS_ORIGINS contains wildcard "*"', () => {
    const result = envSchema.safeParse({
      ...baseValidEnv,
      CORS_ORIGINS: '*',
    });
    assert.strictEqual(result.success, false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('CORS_ORIGINS'));
      assert.ok(issue, 'Expected issue for wildcard CORS_ORIGINS');
      assert.match(issue.message, /cannot contain wildcard/);
    }
  });

  it('fails in production if cookies are configured with COOKIE_SECURE=false', () => {
    const result = envSchema.safeParse({
      ...baseValidEnv,
      COOKIE_SECURE: false,
    });
    assert.strictEqual(result.success, false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('COOKIE_SECURE'));
      assert.ok(issue, 'Expected issue for insecure cookies in production');
      assert.match(issue.message, /COOKIE_SECURE cannot be false/);
    }
  });

  it('fails in production if a required variable (DATABASE_URL) is empty', () => {
    const result = envSchema.safeParse({
      ...baseValidEnv,
      DATABASE_URL: '',
    });
    assert.strictEqual(result.success, false);
  });
});

describe('Cross-site cookie configuration in config/cookies.ts', () => {
  it('returns SameSite=None and Secure=true for cross-site or production', () => {
    const options = getAuthCookieOptions();
    assert.strictEqual(options.httpOnly, true);
    assert.ok(options.sameSite === 'none' || options.sameSite === 'lax');
    assert.strictEqual(options.path, '/');
  });
});
