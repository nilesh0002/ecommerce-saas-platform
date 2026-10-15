import { Queue } from 'bullmq';
import { env } from '../config/env';

const connection = { url: env.REDIS_URL };

export const emailQueue = new Queue('email', { connection });
export const notificationQueue = new Queue('notification', { connection });
export const lowStockQueue = new Queue('low-stock', { connection });
export const abandonedCartQueue = new Queue('abandoned-cart', { connection });

export async function enqueueOrderConfirmation(input: { orderId: string; userId: string }) {
  await emailQueue.add('order-confirmation', input, { jobId: `order-confirmation:${input.orderId}`, removeOnComplete: 100, removeOnFail: 500 });
}

export async function enqueueLowStockAlert(input: { variantId: string; quantity: number }) {
  await lowStockQueue.add('low-stock-alert', input, { jobId: `low-stock:${input.variantId}`, removeOnComplete: 100, removeOnFail: 500 });
}

export async function scheduleAbandonedCartReminder(input: { userId: string; cartId: string }) {
  await abandonedCartQueue.add('abandoned-cart-reminder', input, {
    delay: 24 * 60 * 60 * 1000,
    jobId: `abandoned-cart:${input.cartId}`,
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}
