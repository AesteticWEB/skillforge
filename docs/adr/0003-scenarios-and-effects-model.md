# ADR 0003: Scenario decision effects model

## Status

Accepted

## Context

Simulator decisions need to update multiple metrics (skills, reputation, tech debt) in a simple and extensible way.
The model should be easy to mock and easy to serialize.

## Decision

Model decision effects as a `Record<string, number>` where keys map to metric or skill ids.
Effects are applied centrally inside the AppStore.

## Consequences

- Adding a new metric requires only a new key and store handling.
- Decisions remain data-only and easy to test.
- Validation is centralized, avoiding UI-level business logic.
