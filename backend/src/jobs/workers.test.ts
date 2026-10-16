import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { EventEmitter } from 'node:events';
import { defaultJobOptions, closeAllQueues } from './queues';
import { registerWorkerFailureHandling } from './workers';

after(async () => {
  await closeAllQueues();
  process.exit(0);
});

test('BullMQ queues have retry and exponential backoff default configuration', () => {
  assert.equal(defaultJobOptions.attempts, 3);
  assert.deepEqual(defaultJobOptions.backoff, { type: 'exponential', delay: 2000 });
});

test('registerWorkerFailureHandling attaches error and failed event listeners to BullMQ workers', () => {
  const fakeWorker = new EventEmitter() as unknown as { name: string } & EventEmitter;
  fakeWorker.name = 'test-worker';

  registerWorkerFailureHandling(fakeWorker as never);
  assert.equal(fakeWorker.listenerCount('failed'), 1);
  assert.equal(fakeWorker.listenerCount('error'), 1);
});
