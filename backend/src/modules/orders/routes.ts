import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './controller';

const router = Router();
router.use(authenticate);

router.post('/', asyncHandler(controller.createOrder));
router.get('/', asyncHandler(controller.listOrders));
router.get('/:id', asyncHandler(controller.getOrder));
router.post('/:id/payment/verify', asyncHandler(controller.verifyPayment));
router.post('/:id/cancel', asyncHandler(controller.cancelOrder));
router.post('/:id/return-requests', asyncHandler(controller.requestReturn));
router.get('/:id/invoice', asyncHandler(controller.downloadInvoice));

export default router;
