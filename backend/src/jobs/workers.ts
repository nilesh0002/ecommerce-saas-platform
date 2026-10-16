import { Job, Worker } from 'bullmq';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { sendOrderConfirmationEmail, sendLowStockAlertEmail, sendAbandonedCartEmail, sendOutOfStockPaymentEmail } from '../utils/mailer';
import { processPendingOrderCleanup } from '../modules/orders/service';
import { processOutOfStockRefund } from '../modules/orders/service';
import { logger } from '../config/logger';
import { Sentry } from '../config/sentry';

const connection = { url: env.REDIS_URL };

export async function processEmail(job: Job<{ orderId: string; userId: string }>) {
  const order = await prisma.order.findUnique({
    where: { id: job.data.orderId },
    include: { user: true, items: true },
  });
  if (!order) return;
  if (job.name === 'out-of-stock-payment') {
    await sendOutOfStockPaymentEmail(order.user.email, order.id, order.totalPaise);
    return;
  }
  await sendOrderConfirmationEmail(order.user.email, order);
}

export async function processLowStock(job: Job<{ variantId: string; quantity: number }>) {
  const variant = await prisma.productVariant.findUnique({ where: { id: job.data.variantId }, include: { product: true } });
  if (!variant) return;
  const admins = await prisma.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'MANAGER'] }, isActive: true }, select: { email: true } });
  await Promise.all(admins.map((admin) => sendLowStockAlertEmail(admin.email, variant.product.name, variant.sku, job.data.quantity)));
}

export async function processAbandonedCart(job: Job<{ userId: string; cartId: string }>) {
  const cart = await prisma.cart.findUnique({ where: { id: job.data.cartId }, include: { user: true, items: true } });
  if (!cart || cart.items.length === 0) return;
  if (cart.updatedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) return;
  await sendAbandonedCartEmail(cart.user.email, cart.items.length);
}

export async function processPendingOrders(): Promise<void> {
  await processPendingOrderCleanup();
}

export async function processRefund(job: Job<{ refundId: string }>): Promise<void> {
  await processOutOfStockRefund(job.data.refundId);
}

export function registerWorkerFailureHandling(worker: Worker): Worker {
  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`BullMQ job failed on worker ${worker.name}`, {
      worker: worker.name,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    if (env.SENTRY_DSN) {
      Sentry.captureException(err, {
        tags: { worker: worker.name, jobName: job?.name },
        extra: { jobId: job?.id, attemptsMade: job?.attemptsMade },
      });
    }
  });

  worker.on('error', (err: Error) => {
    logger.error(`BullMQ worker ${worker.name} encountered an error`, {
      worker: worker.name,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
  });

  return worker;
}

export function createWorkers(): Worker[] {
  return [
    registerWorkerFailureHandling(new Worker('email', processEmail, { connection })),
    registerWorkerFailureHandling(new Worker('low-stock', processLowStock, { connection })),
    registerWorkerFailureHandling(new Worker('abandoned-cart', processAbandonedCart, { connection })),
    registerWorkerFailureHandling(new Worker('pending-order-cleanup', processPendingOrders, { connection })),
    registerWorkerFailureHandling(new Worker('refund', processRefund, { connection })),
  ];
}

export const workers: Worker[] = process.env.NODE_ENV === 'test' ? [] : createWorkers();


