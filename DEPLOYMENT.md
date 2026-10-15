# Deployment guide

## Production architecture

```text
Browser -> Nginx -> frontend:3000
                  -> backend:5000 -> PostgreSQL
                                  -> Redis/BullMQ
```

Build and run the two workspace applications from the repository root.
Production secrets must be supplied by the deployment platform, not committed
to the repository.

## Required backend variables

Copy `.env.example` to a secret manager or backend environment configuration.
At minimum configure:

- `DATABASE_URL`
- `REDIS_URL`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- Razorpay variables for online payments
- SMTP variables for email delivery
- Cloudinary variables for image uploads

`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must each be at least 32
characters and must be different in production.

## Build and migrate

```powershell
npm ci
npm run db:generate
npm run db:migrate --workspace backend -- --name production
npm run build
```

Run the seed only for a new development/staging database:

```powershell
npm run db:seed
```

## Process commands

```powershell
npm run start --workspace backend
npm run start --workspace frontend
```

The backend starts from `backend/dist/src/server.js`. The frontend starts
from the Next.js production build.

## Docker Compose

`docker-compose.yml` is intended for local PostgreSQL and Redis. For
production, use managed PostgreSQL/Redis or an orchestrator with persistent
volumes and backups.

## Nginx and HTTPS

Terminate TLS at Nginx and proxy:

- `/api/` and `/socket.io/` to the backend
- all other requests to the Next.js frontend

Use a WebSocket-enabled proxy for Socket.io and configure Razorpay's webhook
URL as:

```text
https://your-domain.example/api/v1/payments/webhook/razorpay
```

## Operational checklist

- Configure a restricted `CORS_ORIGINS` allowlist.
- Configure Razorpay webhook signing secret.
- Run Prisma migrations before starting the backend.
- Run one backend process with BullMQ workers per worker deployment strategy.
- Set up database backups and Redis persistence where required.
- Configure Sentry with `SENTRY_DSN`.
- Verify `/health`, login, checkout, webhook delivery, invoice download, and
  Socket.io connections after deployment.
