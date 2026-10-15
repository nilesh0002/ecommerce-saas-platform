import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './controller';

const router = Router();
router.use(authenticate, authorize(Role.SUPER_ADMIN, Role.MANAGER));
router.post('/:id/refund', asyncHandler(controller.refundOrder));
router.patch('/:id/status', asyncHandler(controller.updateOrderStatus));

export default router;
