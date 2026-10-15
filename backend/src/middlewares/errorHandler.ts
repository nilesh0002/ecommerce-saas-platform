import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { Sentry } from '../config/sentry';
import { logger } from '../config/logger';

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.flatten() },
    });
    return;
  }
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError ? error.message : 'Internal server error';
  if (statusCode === 500) {
    logger.error('request_error', { error: error instanceof Error ? error.message : error, path: req.path });
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
  }
  res.status(statusCode).json({ success: false, error: { code: error.code ?? 'INTERNAL_ERROR', message } });
};
