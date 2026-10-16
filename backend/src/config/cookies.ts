import { CookieOptions } from 'express';
import { URL } from 'node:url';
import { env } from './env';

/**
 * Returns cookie options configured for authentication tokens.
 * Automatically enables cross-site use (`SameSite=None; Secure`)
 * whenever FRONTEND_URL is on a different domain or in production.
 */
export function getAuthCookieOptions(): CookieOptions {
  const isProd = env.NODE_ENV === 'production';

  let isDifferentDomain = false;
  try {
    const frontendUrl = new URL(env.FRONTEND_URL);
    // When frontend is not local, or in production, treat as cross-site
    isDifferentDomain = isProd || (frontendUrl.hostname !== 'localhost' && frontendUrl.hostname !== '127.0.0.1');
  } catch {
    isDifferentDomain = isProd;
  }

  // Cross-site cookies (e.g. Vercel frontend calling Render backend)
  // require SameSite=None AND Secure=true
  const sameSite: 'none' | 'lax' | 'strict' = env.COOKIE_SAME_SITE ?? (isDifferentDomain ? 'none' : 'lax');
  const secure = env.COOKIE_SECURE !== undefined ? env.COOKIE_SECURE : (isProd || sameSite === 'none');

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    domain: env.COOKIE_DOMAIN || undefined,
  };
}
