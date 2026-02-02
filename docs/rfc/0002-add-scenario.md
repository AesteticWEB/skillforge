# RFC 0002: How to add a new scenario

## Goal

Add a new scenario with gating rules and effects while keeping logic in the domain layer.

## Scope

This RFC covers:

- Scenario definition
- Requirements and availability effects
- Decision effects
- Tests and verification

## Steps

1. **Add the scenario to mock data**

- File: `src/shared/api/scenarios/scenarios.mock.ts`
- Add a new `Scenario` entry with:
  - `id`, `title`, `description`
  - `decisions`: list of decisions with `effects`
  - Optional `requirements`
  - Optional `availabilityEffects`

2. **Define requirements (gating rules)**

- Field: `requirements?: ScenarioRequirement[]`
- Supported types:
  - `skill`: `{ type: 'skill', skillId, minLevel }`
  - `metric`: `{ type: 'metric', metric: 'reputation' | 'techDebt', min?, max? }`
  - `scenario`: `{ type: 'scenario', scenarioId }` (requires completion)
- Gating rules are evaluated in `src/entities/scenario/lib/availability.ts`.
- UI reads `ScenarioAccess` from the store; do not add custom checks in components.

3. **Define availability effects**

- Field: `availabilityEffects?: ScenarioAvailabilityEffect[]`
- Example: unlock another scenario after completion:
  - `{ type: 'unlock', scenarioId: 'scenario-2' }`

4. **Define decision effects**

- `Decision.effects` is a `Record<string, number>`.
- Skill effects use skill ids as keys; metric effects use `reputation` or `techDebt`.
- Effects are applied in `src/entities/progress/lib/decision-effects.ts`.

5. **Run unit tests**

```bash
npm test
```

6. **Manual verification**

- `/simulator`: scenario appears, locked scenarios show reasons.
- `/simulator/:id`: locked scenarios show a warning and cannot be completed.
- `/analytics`: decision history reflects new scenario.

## Non-goals

- Adding new metrics or complex multi-step scenarios (separate RFC).
