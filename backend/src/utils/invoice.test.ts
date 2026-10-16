import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { createInvoicePdf, formatCurrencyPaise, validateInvoiceTotals, InvoiceOrder } from './invoice';

test('formatCurrencyPaise formats paise to INR with two decimals', () => {
  assert.equal(formatCurrencyPaise(0), 'INR 0.00');
  assert.equal(formatCurrencyPaise(100), 'INR 1.00');
  assert.equal(formatCurrencyPaise(4999), 'INR 49.99');
  assert.equal(formatCurrencyPaise(150000), 'INR 1500.00');
  assert.equal(formatCurrencyPaise(-500), '-INR 5.00');
  // Rounding fractional paise
  assert.equal(formatCurrencyPaise(1234.6), 'INR 12.35');
});

test('validateInvoiceTotals accurately reconciles totals, tax, discount, and shipping', () => {
  const result = validateInvoiceTotals({
    subtotalPaise: 100000,
    discountPaise: 10000,
    taxPaise: 16200, // 18% of 90000
    shippingPaise: 9900,
    totalPaise: 116100, // 100000 - 10000 + 16200 + 9900
  });

  assert.equal(result.isAccurate, true);
  assert.equal(result.calculatedTotalPaise, 116100);
  assert.equal(result.totalPaise, 116100);
  assert.equal(result.subtotalPaise, 100000);
  assert.equal(result.discountPaise, 10000);
  assert.equal(result.taxPaise, 16200);
  assert.equal(result.shippingPaise, 9900);
});

test('validateInvoiceTotals handles null/undefined optional amounts', () => {
  const result = validateInvoiceTotals({
    subtotalPaise: 50000,
    discountPaise: null,
    taxPaise: null,
    shippingPaise: null,
    totalPaise: 50000,
  });

  assert.equal(result.isAccurate, true);
  assert.equal(result.discountPaise, 0);
  assert.equal(result.taxPaise, 0);
  assert.equal(result.shippingPaise, 0);
  assert.equal(result.calculatedTotalPaise, 50000);
});

test('validateInvoiceTotals flags discrepancies when total does not match components', () => {
  const result = validateInvoiceTotals({
    subtotalPaise: 50000,
    discountPaise: 5000,
    taxPaise: 8100,
    shippingPaise: 0,
    totalPaise: 60000, // Expected 53100
  });

  assert.equal(result.isAccurate, false);
  assert.equal(result.calculatedTotalPaise, 53100);
});

test('createInvoicePdf produces a valid PDF buffer and handles string and Date timestamps', async () => {
  const orderWithDate: InvoiceOrder = {
    id: 'order-123',
    userId: 'user-1',
    addressId: 'addr-1',
    status: OrderStatus.CONFIRMED,
    paymentMethod: PaymentMethod.RAZORPAY,
    paymentStatus: PaymentStatus.PAID,
    subtotalPaise: 20000,
    discountPaise: 2000,
    taxPaise: 3240,
    shippingPaise: 9900,
    totalPaise: 31140,
    couponCode: 'SAVE10',
    razorpayOrderId: 'order_rzp_123',
    placedAt: new Date('2026-10-16T10:00:00Z'),
    createdAt: new Date('2026-10-16T10:00:00Z'),
    updatedAt: new Date('2026-10-16T10:00:00Z'),
    items: [
      {
        productName: 'Organic Cotton Shirt',
        variantName: 'Medium / Blue',
        sku: 'SHIRT-M-BLU',
        quantity: 2,
        unitPricePaise: 10000,
        totalPaise: 20000,
      },
    ],
  };

  const buffer = await createInvoicePdf(orderWithDate);
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 500);
  // Verify PDF header magic bytes %PDF-
  assert.equal(buffer.subarray(0, 4).toString(), '%PDF');

  // Verify it handles string dates (e.g. from JSON deserialization) without throwing
  const orderWithStringDate = {
    ...orderWithDate,
    createdAt: '2026-10-16T10:00:00Z' as unknown as Date,
  };
  const stringDateBuffer = await createInvoicePdf(orderWithStringDate);
  assert.ok(Buffer.isBuffer(stringDateBuffer));
  assert.equal(stringDateBuffer.subarray(0, 4).toString(), '%PDF');
});
