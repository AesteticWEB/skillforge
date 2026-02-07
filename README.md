# SkillForge

SPA simulator for skill progression. This project is built to demonstrate senior-level architecture, state management, and testing practices in small, visible iterations.

## Quick start

Requirements:

- Node.js 20+
- npm 11+

Install and run:

```bash
npm install
npm start
```

Open `http://localhost:4200/`.

## Backend (optional, for live content + auth)

The frontend expects a backend on `http://localhost:3002` via `proxy.conf.json`.

In `skillforge-next/`:

```bash
npm install
npm run dev -- -p 3002
```

Health check: `http://localhost:3002/api/health`.

## Mock backend (CI / local e2e)

For e2e runs without a real backend:

```bash
npm run mock-backend
```

## Telemetry (optional)

Unhandled frontend errors are sent to `/api/telemetry` when a backend is running.
Disable locally with:

```js
localStorage.setItem('skillforge.telemetry.disabled', 'true');
```

## Useful scripts

- `npm start` - dev server
- `npm run build` - production build
- `npm run lint` - ESLint (TS + templates)
- `npm test` - Jest unit tests
- `npm run test:e2e` - Playwright end-to-end tests
- `npm run mock-backend` - lightweight backend stub for tests
- `npm run format` - Prettier formatting

## Architecture overview

The project follows a Feature-Sliced Design (FSD) layout:

```
src/
  app/        - app bootstrap, routes, guards, global providers
  pages/      - route-level screens
  widgets/    - layout/shell, composite UI
  features/   - user actions and reusable flows (planned)
  entities/   - domain models and state slices
  shared/     - UI kit, utilities, API mocks
```

Key decisions:

- **State management:** Angular Signals store (centralized state, computed selectors, no logic inside components).
- **Mock data:** `shared/api/*` provides fake endpoints and error toggles via localStorage flags.
- **Persistence:** user and progress are stored in localStorage on every state change.

## Data flow

1. Pages read data from the AppStore via signals/computed selectors.
2. User actions call store methods.
3. Store applies domain logic, persists to localStorage, and updates signals.

No business logic lives inside components.

## Testing

- **Unit tests:** Jest + `jest-preset-angular`
- **E2E:** Playwright (dev server auto-started)

## CI

GitHub Actions workflow runs:

```
install -> format:check -> lint -> test -> build -> e2e
```

PRs should be green before merging.

## Ops docs

Operational notes live in `docs/ops/README.md`.

## Security docs

Threat model and review checklist live in `docs/security/README.md`.

## Release checklist

- **Env:** Node.js 20+, npm 11+, clean working tree, `.env` (if added later).
- **Build:** `npm run build` (verify output in `dist/`).
- **Tests:** `npm run lint`, `npm test`, `npm run test:e2e` (optional for hotfixes).
- **Deploy:** upload `dist/skillforge` to static hosting, verify `/debug` is dev-only.
- **Artifact:** use the GitHub Actions `Release` workflow to build and upload a release artifact.

## ADRs

Decision records are stored in `docs/adr/`:

- `0001-state-management-signals.md`
- `0002-feature-sliced-structure.md`
- `0003-scenarios-and-effects-model.md`

## RFCs

Guides for safe extension live in `docs/rfc/`:

- `0001-add-skill.md`
- `0002-add-scenario.md`
- `checklist.md`

## Perf notes

Measurements were captured with a local synthetic dataset (50 skills, 200 scenarios, 400 decision entries),
averaged over 5 runs using `console.time` in a dev build.

- **Scenario gating (list rendering):**
  - Before: 7.8ms average (rebuilding skill and history maps per scenario).
  - After: 1.4ms average (shared gate context reused across scenarios).
  - Change: `createScenarioGateContext` + `getScenarioGateResultWithContext`.
- **Progress chart series:**
  - Before: 0.6ms average (sorting decision history on every compute).
  - After: 0.2ms average (linear pass; history is append-only).
  - Change: removed sort in `progressSeries` computed.
