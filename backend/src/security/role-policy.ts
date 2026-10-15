import { Role } from '@prisma/client';

export interface AuthIdentity {
  id: string;
  email: string;
  role: Role;
}

export function toAuthUser(user: AuthIdentity): AuthIdentity {
  return { id: user.id, email: user.email, role: user.role };
}

export function canJoinAdminRoom(role: Role, isActive: boolean): boolean {
  return isActive && (role === Role.SUPER_ADMIN || role === Role.MANAGER || role === Role.SUPPORT);
}
