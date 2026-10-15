import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { initializeSentry, Sentry } from './config/sentry';
import { openapiDocument } from './docs/openapi';
import authRoutes from './modules/auth/routes';
import catalogRoutes from './modules/catalog/routes';
import commerceRoutes from './modules/commerce/routes';
import orderRoutes from './modules/orders/routes';
import adminOrderRoutes from './modules/orders/admin-routes';
import adminRoutes from './modules/admin/routes';
import { razorpayWebhook } from './modules/orders/webhook';
import { asyncHandler } from './utils/asyncHandler';
import { errorHandler } from './middlewares/errorHandler';
import { apiLimiter, sanitizeInput } from './middlewares/security';
import { logger } from './config/logger';

export const app = express();
initializeSentry();

app.use(helmet());
const allowedOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin is not allowed'));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => logger.info('http_request', {
    method: req.method, path: req.path, statusCode: res.statusCode, durationMs: Date.now() - started,
  }));
  next();
});
app.use(apiLimiter);

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});
app.post('/api/v1/payments/webhook/razorpay', express.raw({ type: 'application/json' }), asyncHandler(razorpayWebhook));
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeInput);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));
app.get('/openapi.json', (_req, res) => res.json(openapiDocument));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/v1/commerce', commerceRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin/orders', adminOrderRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});
if (env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);
