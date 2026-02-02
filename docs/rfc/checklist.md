# Extension checklist: keep FSD + state consistent

## Imports and structure

- Use public APIs only: `@/entities/*`, `@/features/*`, `@/shared/ui/*`.
- Do not deep-import `model` or component files.
- Place new UI in `shared/ui` or `widgets` and wire via public index.
- Keep business logic in `entities` or `features` (not in `pages`).

## State and domain logic

- Store is an orchestrator, not the source of logic.
- Domain rules live in pure functions under `entities/*/lib`.
- Any new rules should be tested without TestBed.

## Data flow

- Pages read signals/computed selectors only.
- Mutations go through store methods or feature services.
- Do not mutate local component state as the source of truth.

## Persistence

- If you add new state fields, update:
  - `mergeProgressDefaults` or `mergeUserDefaults` (if needed)
  - `persistToStorage` payload
  - hydration logic in `readStorage` and `hydrateFromStorage`

## Scenarios and gating

- Use `ScenarioRequirement` and `ScenarioAvailabilityEffect` only.
- UI must consume store-provided access state, not custom if-checks.

## Events and achievements

- Emit domain events for major state changes.
- Achievements and notifications should subscribe via the event bus.
- Avoid feature-to-feature imports.

## Tests

- Update unit tests for domain logic.
- Update E2E flows if the main paths changed.

## Verification

- `npm run lint`
- `npm test`
- `npm run test:e2e`
