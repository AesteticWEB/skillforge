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

## Useful scripts

- `npm start` - dev server
- `npm run build` - production build
- `npm run lint` - ESLint (TS + templates)
- `npm test` - Jest unit tests
- `npm run test:e2e` - Playwright end-to-end tests
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
install -> lint -> test -> build -> e2e
```

PRs should be green before merging.

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
