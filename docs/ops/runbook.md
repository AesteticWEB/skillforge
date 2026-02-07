# Runbook

## Health check

- `GET /api/health` should return `{ ok: true, status: "ok" }`.
- Verify backend logs include `request_id` entries from `withApiLogging`.

## Start (dev)

```bash
npm install
npx prisma db push
npx prisma db seed
npm run dev -- -p 3002
```

## Start (prod)

```bash
npm run build
npm start
```

## Incident triage

- Check `/api/health`.
- Inspect recent logs (JSON lines). Increase verbosity with `LOG_LEVEL=debug`.
- Run contract checks:

```bash
npm run contract:check
```

- If the API is slow, run a quick load test:

```bash
BASE_URL=http://localhost:3002 TARGET_PATH=/api/content/items npm run load-test
```

## Rollback

- Redeploy the previous build artifact.
- If the issue is data-related, restore the latest backup (see `backup.md`).
