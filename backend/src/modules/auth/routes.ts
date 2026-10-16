import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from './controller';
import { forgotPasswordSchema, loginSchema, otpSchema, registerSchema, resetPasswordSchema } from './validation';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middlewares/auth';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  skip: () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true',
});

router.post('/register', authLimiter, controller.validateBody(registerSchema), asyncHandler(controller.register));
router.post('/login', authLimiter, controller.validateBody(loginSchema), asyncHandler(controller.login));
router.get('/me', authenticate, asyncHandler(controller.me));
router.post('/verify-otp', authLimiter, controller.validateBody(otpSchema), asyncHandler(controller.verifyOtp));
router.post('/refresh', asyncHandler(controller.refresh));
router.post('/logout', asyncHandler(controller.logout));
router.post('/forgot-password', authLimiter, controller.validateBody(forgotPasswordSchema), asyncHandler(controller.forgotPassword));
router.post('/reset-password', authLimiter, controller.validateBody(resetPasswordSchema), asyncHandler(controller.resetPassword));

export default router;
