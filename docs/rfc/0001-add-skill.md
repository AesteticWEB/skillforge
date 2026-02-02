# RFC 0001: How to add a new skill

## Goal

Add a new skill in a consistent way without breaking FSD, state, or tests.

## Scope

This RFC covers:

- Domain model expectations
- Mock data updates
- UI impacts (skills list, onboarding)
- Tests and verification

## Steps

1. **Add the skill to mock data**

- File: `src/shared/api/skills/skills.mock.ts`
- Add a new `Skill` entry with:
  - `id`: unique string (kebab-case)
  - `name`: human-readable name
  - `category`: short label used for filtering
  - `level`: initial default (usually 0)
  - `maxLevel`: maximum cap
  - `deps`: dependency skill ids (if any)

2. **Verify dependency consistency**

- If `deps` references other skills, ensure those skill ids exist in the same mock list.
- Keep dependency chains shallow to avoid complex cycles.

3. **Check onboarding default limits**

- Onboarding allows 3 initial skills. New skills should appear in the list automatically.
- No UI updates needed unless you want custom ordering.

4. **Check skill gating logic**

- The domain logic is in `src/entities/skill/lib/skill-logic.ts`.
- No changes required unless you add new rules.

5. **Run unit tests**

```bash
npm test
```

6. **Manual verification**

- `/skills`: new skill card renders, filtering works.
- `/onboarding`: skill appears in the selection list.

## Non-goals

- Changing skill system rules (handled in separate RFC).

## Notes

- If a skill affects scenario requirements or effects, update those in the scenario mock data.
