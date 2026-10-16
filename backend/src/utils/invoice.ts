import PDFDocument from 'pdfkit';
import { Order } from '@prisma/client';
import { env } from '../config/env';

export type InvoiceOrderItem = {
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPricePaise: number;
  totalPaise: number;
};

export type InvoiceOrder = Order & {
  items: InvoiceOrderItem[];
};

export function formatCurrencyPaise(paise: number): string {
  const isNegative = paise < 0;
  const absolutePaise = Math.abs(Math.round(paise));
  const formatted = (absolutePaise / 100).toFixed(2);
  return isNegative ? `-INR ${formatted}` : `INR ${formatted}`;
}

export function validateInvoiceTotals(order: {
  subtotalPaise: number;
  discountPaise?: number | null;
  taxPaise?: number | null;
  shippingPaise?: number | null;
  totalPaise: number;
  items?: Array<{ quantity: number; unitPricePaise: number; totalPaise: number }>;
}): {
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  shippingPaise: number;
  totalPaise: number;
  calculatedTotalPaise: number;
  isAccurate: boolean;
} {
  const subtotalPaise = Math.round(order.subtotalPaise ?? 0);
  const discountPaise = Math.max(0, Math.round(order.discountPaise ?? 0));
  const taxPaise = Math.max(0, Math.round(order.taxPaise ?? 0));
  const shippingPaise = Math.max(0, Math.round(order.shippingPaise ?? 0));
  const totalPaise = Math.round(order.totalPaise ?? 0);

  const calculatedTotalPaise = subtotalPaise - discountPaise + taxPaise + shippingPaise;
  const isAccurate = Math.abs(calculatedTotalPaise - totalPaise) === 0;

  return {
    subtotalPaise,
    discountPaise,
    taxPaise,
    shippingPaise,
    totalPaise,
    calculatedTotalPaise,
    isAccurate,
  };
}

export function createInvoicePdf(order: InvoiceOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    const totals = validateInvoiceTotals(order);
    const orderDate = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
    const dateText = !isNaN(orderDate.getTime()) ? orderDate.toISOString().split('T')[0] : 'N/A';
    const taxRatePercent = Math.round(env.TAX_RATE * 100);

    // Header
    document.fontSize(22).font('Helvetica-Bold').text('TAX INVOICE', { align: 'right' });
    document.moveDown(0.5);

    document.fontSize(10).font('Helvetica');
    document.text(`Invoice / Order ID: ${order.id}`);
    document.text(`Date: ${dateText}`);
    document.text(`Payment Method: ${order.paymentMethod}`);
    document.text(`Payment Status: ${order.paymentStatus}`);
    document.moveDown();

    // Items Section
    document.fontSize(12).font('Helvetica-Bold').text('Line Items');
    document.moveDown(0.3);
    document.strokeColor('#cccccc').lineWidth(1).moveTo(50, document.y).lineTo(545, document.y).stroke();
    document.moveDown(0.5);

    for (const item of order.items) {
      const itemUnit = Math.round(item.unitPricePaise);
      const itemTotal = Math.round(item.totalPaise);
      document.fontSize(10).font('Helvetica-Bold').text(`${item.productName} - ${item.variantName}`);
      document.font('Helvetica').text(`SKU: ${item.sku}`);
      document.text(`${item.quantity} x ${formatCurrencyPaise(itemUnit)} = ${formatCurrencyPaise(itemTotal)}`);
      document.moveDown(0.4);
    }

    document.moveDown(0.5);
    document.strokeColor('#cccccc').lineWidth(1).moveTo(50, document.y).lineTo(545, document.y).stroke();
    document.moveDown(0.5);

    // Totals Section
    document.fontSize(10).font('Helvetica');
    document.text(`Subtotal: ${formatCurrencyPaise(totals.subtotalPaise)}`, { align: 'right' });
    if (totals.discountPaise > 0) {
      document.text(`Discount: -${formatCurrencyPaise(totals.discountPaise)}`, { align: 'right' });
    }
    document.text(`Tax (${taxRatePercent}% GST): ${formatCurrencyPaise(totals.taxPaise)}`, { align: 'right' });
    document.text(`Shipping: ${formatCurrencyPaise(totals.shippingPaise)}`, { align: 'right' });
    document.moveDown(0.3);

    document.fontSize(13).font('Helvetica-Bold').text(`Total: ${formatCurrencyPaise(totals.totalPaise)}`, { align: 'right' });

    document.end();
  });
}

