import { Request, Response } from 'express';
import { PaymentMethod } from '@prisma/client';
import * as service from './service';
import { createOrderSchema, orderIdSchema, refundSchema, returnRequestSchema, updateOrderStatusSchema, verifyPaymentSchema } from './validation';

function currentUserId(req: Request): string {
  if (!req.user) throw new Error('Authenticated user missing');
  return req.user.id;
}

export async function createOrder(req: Request, res: Response) {
  const input = createOrderSchema.parse(req.body);
  res.status(201).json({ success: true, data: await service.createOrder(currentUserId(req), { ...input, paymentMethod: input.paymentMethod as PaymentMethod }) });
}

export async function listOrders(req: Request, res: Response) {
  res.json({ success: true, data: await service.listOrders(currentUserId(req)) });
}

export async function getOrder(req: Request, res: Response) {
  const { id } = orderIdSchema.parse(req.params);
  res.json({ success: true, data: await service.getOrder(currentUserId(req), id) });
}

export async function verifyPayment(req: Request, res: Response) {
  const { id } = orderIdSchema.parse(req.params);
  res.json({ success: true, data: await service.verifyPayment(currentUserId(req), id, verifyPaymentSchema.parse(req.body)) });
}

export async function cancelOrder(req: Request, res: Response) {
  const { id } = orderIdSchema.parse(req.params);
  res.json({ success: true, data: await service.cancelOrder(currentUserId(req), id) });
}

export async function requestReturn(req: Request, res: Response) {
  const { id } = orderIdSchema.parse(req.params);
  const { reason } = returnRequestSchema.parse(req.body);
  res.status(201).json({ success: true, data: await service.requestReturn(currentUserId(req), id, reason) });
}

export async function updateOrderStatus(req: Request, res: Response) {
  const { id } = orderIdSchema.parse(req.params);
  const input = updateOrderStatusSchema.parse(req.body);
  res.json({ success: true, data: await service.updateOrderStatus(id, input.status, input.note, currentUserId(req)) });
}

export async function downloadInvoice(req: Request, res: Response) {
  const { id } = orderIdSchema.parse(req.params);
  const invoice = await service.getInvoice(currentUserId(req), id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
  res.send(invoice);
}

export async function refundOrder(req: Request, res: Response) {
  const { id } = orderIdSchema.parse(req.params);
  const input = refundSchema.parse(req.body);
  res.status(201).json({ success: true, data: await service.refundOrder(id, input.amountPaise, input.reason) });
}
