import { Server as HttpServer } from 'node:http';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';

let io: Server | undefined;

export function createSocketServer(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  });
  io.use((socket, next) => {
    try {
      const token = (socket.handshake.auth?.token as string | undefined) ?? readAccessTokenCookie(socket);
      if (!token) {
        next(new Error('Authentication required'));
        return;
      }
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload & { id: string; role: Role };
      if (!payload.id || !payload.role) return next(new Error('Invalid access token'));
      socket.data.userId = payload.id;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid or expired access token'));
    }

  });
  io.on('connection', (socket: Socket) => {
    socket.join(`user:${socket.data.userId}`);
    if ([Role.SUPER_ADMIN, Role.MANAGER, Role.SUPPORT].includes(socket.data.role)) socket.join('admins');
  });
  return io;
}

function readAccessTokenCookie(socket: Socket): string | undefined {
  const cookieHeader = socket.handshake.headers.cookie;
  const match = cookieHeader?.match(/(?:^|;\s*)accessToken=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

function emit(event: string, room: string, payload: unknown): void {
  io?.to(room).emit(event, payload);
}

export function emitOrderCreated(payload: unknown): void {
  emit('order:created', 'admins', payload);
}

export function emitOrderStatusUpdated(userId: string, payload: unknown): void {
  emit('order:status-updated', `user:${userId}`, payload);
  emit('order:status-updated', 'admins', payload);
}

export function emitStockUpdated(payload: unknown): void {
  emit('stock:updated', 'admins', payload);
}
