import assert from 'node:assert/strict';
import test from 'node:test';

const enabled = process.env.RUN_INTEGRATION_TESTS === 'true';

test.after(async () => {
  if (!enabled) return;
  const { prisma } = await import('../../config/prisma');
  const { redis } = await import('../../config/redis');
  const { emailQueue, refundQueue, lowStockQueue, abandonedCartQueue, pendingOrderCleanupQueue, notificationQueue } = await import('../../jobs/queues');
  await Promise.all([
    emailQueue.close(),
    refundQueue.close(),
    lowStockQueue.close(),
    abandonedCartQueue.close(),
    pendingOrderCleanupQueue.close(),
    notificationQueue.close(),
    prisma.$disconnect(),
  ]);
  await redis.quit();
});

test('concurrent captured webhooks deduct stock once and claim one event', { skip: !enabled }, async () => {
  const { prisma } = await import('../../config/prisma');
  const { processWebhook } = await import('./service');
  const suffix = Date.now().toString();
  const user = await prisma.user.create({
    data: { email: `integration-${suffix}@example.com`, firstName: 'Integration', lastName: 'Test' },
  });
  const category = await prisma.category.create({ data: { name: `Integration ${suffix}`, slug: `integration-${suffix}` } });
  const product = await prisma.product.create({ data: { name: `Product ${suffix}`, slug: `product-${suffix}`, categoryId: category.id } });
  const variant = await prisma.productVariant.create({ data: { productId: product.id, sku: `SKU-${suffix}`, name: 'Default', pricePaise: 1000 } });
  await prisma.inventory.create({ data: { variantId: variant.id, quantity: 1 } });
  const order = await prisma.order.create({
    data: {
      userId: user.id, paymentMethod: 'RAZORPAY', razorpayOrderId: `order_${suffix}`,
      subtotalPaise: 1000, totalPaise: 1000,
      items: { create: { productId: product.id, variantId: variant.id, productName: product.name, variantName: 'Default', sku: variant.sku, unitPricePaise: 1000, quantity: 1, totalPaise: 1000 } },
      payment: { create: { razorpayOrderId: `order_${suffix}`, amountPaise: 1000 } },
    },
  });
  const payload = { payload: { payment: { entity: { order_id: order.razorpayOrderId, id: `pay_${suffix}` } } } };
  await Promise.all([
    processWebhook(`event_${suffix}`, 'payment.captured', payload),
    processWebhook(`event_${suffix}`, 'payment.captured', payload),
  ]);
  assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } })).quantity, 0);
  assert.equal(await prisma.webhookEvent.count({ where: { eventId: `event_${suffix}` } }), 1);
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.category.delete({ where: { id: category.id } });
  await prisma.user.delete({ where: { id: user.id } });
});

test('out-of-stock capture creates one refund intent and queues notification jobs', { skip: !enabled }, async () => {
  const { prisma } = await import('../../config/prisma');
  const { processWebhook, processOutOfStockRefund } = await import('./service');
  const { emailQueue, refundQueue } = await import('../../jobs/queues');
  const { setRazorpayForTests } = await import('../../config/razorpay');
  const suffix = `${Date.now()}-out`;
  const user = await prisma.user.create({ data: { email: `out-${suffix}@example.com`, firstName: 'Out', lastName: 'Stock' } });
  const category = await prisma.category.create({ data: { name: `Out ${suffix}`, slug: `out-${suffix}` } });
  const product = await prisma.product.create({ data: { name: `Out Product ${suffix}`, slug: `out-product-${suffix}`, categoryId: category.id } });
  const variant = await prisma.productVariant.create({ data: { productId: product.id, sku: `OUT-${suffix}`, name: 'Default', pricePaise: 1000 } });
  await prisma.inventory.create({ data: { variantId: variant.id, quantity: 0 } });
  const order = await prisma.order.create({
    data: {
      userId: user.id, paymentMethod: 'RAZORPAY', razorpayOrderId: `out_order_${suffix}`,
      subtotalPaise: 1000, totalPaise: 1000,
      items: { create: { productId: product.id, variantId: variant.id, productName: product.name, variantName: 'Default', sku: variant.sku, unitPricePaise: 1000, quantity: 1, totalPaise: 1000 } },
      payment: { create: { razorpayOrderId: `out_order_${suffix}`, razorpayPaymentId: `out_pay_${suffix}`, amountPaise: 1000 } },
    },
  });
  const refundCalls: string[] = [];
  let failFirstRefund = true;
  setRazorpayForTests({
    payments: {
      fetchMultipleRefund: async () => ({ items: [] }),
      refund: async (paymentId: string) => {
        refundCalls.push(paymentId);
        if (failFirstRefund) {
          failFirstRefund = false;
          throw new Error('temporary Razorpay outage');
        }
        return { id: `rfnd_${suffix}`, status: 'pending', receipt: `refund_${order.id}` };
      },
    },
  } as never);
  await refundQueue.pause();
  try {
    await processWebhook(`out_event_${suffix}`, 'payment.captured', { payload: { payment: { entity: { order_id: order.razorpayOrderId, id: `out_pay_${suffix}` } } } });
    const failed = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { refunds: true } });
    assert.equal(failed.status, 'FAILED_OUT_OF_STOCK');
    assert.equal(failed.refunds.length, 1);
    const refundRecord = failed.refunds[0];
    assert.ok(refundRecord);
    assert.equal(refundRecord.status, 'PENDING');
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } })).quantity, 0);
    assert.ok(await emailQueue.getJob(`out-of-stock-payment-${order.id}`));
    const refundJob = await refundQueue.getJob(`out-of-stock-refund-${refundRecord.id}`);
    assert.ok(refundJob);
    assert.equal(refundJob.opts.attempts, 5);
    assert.deepEqual(refundJob.opts.backoff, { type: 'exponential', delay: 5000 });
    await assert.rejects(() => processOutOfStockRefund(refundRecord.id), /temporary Razorpay outage/);
    assert.equal((await prisma.refund.findUniqueOrThrow({ where: { id: refundRecord.id } })).status, 'PENDING');
    await processOutOfStockRefund(refundRecord.id);
    await processOutOfStockRefund(refundRecord.id);
    assert.equal(refundCalls.length, 2);
    assert.equal((await prisma.refund.findUniqueOrThrow({ where: { id: refundRecord.id } })).razorpayRefundId, `rfnd_${suffix}`);
    await processWebhook(`refund_event_${suffix}`, 'refund.processed', { payload: { refund: { entity: { id: `rfnd_${suffix}` } } } });
    assert.equal((await prisma.refund.findUniqueOrThrow({ where: { id: refundRecord.id } })).status, 'PROCESSED');
  } finally {
    await refundQueue.resume();
  }
  setRazorpayForTests(undefined);
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.category.delete({ where: { id: category.id } });
  await prisma.user.delete({ where: { id: user.id } });
});

test('concurrent checkouts using a coupon with usageLimit = 1 only permit one redemption', { skip: !enabled }, async () => {
  const { prisma } = await import('../../config/prisma');
  const { createOrder } = await import('./service');
  const suffix = Date.now().toString();

  const user1 = await prisma.user.create({
    data: { email: `user1-${suffix}@example.com`, firstName: 'User1', lastName: 'Test' },
  });
  const user2 = await prisma.user.create({
    data: { email: `user2-${suffix}@example.com`, firstName: 'User2', lastName: 'Test' },
  });

  const address1 = await prisma.address.create({
    data: { userId: user1.id, fullName: 'User One', phone: '9999999991', line1: '123 St', city: 'City', state: 'State', postalCode: '123456', country: 'IN' },
  });
  const address2 = await prisma.address.create({
    data: { userId: user2.id, fullName: 'User Two', phone: '9999999992', line1: '456 St', city: 'City', state: 'State', postalCode: '123456', country: 'IN' },
  });

  const category = await prisma.category.create({ data: { name: `Coupon Cat ${suffix}`, slug: `coupon-cat-${suffix}` } });
  const product = await prisma.product.create({ data: { name: `Coupon Prod ${suffix}`, slug: `coupon-prod-${suffix}`, categoryId: category.id } });
  const variant = await prisma.productVariant.create({ data: { productId: product.id, sku: `COUP-SKU-${suffix}`, name: 'Default', pricePaise: 50000 } });
  await prisma.inventory.create({ data: { variantId: variant.id, quantity: 10 } });

  const cart1 = await prisma.cart.create({ data: { userId: user1.id } });
  await prisma.cartItem.create({ data: { cartId: cart1.id, variantId: variant.id, quantity: 1 } });
  const cart2 = await prisma.cart.create({ data: { userId: user2.id } });
  await prisma.cartItem.create({ data: { cartId: cart2.id, variantId: variant.id, quantity: 1 } });

  const couponCode = `LIMIT1-${suffix}`;
  const coupon = await prisma.coupon.create({
    data: {
      code: couponCode,
      type: 'FIXED',
      value: 10000,
      usageLimit: 1,
      usedCount: 0,
      startsAt: new Date(Date.now() - 60000),
      expiresAt: new Date(Date.now() + 600000),
    },
  });

  const results = await Promise.allSettled([
    createOrder(user1.id, { addressId: address1.id, paymentMethod: 'COD', couponCode }),
    createOrder(user2.id, { addressId: address2.id, paymentMethod: 'COD', couponCode }),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  assert.equal(fulfilled.length, 1, 'Exactly one order should succeed');
  assert.equal(rejected.length, 1, 'Exactly one order should fail due to usage limit');

  const reloadedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
  assert.equal(reloadedCoupon.usedCount, 1, 'Coupon usedCount must be exactly 1');

  const usages = await prisma.couponUsage.findMany({ where: { couponId: coupon.id } });
  assert.equal(usages.length, 1, 'Exactly one CouponUsage record must exist');

  await prisma.couponUsage.deleteMany({ where: { couponId: coupon.id } });
  await prisma.coupon.delete({ where: { id: coupon.id } });
  await prisma.order.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
  await prisma.inventory.deleteMany({ where: { variantId: variant.id } });
  await prisma.productVariant.delete({ where: { id: variant.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.category.delete({ where: { id: category.id } });
  await prisma.address.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
  await prisma.cart.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });
});

