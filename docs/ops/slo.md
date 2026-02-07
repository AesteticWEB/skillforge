# SLO

Service: SkillForge Backend API.

- Availability: 99.5% monthly for `/api/health` and `/api/content/*`.
- Latency: p95 < 400ms for read-only endpoints, p95 < 800ms for write endpoints.
- Error rate: < 1% 5xx over a rolling 30-day window.

Alerting should trigger on sustained 5xx spikes or when `/api/health` fails.
