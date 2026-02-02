# ADR 0001: State management via Angular Signals

## Status

Accepted

## Context

The app needs a centralized source of truth for user profile, skills, scenarios, and progress.
We want minimal library overhead, strong typing, and computed selectors for derived data.

## Decision

Use a custom AppStore based on Angular Signals and computed values.

## Consequences

- No external state library is required.
- Store logic remains explicit and testable.
- Components only read signals and call store methods.
- Complex async flows would require additional patterns (effects or services).
