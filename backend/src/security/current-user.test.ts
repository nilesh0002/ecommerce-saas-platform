import assert from 'node:assert/strict';
import test from 'node:test';
import { Role } from '@prisma/client';
import { canJoinAdminRoom } from './role-policy';
import { toAuthUser } from './role-policy';

test('authorization identity uses the database role and state', () => {
  const user = { id: 'user-1', email: 'staff@example.com', role: Role.MANAGER, isActive: true };
  assert.deepEqual(toAuthUser(user), { id: 'user-1', email: 'staff@example.com', role: Role.MANAGER });
});

test('only active staff roles can join the admin socket room', () => {
  assert.equal(canJoinAdminRoom(Role.SUPER_ADMIN, true), true);
  assert.equal(canJoinAdminRoom(Role.MANAGER, true), true);
  assert.equal(canJoinAdminRoom(Role.SUPPORT, true), true);
  assert.equal(canJoinAdminRoom(Role.CUSTOMER, true), false);
  assert.equal(canJoinAdminRoom(Role.MANAGER, false), false);
});
