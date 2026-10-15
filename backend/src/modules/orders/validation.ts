import { z } from 'zod';

export const paymentMethodSchema = z.enum(['RAZORPAY', 'COD']);
export const createOrderSchema = z.object({
  addressId: z.string().cuid(),
  paymentMethod: paymentMethodSchema,
  couponCode: z.string().trim().min(1).max(40).optional().nullable(),
});
export const orderIdSchema = z.object({ id: z.string().cuid() });
export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1).max(100),
  razorpayPaymentId: z.string().min(1).max(100),
  razorpaySignature: z.string().min(1).max(255),
});
export const returnRequestSchema = z.object({
  reason: z.string().trim().min(5).max(1000),
});
export const refundSchema = z.object({
  amountPaise: z.number().int().positive().optional(),
  reason: z.string().trim().max(500).optional(),
});
export const updateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']),
  note: z.string().trim().max(500).optional(),
});
