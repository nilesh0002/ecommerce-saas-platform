import assert from 'node:assert/strict';
import test from 'node:test';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { analytics } from './service';

test('analytics calculates realized revenue and daily stats using only PaymentStatus.PAID orders', async () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const originalOrderCount = prisma.order.count;
  const originalUserCount = prisma.user.count;
  const originalProductCount = prisma.product.count;
  const originalOrderAggregate = prisma.order.aggregate;
  const originalOrderFindMany = prisma.order.findMany;
  const originalInventoryFindMany = prisma.inventory.findMany;
  const originalOrderGroupBy = prisma.order.groupBy;

  let aggregateWhere: any = null;
  let groupByWhere: any = null;

  try {
    (prisma.order as any).count = async () => 10;
    (prisma.user as any).count = async () => 5;
    (prisma.product as any).count = async () => 8;
    (prisma.order as any).aggregate = async (args: any) => {
      aggregateWhere = args.where;
      return { _sum: { totalPaise: 450000 } };
    };
    (prisma.order as any).findMany = async () => [];
    (prisma.inventory as any).findMany = async () => [];
    (prisma.order as any).groupBy = async (args: any) => {
      groupByWhere = args.where;
      return [{ createdAt: new Date('2026-10-30'), _sum: { totalPaise: 450000 }, _count: 3 }];
    };

    const fromDate = new Date('2026-10-01');
    const toDate = new Date('2026-10-31');
    const result = await analytics(fromDate, toDate);

    // Verify revenue calculation only aggregates PAID orders
    assert.equal(aggregateWhere.paymentStatus, PaymentStatus.PAID);
    assert.notEqual(aggregateWhere.paymentStatus, PaymentStatus.PENDING);
    assert.notEqual(aggregateWhere.paymentStatus, PaymentStatus.FAILED);
    assert.notEqual(aggregateWhere.paymentStatus, PaymentStatus.REFUNDED);

    // Verify daily trends only group PAID orders
    assert.equal(groupByWhere.paymentStatus, PaymentStatus.PAID);

    // Verify returned cards
    assert.equal(result.cards.revenuePaise, 450000);
    assert.equal(result.cards.orders, 10);
    assert.equal(result.cards.customers, 5);
    assert.equal(result.cards.products, 8);
    assert.equal(result.daily.length, 1);
  } finally {
    prisma.order.count = originalOrderCount;
    prisma.user.count = originalUserCount;
    prisma.product.count = originalProductCount;
    prisma.order.aggregate = originalOrderAggregate;
    prisma.order.findMany = originalOrderFindMany;
    prisma.inventory.findMany = originalInventoryFindMany;
    prisma.order.groupBy = originalOrderGroupBy;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
});
