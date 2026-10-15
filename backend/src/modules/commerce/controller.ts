import { Request, Response } from 'express';
import * as service from './service';
import { addressIdSchema, addressSchema, cartItemSchema, checkoutSchema, couponSchema, mergeCartSchema, quantitySchema, variantIdSchema } from './validation';

const userId = (req: Request): string => {
  if (!req.user) throw new Error('Authenticated user missing');
  return req.user.id;
};

export async function getCart(req: Request, res: Response) { res.json({ success: true, data: await service.getCart(userId(req)) }); }
export async function addCartItem(req: Request, res: Response) { const input = cartItemSchema.parse(req.body); res.json({ success: true, data: await service.addToCart(userId(req), input.variantId, input.quantity) }); }
export async function updateCartItem(req: Request, res: Response) { const { variantId } = variantIdSchema.parse(req.params); const { quantity } = quantitySchema.parse(req.body); res.json({ success: true, data: await service.updateCartItem(userId(req), variantId, quantity) }); }
export async function removeCartItem(req: Request, res: Response) { const { variantId } = variantIdSchema.parse(req.params); res.json({ success: true, data: await service.removeFromCart(userId(req), variantId) }); }
export async function clearCart(req: Request, res: Response) { res.json({ success: true, data: await service.clearCart(userId(req)) }); }
export async function mergeCart(req: Request, res: Response) { const input = mergeCartSchema.parse(req.body); res.json({ success: true, data: await service.mergeGuestCart(userId(req), input.items) }); }

export async function getWishlist(req: Request, res: Response) { res.json({ success: true, data: await service.getWishlist(userId(req)) }); }
export async function addWishlist(req: Request, res: Response) { const { variantId } = variantIdSchema.parse(req.body); res.json({ success: true, data: await service.addToWishlist(userId(req), variantId) }); }
export async function removeWishlist(req: Request, res: Response) { const { variantId } = variantIdSchema.parse(req.params); res.json({ success: true, data: await service.removeFromWishlist(userId(req), variantId) }); }

export async function getAddresses(req: Request, res: Response) { res.json({ success: true, data: await service.listAddresses(userId(req)) }); }
export async function createAddress(req: Request, res: Response) { res.status(201).json({ success: true, data: await service.createAddress(userId(req), addressSchema.parse(req.body)) }); }
export async function updateAddress(req: Request, res: Response) { const { id } = addressIdSchema.parse(req.params); res.json({ success: true, data: await service.updateAddress(userId(req), id, addressSchema.partial().parse(req.body)) }); }
export async function deleteAddress(req: Request, res: Response) { const { id } = addressIdSchema.parse(req.params); await service.deleteAddress(userId(req), id); res.json({ success: true, data: { message: 'Address deleted' } }); }

export async function validateCoupon(req: Request, res: Response) { const { code } = couponSchema.parse(req.body); res.json({ success: true, data: await service.validateCouponForUser(userId(req), code) }); }
export async function checkoutCalculation(req: Request, res: Response) { const input = checkoutSchema.parse(req.body); res.json({ success: true, data: await service.calculateCheckout(userId(req), input.addressId, input.couponCode) }); }
