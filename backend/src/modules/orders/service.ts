import crypto from 'node:crypto';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { getRazorpay } from '../../config/razorpay';
import { calculateCheckout } from '../commerce/service';
import { AppError } from '../../utils/errors';
import { enqueueLowStockAlert, enqueueOrderConfirmation, enqueueOutOfStockPaymentNotice } from '../../jobs/queues';
import { emitOrderCreated, emitOrderStatusUpdated, emitStockUpdated } from '../../sockets';
import { createInvoicePdf } from '../../utils/invoice';
import { runWithDuplicateHandling } from '../../utils/prisma';
import { isCapturedPayment, shouldCancelPendingOrder } from './payment-state';

type CreateOrderInput = {
  addressId: string;
  paymentMethod: PaymentMethod;
  couponCode?: string | null;
};

const orderInclude = {
  items: true,
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  payment: true,
  refunds: { orderBy: { createdAt: 'desc' as const } },
  returnRequests: { orderBy: { createdAt: 'desc' as const } },
};

export async function createOrder(userId: string, input: CreateOrderInput) {
  const quote = await calculateCheckout(userId, input.addressId, input.couponCode);
  if (input.paymentMethod === PaymentMethod.COD) {
    const result = await prisma.$transaction(async (tx) => {
      const order = await createLocalOrder(tx, userId, input, quote, OrderStatus.CONFIRMED);
      await deductStock(tx, quote.items);
      await clearCartAndRecordCoupon(tx, userId, order.id, quote.coupon?.code);
      return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
    });
    await enqueueOrderConfirmation({ orderId: result.id, userId });
    await publishStockUpdates(result.items.map((item) => item.variantId));
    emitOrderCreated({ orderId: result.id, userId, status: result.status, totalPaise: result.totalPaise });
    return result;
  }

  const razorpay = getRazorpay();
  const razorpayOrder = await razorpay.orders.create({
    amount: quote.totalPaise,
    currency: quote.currency,
    receipt: `order_${Date.now()}_${userId.slice(-8)}`,
    notes: { userId, addressId: input.addressId },
  });
  const order = await prisma.$transaction(async (tx) => {
    return createLocalOrder(tx, userId, input, quote, OrderStatus.PENDING, razorpayOrder.id);
  });
  emitOrderCreated({ orderId: order.id, userId, status: order.status, totalPaise: order.totalPaise });
  return {
    order,
    razorpay: {
      keyId: env.RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amountPaise: quote.totalPaise,
      currency: quote.currency,
    },
  };
}

async function createLocalOrder(
  tx: Prisma.TransactionClient,
  userId: string,
  input: CreateOrderInput,
  quote: Awaited<ReturnType<typeof calculateCheckout>>,
  status: OrderStatus,
  razorpayOrderId?: string,
) {
  return tx.order.create({
    data: {
      userId,
      addressId: input.addressId,
      status,
      paymentMethod: input.paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
      subtotalPaise: quote.subtotalPaise,
      discountPaise: quote.discountPaise,
      taxPaise: quote.taxPaise,
      shippingPaise: quote.shippingPaise,
      totalPaise: quote.totalPaise,
      couponCode: quote.coupon?.code,
      razorpayOrderId,
      placedAt: status === OrderStatus.CONFIRMED ? new Date() : null,
      items: {
        create: quote.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.name,
          variantName: item.variantName,
          sku: item.sku,
          unitPricePaise: item.unitPricePaise,
          quantity: item.quantity,
          totalPaise: item.totalPaise,
        })),
      },
      statusHistory: { create: { to: status, createdBy: userId, note: 'Order created' } },
      ...(razorpayOrderId
        ? { payment: { create: { razorpayOrderId, amountPaise: quote.totalPaise, status: PaymentStatus.PENDING } } }
        : {}),
    },
    include: orderInclude,
  });
}

async function deductStock(
  tx: Prisma.TransactionClient,
  items: Array<{ variantId: string; quantity: number }>,
) {
  for (const item of items) {
    const updated = await tx.inventory.updateMany({
      where: { variantId: item.variantId, quantity: { gte: item.quantity } },
      data: { quantity: { decrement: item.quantity } },
    });
    if (updated.count !== 1) throw new AppError(409, 'Stock changed; please review your cart', 'INSUFFICIENT_STOCK');
  }
}

async function clearCartAndRecordCoupon(
  tx: Prisma.TransactionClient,
  userId: string,
  orderId: string,
  couponCode?: string | null,
) {
  const cart = await tx.cart.findUnique({ where: { userId } });
  if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
  if (couponCode) {
    const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
    if (coupon) {
      await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      await tx.couponUsage.create({ data: { couponId: coupon.id, userId, orderId } });
    }
  }
}

export async function listOrders(userId: string) {
  return prisma.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: orderInclude });
}

export async function getOrder(userId: string, id: string) {
  const order = await prisma.order.findFirst({ where: { id, userId }, include: orderInclude });
  if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  return order;
}

export async function verifyPayment(userId: string, id: string, input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
  const order = await getOrder(userId, id);
  if (order.paymentMethod !== PaymentMethod.RAZORPAY || order.razorpayOrderId !== input.razorpayOrderId || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError(400, 'Invalid payment verification request', 'PAYMENT_VERIFICATION_INVALID');
  }

  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.razorpaySignature))) {
    throw new AppError(400, 'Invalid payment signature', 'PAYMENT_SIGNATURE_INVALID');
  }
  await prisma.payment.update({ where: { orderId: id }, data: { razorpayPaymentId: input.razorpayPaymentId, signature: input.razorpaySignature } });
  return { verified: true, message: 'Signature verified; payment confirmation is pending webhook processing' };
}

export async function cancelOrder(userId: string, id: string) {
  const order = await getOrder(userId, id);
  const cancellableStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING];
  if (!cancellableStatuses.includes(order.status)) {
    throw new AppError(409, 'This order cannot be cancelled', 'ORDER_CANNOT_CANCEL');
  }
  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED, statusHistory: { create: { from: order.status, to: OrderStatus.CANCELLED, createdBy: userId, note: 'Cancelled by customer' } } },
      include: orderInclude,
    });
    if (order.status !== OrderStatus.PENDING || order.paymentStatus === PaymentStatus.PAID) {
      for (const item of order.items) await tx.inventory.update({ where: { variantId: item.variantId }, data: { quantity: { increment: item.quantity } } });
    }
    return updated;
  });
  await publishStockUpdates(updated.items.map((item) => item.variantId));
  emitOrderStatusUpdated(userId, { orderId: id, status: updated.status });
  return updated;
}

export async function requestReturn(userId: string, id: string, reason: string) {
  const order = await getOrder(userId, id);
  if (order.status !== OrderStatus.DELIVERED) throw new AppError(409, 'Only delivered orders can be returned', 'RETURN_NOT_ALLOWED');
  return prisma.$transaction(async (tx) => {
    const request = await tx.returnRequest.create({ data: { orderId: id, userId, reason } });
    await tx.order.update({ where: { id }, data: { status: OrderStatus.RETURN_REQUESTED, statusHistory: { create: { from: order.status, to: OrderStatus.RETURN_REQUESTED, createdBy: userId, note: 'Return requested' } } } });
    return request;
  });
}

export async function updateOrderStatus(id: string, status: OrderStatus, note: string | undefined, adminUserId: string) {
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  if (order.status === status) return order;
  const updated = await prisma.order.update({
    where: { id },
    data: { status, statusHistory: { create: { from: order.status, to: status, createdBy: adminUserId, note: note ?? 'Status updated by admin' } } },
    include: { items: true },
  });
  emitOrderStatusUpdated(order.userId, { orderId: id, status: updated.status, note });
  return updated;
}

export async function getInvoice(userId: string, id: string): Promise<Buffer> {
  const order = await prisma.order.findFirst({ where: { id, userId }, include: { items: true } });
  if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  return createInvoicePdf(order);
}

async function publishStockUpdates(variantIds: string[]): Promise<void> {
  const inventories = await prisma.inventory.findMany({ where: { variantId: { in: variantIds } } });
  for (const inventory of inventories) {
    emitStockUpdated({ variantId: inventory.variantId, quantity: inventory.quantity });
    if (inventory.quantity <= inventory.lowStockAt) await enqueueLowStockAlert({ variantId: inventory.variantId, quantity: inventory.quantity });
  }
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string): void {
  if (!env.RAZORPAY_WEBHOOK_SECRET) throw new AppError(503, 'Razorpay webhook is not configured', 'WEBHOOK_NOT_CONFIGURED');
  const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  if (expected.length !== signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    throw new AppError(400, 'Invalid webhook signature', 'WEBHOOK_SIGNATURE_INVALID');
  }
}

export async function processWebhook(eventId: string, event: string, payload: Record<string, unknown>) {
  const claimed = await runWithDuplicateHandling(() => prisma.$transaction(async (tx) => {
      const eventRecord = await tx.webhookEvent.create({
        data: { provider: 'razorpay', eventId, event, payload: payload as Prisma.InputJsonValue },
      });
      let outOfStock: { orderId: string; userId: string; totalPaise: number } | undefined;
    if (event === 'payment.captured') {
      const paymentEntity = (payload.payload as { payment?: { entity?: Record<string, unknown> } })?.payment?.entity;
      const razorpayOrderId = String(paymentEntity?.order_id ?? '');
      const paymentId = String(paymentEntity?.id ?? '');
      const order = await tx.order.findFirst({ where: { razorpayOrderId }, include: { items: true } });
      if (!order) throw new AppError(404, 'Order for payment not found', 'ORDER_NOT_FOUND');
      if (order.paymentStatus !== PaymentStatus.PAID) {
        try {
          await deductStock(tx, order.items);
          await clearCartAndRecordCoupon(tx, order.userId, order.id, order.couponCode);
          await tx.payment.update({ where: { orderId: order.id }, data: { status: PaymentStatus.PAID, razorpayPaymentId: paymentId, rawData: payload as Prisma.InputJsonValue } });
          await tx.order.update({ where: { id: order.id }, data: { paymentStatus: PaymentStatus.PAID, status: OrderStatus.CONFIRMED, placedAt: new Date(), statusHistory: { create: { from: order.status, to: OrderStatus.CONFIRMED, note: 'Payment captured by Razorpay webhook' } } } });
        } catch (error) {
          if (!(error instanceof AppError) || error.code !== 'INSUFFICIENT_STOCK') throw error;
          const refund = await getRazorpay().payments.refund(paymentId, {
            amount: order.totalPaise,
            notes: { reason: 'Order failed because stock was unavailable' },
          });
          await tx.payment.update({ where: { orderId: order.id }, data: { status: PaymentStatus.FAILED, razorpayPaymentId: paymentId, rawData: payload as Prisma.InputJsonValue } });
          await tx.refund.create({ data: { orderId: order.id, razorpayRefundId: refund.id, amountPaise: order.totalPaise, status: PaymentStatus.PENDING, reason: 'Out of stock after payment capture' } });
          await tx.order.update({ where: { id: order.id }, data: { paymentStatus: PaymentStatus.FAILED, status: OrderStatus.FAILED_OUT_OF_STOCK, statusHistory: { create: { from: order.status, to: OrderStatus.FAILED_OUT_OF_STOCK, note: 'Payment captured after stock was exhausted' } } } });
          outOfStock = { orderId: order.id, userId: order.userId, totalPaise: order.totalPaise };
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = (payload.payload as { payment?: { entity?: Record<string, unknown> } })?.payment?.entity;
      const order = await tx.order.findFirst({ where: { razorpayOrderId: String(paymentEntity?.order_id ?? '') } });
      if (order) {
        await tx.payment.update({ where: { orderId: order.id }, data: { status: PaymentStatus.FAILED, rawData: payload as Prisma.InputJsonValue } });
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: PaymentStatus.FAILED } });
      }
    } else if (event === 'refund.processed') {
      const refundEntity = (payload.payload as { refund?: { entity?: Record<string, unknown> } })?.refund?.entity;
      const refundId = String(refundEntity?.id ?? '');
      const refund = await tx.refund.findUnique({ where: { razorpayRefundId: refundId } });
      if (refund) {
        await tx.refund.update({ where: { id: refund.id }, data: { status: PaymentStatus.REFUNDED } });
        await tx.order.update({ where: { id: refund.orderId }, data: { paymentStatus: PaymentStatus.REFUNDED } });
      }
    }
      await tx.webhookEvent.update({ where: { id: eventRecord.id }, data: { processedAt: new Date() } });
      return { outOfStock };
    }));
  if (claimed.duplicate) return { duplicate: true };
  const result = claimed.result;
  if (!result) throw new AppError(500, 'Webhook processing did not return a result', 'WEBHOOK_PROCESSING_FAILED');
    if (result.outOfStock) {
      const order = await prisma.order.findUnique({ where: { id: result.outOfStock.orderId }, include: { items: true, user: true } });
      if (order) {
        await enqueueOutOfStockPaymentNotice({ orderId: order.id, userId: order.userId });
        await publishStockUpdates(order.items.map((item) => item.variantId));
        emitOrderStatusUpdated(order.userId, { orderId: order.id, status: order.status });
      }
      return { duplicate: false, outOfStock: true };
    }
  if (event === 'payment.captured') {
    const paymentEntity = (payload.payload as { payment?: { entity?: Record<string, unknown> } })?.payment?.entity;
    const razorpayOrderId = String(paymentEntity?.order_id ?? '');
    const order = await prisma.order.findFirst({ where: { razorpayOrderId }, include: { items: true } });
    if (order) {
      await enqueueOrderConfirmation({ orderId: order.id, userId: order.userId });
      await publishStockUpdates(order.items.map((item) => item.variantId));
      emitOrderStatusUpdated(order.userId, { orderId: order.id, status: order.status });
    }
  }
  return { duplicate: false };
}

export async function processPendingOrderCleanup(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: { status: OrderStatus.PENDING, paymentMethod: PaymentMethod.RAZORPAY, createdAt: { lt: cutoff } },
    select: { id: true, razorpayOrderId: true },
  });
  let processed = 0;
  for (const order of orders) {
    if (!order.razorpayOrderId) continue;
    const razorpay = getRazorpay();
    const remoteOrder = await razorpay.orders.fetch(order.razorpayOrderId);
    const payments = await razorpay.orders.fetchPayments(order.razorpayOrderId);
    const captured = payments.items?.find((payment: { status?: string }) => payment.status === 'captured');
    if (isCapturedPayment(remoteOrder.status, captured ? [captured] : [])) {
      await processWebhook(`cleanup:capture:${order.id}:${captured?.id ?? order.razorpayOrderId}`, 'payment.captured', {
        event: 'payment.captured',
        payload: { payment: { entity: { order_id: order.razorpayOrderId, id: captured?.id ?? '' } } },
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const current = await tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
        if (!current || !shouldCancelPendingOrder(current.status)) return;
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus: PaymentStatus.FAILED,
            statusHistory: { create: { from: OrderStatus.PENDING, to: OrderStatus.CANCELLED, note: 'Unpaid Razorpay order expired' } },
          },
        });
        for (const item of current.items) {
          await tx.inventory.updateMany({ where: { variantId: item.variantId, reserved: { gte: item.quantity } }, data: { reserved: { decrement: item.quantity } } });
        }
      });
    }
    processed += 1;
  }
  return processed;
}

export async function refundOrder(orderId: string, amountPaise: number | undefined, reason: string | undefined) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!order || !order.payment) throw new AppError(404, 'Paid Razorpay order not found', 'REFUND_ORDER_NOT_FOUND');
  if (order.payment.status !== PaymentStatus.PAID || !order.payment.razorpayPaymentId) throw new AppError(409, 'Order is not eligible for refund', 'REFUND_NOT_ALLOWED');
  const amount = amountPaise ?? order.totalPaise;
  if (amount <= 0 || amount > order.totalPaise) throw new AppError(400, 'Invalid refund amount', 'REFUND_AMOUNT_INVALID');
  const refund = await getRazorpay().payments.refund(order.payment.razorpayPaymentId, { amount, notes: { reason: reason ?? 'Admin refund' } });
  return prisma.refund.create({ data: { orderId, razorpayRefundId: refund.id, amountPaise: amount, status: PaymentStatus.PENDING, reason } });
}
