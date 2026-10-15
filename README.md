# Single-store e-commerce platform

Production-oriented TypeScript monorepo for a single online store.

## Repository layout

```text
.
├── backend/                 Express + Prisma API
│   ├── prisma/               Schema, migrations, and seed
│   └── src/
│       ├── config/           Environment, database, Redis, logging
│       ├── jobs/             BullMQ queues and workers
│       ├── middlewares/      Auth, security, and error handling
│       ├── modules/          Auth, catalog, commerce, orders, admin
│       ├── security/         Current-user authorization policies
│       ├── sockets/          Socket.io server and events
│       └── utils/            Shared utilities and tests
├── frontend/                Next.js App Router application
│   ├── app/                  Storefront and admin routes
│   ├── components/           Shared UI components
│   └── lib/                 API client and Zustand state
├── legacy/                  Archived pre-rebuild JavaScript application
│   ├── backend/
│   ├── frontend/
│   └── database/
├── docker-compose.yml       PostgreSQL and Redis for local development
├── .env.example             Backend environment template
└── DEPLOYMENT.md            Deployment and operations guide
```

`backend/src` and `frontend/app` are the canonical application sources.
The `legacy/` tree is retained for reference only and is not part of the
workspace build or runtime.

## Requirements

- Node.js 20+
- npm 8+
- Docker Desktop
- PostgreSQL and Redis (Docker Compose supplies both)

## Local setup

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d postgres redis
npm run db:generate
npm run db:migrate --workspace backend -- --name local
npm run db:seed
npm run dev
```

The API runs on `http://localhost:5000` and the Next.js app on
`http://localhost:3000`.

Use [frontend/.env.example](./frontend/.env.example) for client-side
variables. Never commit `.env` or production credentials.

## Useful commands

```powershell
npm run build
npm run lint
npm run typecheck --workspace backend
npm run typecheck --workspace frontend
npm test --workspace backend
npm run db:migrate
npm run db:seed
```

## Main API areas

- `/api/v1/auth`
- `/api/v1/catalog`
- `/api/v1/commerce`
- `/api/v1/orders`
- `/api/v1/admin`
- `/api/v1/payments/webhook/razorpay`

All prices are calculated server-side and represented in paise. Razorpay
webhooks are the payment source of truth.

## Seed account

The development seed creates:

```text
Email:    admin@example.com
Password: ChangeMe123!
Role:     SUPER_ADMIN
```

Change or remove development credentials before deploying.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for container, reverse proxy, database,
Redis, environment, and webhook configuration.
