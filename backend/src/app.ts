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
import { prisma } from './config/prisma';
import { redis } from './config/redis';

export const app = express();
initializeSentry();

// Enable trust proxy for reverse proxies (Render, Cloudflare, Nginx)
app.set('trust proxy', 1);

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

// Comprehensive health endpoint checking DB and Redis
const healthCheck = async (_req: express.Request, res: express.Response) => {
  let dbStatus: 'ok' | 'error' = 'ok';
  let redisStatus: 'ok' | 'error' = 'ok';
  let dbError: string | undefined;
  let redisError: string | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = 'error';
    dbError = err instanceof Error ? err.message : 'Database connection error';
  }

  try {
    const pingRes = await redis.ping();
    if (pingRes !== 'PONG') {
      redisStatus = 'error';
      redisError = `Unexpected ping response: ${pingRes}`;
    }
  } catch (err) {
    redisStatus = 'error';
    redisError = err instanceof Error ? err.message : 'Redis connection error';
  }

  const isHealthy = dbStatus === 'ok' && redisStatus === 'ok';
  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: {
      status: isHealthy ? 'healthy' : 'degraded',
      checks: {
        database: { status: dbStatus, ...(dbError ? { error: dbError } : {}) },
        redis: { status: redisStatus, ...(redisError ? { error: redisError } : {}) },
      },
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
};

app.get('/api/health', asyncHandler(healthCheck));
app.get('/health', asyncHandler(healthCheck));
app.get('/api/v1/health', asyncHandler(healthCheck));
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
