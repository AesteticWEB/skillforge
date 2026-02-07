# Observability Stack (Local)

This setup uses Prometheus + Grafana for metrics and Loki + Promtail for logs.

## 1) Run the backend with file logging

Set a log file path (Promtail will tail it):

```bash
set LOG_FILE=./logs/backend.log
set DATABASE_URL=file:./dev.db
set SESSION_SECRET=your-32+chars-secret
npm run dev -- -p 3002
```

Create the `logs/` folder if it does not exist.

## 2) Start the stack

From `skillforge-next/`:

```bash
docker compose -f ops/observability/docker-compose.yml up -d
```

Grafana: `http://localhost:3000` (admin/admin).

## 3) Metrics

Prometheus scrapes: `http://host.docker.internal:3002/api/metrics`.

Optional protection:

- Set `METRICS_TOKEN` and pass `Authorization: Bearer <token>`.

## 4) Logs

Promtail tails `./logs/backend.log` and ships to Loki.

## Troubleshooting

- If Prometheus cannot reach the backend, update `prometheus.yml` target.
- If logs are empty, ensure `LOG_FILE` is set and the backend is writing to it.
