import { Request, Response } from 'express';
import { AppError } from '../../utils/errors';
import * as service from './service';

export async function razorpayWebhook(req: Request, res: Response) {
  const signature = req.header('x-razorpay-signature');
  const eventId = req.header('x-razorpay-event-id');
  if (!signature || !eventId || !Buffer.isBuffer(req.body)) {
    throw new AppError(400, 'Invalid webhook request', 'WEBHOOK_REQUEST_INVALID');
  }
  service.verifyWebhookSignature(req.body, signature);
  const payload = JSON.parse(req.body.toString('utf8')) as { event?: string; payload?: Record<string, unknown> };
  if (!payload.event) throw new AppError(400, 'Webhook event is missing', 'WEBHOOK_EVENT_INVALID');
  const result = await service.processWebhook(eventId, payload.event, payload as Record<string, unknown>);
  res.json({ success: true, data: result });
}
