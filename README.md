# SkillForge Backend (Next.js)

API + admin backend for the SkillForge Angular frontend.

## Requirements

- Node.js 20+
- npm 11+
- SQLite (file-based via `DATABASE_URL`)

## Quick start

```bash
npm install
npx prisma db push
npx prisma db seed
npm run dev -- -p 3002
```

Health check: `http://localhost:3002/api/health`.

## Environment

Create `.env` (already present in this repo for local dev):

```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="your-32+chars-secret"
```

## Admin access (dev)

Default admin credentials are seeded:

- login: `admin1`
- password: `admin1`

Admin UI is under `/admin`.

## Password policy

- 10-128 characters
- Must include at least one letter and one number

## Key endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/progress`
- `POST /api/progress`
- `GET /api/content/*`
- `POST /api/telemetry`

## Useful scripts

- `npm run db:backup` - snapshot SQLite database into `backups/`
- `npm run db:restore -- --file <path>` - restore from a backup file
- `npm run contract:check` - basic API contract verification
- `npm run load-test` - lightweight load test for a single endpoint
- `npm test` - backend unit/integration tests
- `npm run test:coverage` - tests with coverage gate
- `npm run env:check` - validate required environment variables

## Ops docs

Operational guides live in `docs/ops/README.md`.

## Production

```bash
npm run build
npm start
```

Release artifacts can be built via the GitHub Actions `Release` workflow.
Release tagging and changelog updates are automated by Release Please.
