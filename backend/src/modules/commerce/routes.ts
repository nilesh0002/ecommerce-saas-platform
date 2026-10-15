import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './controller';

const router = Router();
router.use(authenticate);

router.get('/cart', asyncHandler(controller.getCart));
router.post('/cart/items', asyncHandler(controller.addCartItem));
router.post('/cart/merge', asyncHandler(controller.mergeCart));
router.patch('/cart/items/:variantId', asyncHandler(controller.updateCartItem));
router.delete('/cart/items/:variantId', asyncHandler(controller.removeCartItem));
router.delete('/cart', asyncHandler(controller.clearCart));

router.get('/wishlist', asyncHandler(controller.getWishlist));
router.post('/wishlist/items', asyncHandler(controller.addWishlist));
router.delete('/wishlist/items/:variantId', asyncHandler(controller.removeWishlist));

router.get('/addresses', asyncHandler(controller.getAddresses));
router.post('/addresses', asyncHandler(controller.createAddress));
router.patch('/addresses/:id', asyncHandler(controller.updateAddress));
router.delete('/addresses/:id', asyncHandler(controller.deleteAddress));

router.post('/coupons/validate', asyncHandler(controller.validateCoupon));
router.post('/checkout/calculate', asyncHandler(controller.checkoutCalculation));

export default router;
