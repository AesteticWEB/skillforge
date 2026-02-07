# Security Policy

## Supported Versions

- `0.1.x` — actively maintained

## Reporting

Please open a private report or contact the maintainer for security issues.

## Dependency Hygiene

- `npm audit --omit=dev` should be clean for production deploys.
- The Prisma CLI (`prisma`) is a dev tool; production uses `@prisma/client`.
- Track upstream Prisma advisories and update on minor/patch releases when available.
