import { z } from 'zod';

export const variantIdSchema = z.object({ variantId: z.string().cuid() });
export const cartItemSchema = z.object({
  variantId: z.string().cuid(),
  quantity: z.number().int().positive().max(100),
});
export const mergeCartSchema = z.object({
  items: z.array(cartItemSchema).max(100),
});
export const quantitySchema = z.object({ quantity: z.number().int().positive().max(100) });

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional().nullable(),
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(30),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(3).max(20),
  country: z.string().trim().length(2).default('IN'),
  isDefault: z.boolean().optional(),
});

export const addressIdSchema = z.object({ id: z.string().cuid() });
export const couponSchema = z.object({ code: z.string().trim().min(1).max(40) });
export const checkoutSchema = z.object({
  addressId: z.string().cuid(),
  couponCode: z.string().trim().min(1).max(40).optional().nullable(),
});
