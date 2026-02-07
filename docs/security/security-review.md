# Security Review (Checklist)

## Authentication & Sessions

- [x] Password policy enforced (length + letter + number).
- [x] Session tokens signed and validated.
- [x] HTTP-only cookies with SameSite strict.
- [x] Rate limits on auth endpoints.

## Authorization

- [x] Admin endpoints require admin role + login.
- [x] Progress endpoints require valid session.

## Input Validation

- [x] Auth inputs validated.
- [x] Progress payload size limits enforced.
- [x] Telemetry payload validation.

## Transport & Headers

- [x] CSP/secure headers set in backend.
- [ ] HSTS in production (depends on hosting).

## Dependencies & Supply Chain

- [x] Dependabot configured for npm updates.
- [x] SCA gate in CI (`npm audit --audit-level=high`).
- [x] CodeQL (SAST) enabled.
- [x] Policy‑as‑code for workflow hygiene.

## Logging & Monitoring

- [x] Structured logs with request IDs.
- [x] Metrics endpoint for Prometheus.
- [x] Alert rules defined (error rate, latency, downtime).

## Data

- [x] SQLite backups + restore workflow.
- [ ] Encryption at rest (out of scope for local SQLite).

## CI/CD

- [x] Tests + coverage gate.
- [x] Release Please for versioning.

## Follow‑ups

- Add HSTS at hosting layer.
- Consider 2FA for admin account in production.
