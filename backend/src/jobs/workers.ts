import { Job, Worker } from 'bullmq';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { sendOrderConfirmationEmail, sendLowStockAlertEmail, sendAbandonedCartEmail, sendOutOfStockPaymentEmail } from '../utils/mailer';
import { processPendingOrderCleanup } from '../modules/orders/service';
import { processOutOfStockRefund } from '../modules/orders/service';

const connection = { url: env.REDIS_URL };

async function processEmail(job: Job<{ orderId: string; userId: string }>) {
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

async function processLowStock(job: Job<{ variantId: string; quantity: number }>) {
  const variant = await prisma.productVariant.findUnique({ where: { id: job.data.variantId }, include: { product: true } });
  if (!variant) return;
  const admins = await prisma.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'MANAGER'] }, isActive: true }, select: { email: true } });
  await Promise.all(admins.map((admin) => sendLowStockAlertEmail(admin.email, variant.product.name, variant.sku, job.data.quantity)));
}

async function processAbandonedCart(job: Job<{ userId: string; cartId: string }>) {
  const cart = await prisma.cart.findUnique({ where: { id: job.data.cartId }, include: { user: true, items: true } });
  if (!cart || cart.items.length === 0) return;
  if (cart.updatedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) return;
  await sendAbandonedCartEmail(cart.user.email, cart.items.length);
}

async function processPendingOrders(): Promise<void> {
  await processPendingOrderCleanup();
}

async function processRefund(job: Job<{ refundId: string }>): Promise<void> {
  await processOutOfStockRefund(job.data.refundId);
}

export const workers = [
  new Worker('email', processEmail, { connection }),
  new Worker('low-stock', processLowStock, { connection }),
  new Worker('abandoned-cart', processAbandonedCart, { connection }),
  new Worker('pending-order-cleanup', processPendingOrders, { connection }),
  new Worker('refund', processRefund, { connection }),
];
