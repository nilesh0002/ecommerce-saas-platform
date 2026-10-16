import assert from 'node:assert/strict';
import test from 'node:test';
import type { EventEmitter } from 'node:events';

const enabled = process.env.RUN_INTEGRATION_TESTS === 'true';

test('BullMQ queues have retry and exponential backoff default configuration', { skip: !enabled }, async () => {
  const { defaultJobOptions, emailQueue } = await import('./queues');
  assert.equal(defaultJobOptions.attempts, 3);
  assert.deepEqual(defaultJobOptions.backoff, { type: 'exponential', delay: 2000 });
  assert.equal(emailQueue.defaultJobOptions.attempts, 3);
});

test('registerWorkerFailureHandling attaches error and failed event listeners to BullMQ workers', { skip: !enabled }, async () => {
  const { EventEmitter } = await import('node:events');
  const { registerWorkerFailureHandling } = await import('./workers');
  const fakeWorker = new EventEmitter() as unknown as { name: string } & EventEmitter;
  fakeWorker.name = 'test-worker';

  registerWorkerFailureHandling(fakeWorker as never);
  assert.equal(fakeWorker.listenerCount('failed'), 1);
  assert.equal(fakeWorker.listenerCount('error'), 1);
});
