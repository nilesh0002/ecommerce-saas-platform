import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
export { canJoinAdminRoom } from './role-policy';

const CACHE_TTL_SECONDS = 60;
const cacheKey = (userId: string) => `auth:user:${userId}`;

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export async function getCurrentUser(userId: string): Promise<CurrentUser | null> {
  const cached = await redis.get(cacheKey(userId));
  if (cached) return JSON.parse(cached) as CurrentUser;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!user) return null;
  await redis.set(cacheKey(userId), JSON.stringify(user), 'EX', CACHE_TTL_SECONDS);
  return user;
}

export async function invalidateCurrentUser(userId: string): Promise<void> {
  await redis.del(cacheKey(userId));
}

export { CACHE_TTL_SECONDS };
