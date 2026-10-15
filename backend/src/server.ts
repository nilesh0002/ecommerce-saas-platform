import { createServer } from 'node:http';
import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { logger } from './config/logger';
import { createSocketServer } from './sockets';
import { workers } from './jobs/workers';
import { schedulePendingOrderCleanup } from './jobs/queues';

const httpServer = createServer(app);
createSocketServer(httpServer);
void schedulePendingOrderCleanup().catch((error) => logger.error('pending_order_cleanup_schedule_failed', { error }));
httpServer.listen(env.PORT, () => {
  logger.info(`API listening on port ${env.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down`);
  httpServer.close(async () => {
    await Promise.all(workers.map((worker) => worker.close()));
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
