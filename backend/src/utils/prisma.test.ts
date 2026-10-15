import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import { runWithDuplicateHandling } from './prisma';

test('concurrent duplicate webhook claims process stock once', async () => {
  let claimed = false;
  let stockDeducted = 0;
  const claim = async () => {
    if (claimed) {
      throw new Prisma.PrismaClientKnownRequestError('duplicate webhook', { code: 'P2002', clientVersion: 'test' });
    }
    claimed = true;
    stockDeducted += 1;
  };
  const results = await Promise.all([
    runWithDuplicateHandling(claim),
    runWithDuplicateHandling(claim),
  ]);
  assert.equal(stockDeducted, 1);
  assert.equal(results.filter((result) => result.duplicate).length, 1);
});
