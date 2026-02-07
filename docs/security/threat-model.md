# Threat Model (Lite)

## Scope

- Frontend SPA (Angular)
- Backend API (Next.js)
- Local SQLite storage
- Admin and user authentication flows

## Assets

- User credentials (login/password)
- Session tokens (HTTP-only cookies)
- Progress data
- Admin content management data

## Entry Points

- `/api/auth/login`, `/api/auth/register`
- `/api/progress`, `/api/content/*`
- `/admin` UI
- `/api/telemetry`, `/api/metrics`

## Trust Boundaries

- Browser ↔ Backend API
- Backend ↔ SQLite file
- CI/CD ↔ Release artifacts

## Primary Threats & Mitigations

- **Credential stuffing/brute force**
  - Rate limits on auth endpoints, stronger password policy.
- **Session theft**
  - HTTP-only cookies, SameSite strict, secure in production.
- **Injection**
  - Prisma ORM, input validation on auth and progress.
- **Privilege escalation**
  - Admin guard with role + login checks.
- **Data tampering**
  - Authenticated endpoints require valid session token.
- **DoS**
  - Per-IP rate limiting, basic load tests in CI.
- **Telemetry abuse**
  - Payload validation, rate limiting, optional token for metrics.

## Residual Risks

- Local SQLite file permissions are OS‑dependent.
- No WAF/edge protection in local dev.
- Metrics endpoint access if token is not set.
