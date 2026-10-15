import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus } from '@prisma/client';
import { isCapturedPayment, shouldCancelPendingOrder } from './payment-state';

test('treats a paid Razorpay order or captured payment as paid', () => {
  assert.equal(isCapturedPayment('paid', []), true);
  assert.equal(isCapturedPayment('created', [{ status: 'captured' }]), true);
  assert.equal(isCapturedPayment('created', [{ status: 'authorized' }]), false);
});

test('only pending orders are eligible for expiry cancellation', () => {
  assert.equal(shouldCancelPendingOrder(OrderStatus.PENDING), true);
  assert.equal(shouldCancelPendingOrder(OrderStatus.CONFIRMED), false);
  assert.equal(shouldCancelPendingOrder(OrderStatus.CANCELLED), false);
});
