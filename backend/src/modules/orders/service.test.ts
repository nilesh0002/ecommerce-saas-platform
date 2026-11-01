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

test('verifyPayment returns 400 PAYMENT_SIGNATURE_INVALID for malformed and invalid signatures', async () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { verifyPayment } = await import('./service');
  const { prisma } = await import('../../config/prisma');
  const { AppError } = await import('../../utils/errors');
  const crypto = await import('node:crypto');
  const { env } = await import('../../config/env');

  const mockOrder = {
    id: 'order-test-1',
    userId: 'user-test-1',
    paymentMethod: 'RAZORPAY',
    razorpayOrderId: 'order_rzp_123',
    items: [],
  };

  const origFindFirst = prisma.order.findFirst;
  const origPaymentUpdate = prisma.payment.update;

  try {
    (prisma.order as any).findFirst = async () => mockOrder;
    (prisma.payment as any).update = async () => ({ id: 'pay-1' });

    // 1. Short signature (e.g. 10 chars instead of 64 hex chars)
    await assert.rejects(
      async () => {
        await verifyPayment('user-test-1', 'order-test-1', {
          razorpayOrderId: 'order_rzp_123',
          razorpayPaymentId: 'pay_rzp_456',
          razorpaySignature: 'short',
        });
      },
      (err: any) => {
        assert(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'PAYMENT_SIGNATURE_INVALID');
        return true;
      },
    );

    // 2. Long signature (e.g. 100 chars instead of 64 hex chars)
    await assert.rejects(
      async () => {
        await verifyPayment('user-test-1', 'order-test-1', {
          razorpayOrderId: 'order_rzp_123',
          razorpayPaymentId: 'pay_rzp_456',
          razorpaySignature: 'a'.repeat(100),
        });
      },
      (err: any) => {
        assert(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'PAYMENT_SIGNATURE_INVALID');
        return true;
      },
    );

    // 3. Same length (64 chars) but wrong signature
    await assert.rejects(
      async () => {
        await verifyPayment('user-test-1', 'order-test-1', {
          razorpayOrderId: 'order_rzp_123',
          razorpayPaymentId: 'pay_rzp_456',
          razorpaySignature: '0'.repeat(64),
        });
      },
      (err: any) => {
        assert(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'PAYMENT_SIGNATURE_INVALID');
        return true;
      },
    );

    // 4. Valid signature
    const validSig = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update('order_rzp_123|pay_rzp_456')
      .digest('hex');

    const result = await verifyPayment('user-test-1', 'order-test-1', {
      razorpayOrderId: 'order_rzp_123',
      razorpayPaymentId: 'pay_rzp_456',
      razorpaySignature: validSig,
    });
    assert.equal(result.verified, true);
  } finally {
    prisma.order.findFirst = origFindFirst;
    prisma.payment.update = origPaymentUpdate;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
});

test('createOrder rolls back with COUPON_LIMIT_REACHED when atomic coupon usage slot cannot be claimed', async () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { createOrder } = await import('./service');
  const { prisma } = await import('../../config/prisma');
  const { AppError } = await import('../../utils/errors');
  const commerceService = await import('../commerce/service');

  const origAddressFindFirst = prisma.address.findFirst;
  const origCartUpsert = prisma.cart.upsert;
  const origCouponFindUnique = prisma.coupon.findUnique;
  const origCouponUsageFindUnique = prisma.couponUsage.findUnique;
  const origTransaction = prisma.$transaction;

  try {
    const mockAddress = { id: 'addr-1', userId: 'user-1' };
    const mockCart = {
      id: 'cart-1',
      userId: 'user-1',
      items: [
        {
          id: 'ci-1',
          variantId: 'v1',
          quantity: 1,
          variant: {
            id: 'v1',
            productId: 'p1',
            isActive: true,
            name: 'Default',
            sku: 'SKU-1',
            pricePaise: 50000,
            product: { id: 'p1', name: 'Product', isActive: true },
            inventory: { quantity: 10, reserved: 0 },
          },
        },
      ],
    };
    const mockCoupon = {
      id: 'coup-1',
      code: 'SAVE20',
      type: 'PERCENTAGE',
      value: 20,
      minimumPaise: 0,
      maximumDiscountPaise: null,
      usageLimit: 1,
      usedCount: 0, // 0 at pre-validation
      startsAt: new Date(Date.now() - 10000),
      expiresAt: new Date(Date.now() + 100000),
      isActive: true,
    };

    (prisma.address as any).findFirst = async () => mockAddress;
    (prisma.cart as any).upsert = async () => mockCart;
    (prisma.coupon as any).findUnique = async () => mockCoupon;
    (prisma.couponUsage as any).findUnique = async () => null;

    // Transaction executes: concurrent checkout has already claimed the slot!
    (prisma as any).$transaction = async (callback: any) => {
      const mockTx = {
        order: {
          create: async () => ({ id: 'order-1', items: [{ variantId: 'v1', quantity: 1 }] }),
          findUniqueOrThrow: async () => ({ id: 'order-1', items: [] }),
        },
        inventory: {
          updateMany: async () => ({ count: 1 }),
        },
        cart: {
          findUnique: async () => ({ id: 'cart-1' }),
        },
        cartItem: {
          deleteMany: async () => ({ count: 1 }),
        },
        coupon: {
          findUnique: async () => ({ ...mockCoupon, usedCount: 1 }),
          updateMany: async () => ({ count: 0 }), // 0 updated because slot was already claimed!
        },
        couponUsage: {
          findUnique: async () => null,
          create: async () => ({ id: 'usage-1' }),
        },
      };
      return callback(mockTx);
    };

    let capturedError: any = null;
    try {
      await createOrder('user-1', { addressId: 'addr-1', paymentMethod: 'COD', couponCode: 'SAVE20' });
    } catch (e) {
      capturedError = e;
    }
    assert(capturedError instanceof AppError);
    assert.equal(capturedError.statusCode, 400);
    assert.equal(capturedError.code, 'COUPON_LIMIT_REACHED');
  } finally {
    prisma.address.findFirst = origAddressFindFirst;
    prisma.cart.upsert = origCartUpsert;
    prisma.coupon.findUnique = origCouponFindUnique;
    prisma.couponUsage.findUnique = origCouponUsageFindUnique;
    prisma.$transaction = origTransaction;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
});

test.after(async () => {
  const { closeAllQueues } = await import('../../jobs/queues');
  const { redis } = await import('../../config/redis');
  const { prisma } = await import('../../config/prisma');
  await closeAllQueues();
  await redis.quit();
  await prisma.$disconnect();
});

