import PDFDocument from 'pdfkit';
import { Order } from '@prisma/client';

type InvoiceOrder = Order & { items: Array<{ productName: string; variantName: string; sku: string; quantity: number; unitPricePaise: number; totalPaise: number }> };

export function createInvoicePdf(order: InvoiceOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
    const money = (paise: number) => `INR ${(paise / 100).toFixed(2)}`;
    document.fontSize(20).text('INVOICE', { align: 'right' });
    document.moveDown().fontSize(11).text(`Invoice / Order: ${order.id}`).text(`Date: ${order.createdAt.toISOString()}`).text(`Payment: ${order.paymentMethod}`);
    document.moveDown().fontSize(12).text('Items', { underline: true });
    for (const item of order.items) {
      document.fontSize(10).text(`${item.productName} - ${item.variantName} (${item.sku})`);
      document.text(`${item.quantity} x ${money(item.unitPricePaise)} = ${money(item.totalPaise)}`);
      document.moveDown(0.4);
    }
    document.moveDown().fontSize(11).text(`Subtotal: ${money(order.subtotalPaise)}`).text(`Discount: ${money(order.discountPaise)}`).text(`Tax: ${money(order.taxPaise)}`).text(`Shipping: ${money(order.shippingPaise)}`).fontSize(14).text(`Total: ${money(order.totalPaise)}`);
    document.end();
  });
}
