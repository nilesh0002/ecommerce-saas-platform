import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from './app';
import { redis } from './config/redis';
import { prisma } from './config/prisma';

describe('Express application configuration in app.ts', () => {
  after(async () => {
    await redis.quit();
    await prisma.$disconnect();
  });

  it('has trust proxy enabled for reverse proxies', () => {
    assert.strictEqual(app.get('trust proxy'), 1);
  });
});
