import { Queue } from 'bullmq';
import { env } from '../config/env';

const connection = { url: env.REDIS_URL };

export const emailQueue = new Queue('email', { connection });
export const notificationQueue = new Queue('notification', { connection });
export const lowStockQueue = new Queue('low-stock', { connection });
export const abandonedCartQueue = new Queue('abandoned-cart', { connection });
export const pendingOrderCleanupQueue = new Queue('pending-order-cleanup', { connection });
export const refundQueue = new Queue('refund', { connection });

export async function enqueueOrderConfirmation(input: { orderId: string; userId: string }) {
  await emailQueue.add('order-confirmation', input, { jobId: `order-confirmation-${input.orderId}`, removeOnComplete: 100, removeOnFail: 500 });
}

export async function enqueueOutOfStockPaymentNotice(input: { orderId: string; userId: string }) {
  await emailQueue.add('out-of-stock-payment', input, { jobId: `out-of-stock-payment-${input.orderId}`, removeOnComplete: 100, removeOnFail: 500 });
}

export async function enqueueOutOfStockRefund(input: { refundId: string }) {
  await refundQueue.add('out-of-stock-refund', input, {
    jobId: `out-of-stock-refund-${input.refundId}`,
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}

export async function enqueueLowStockAlert(input: { variantId: string; quantity: number }) {
  await lowStockQueue.add('low-stock-alert', input, { jobId: `low-stock-${input.variantId}`, removeOnComplete: 100, removeOnFail: 500 });
}

export async function scheduleAbandonedCartReminder(input: { userId: string; cartId: string }) {
  await abandonedCartQueue.add('abandoned-cart-reminder', input, {
    delay: 24 * 60 * 60 * 1000,
    jobId: `abandoned-cart-${input.cartId}`,
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}

export async function schedulePendingOrderCleanup(): Promise<void> {
  await pendingOrderCleanupQueue.add('cleanup-pending-orders', {}, {
    repeat: { every: 5 * 60 * 1000 },
    jobId: 'pending-order-cleanup',
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}
