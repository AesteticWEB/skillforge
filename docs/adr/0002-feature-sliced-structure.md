# ADR 0002: Feature-Sliced Design layout

## Status

Accepted

## Context

The project needs to scale across multiple features while keeping UI, state, and domain logic separated.
Flat structures grow chaotic as the number of screens and components increases.

## Decision

Adopt a Feature-Sliced Design layout:

- `app` for routing, bootstrap, and global composition
- `pages` for route-level screens
- `widgets` for layout and composite UI
- `features` for reusable flows (planned)
- `entities` for domain models and state
- `shared` for UI kit, utilities, and API mocks

## Consequences

- Imports remain predictable and layered.
- Pages compose widgets and features without business logic.
- Domain models are easy to locate and reuse.
