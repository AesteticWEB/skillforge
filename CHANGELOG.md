# Changelog

All notable changes to this project will be documented in this file.

## [1.0.3] - 2026-02-07

### Added

- Frontend error telemetry (optional backend endpoint).
- Ops docs (SLO, runbook, performance budgets).
- Release workflow for artifact builds.

## [1.0.2] - 2026-02-07

### Added

- CI format check and security policy.
- Documentation for backend + mock backend usage.

### Changed

- Angular dependencies updated to latest 21.1.x patch.
- Mock backend cookie aligned with production session cookie.

## [1.0.1] - 2026-02-07

### Fixed

- Preserve local items, scenarios, and exams while allowing backend-only additions.
- Persist progress to localStorage even when remote sync is enabled.
- Stabilize onboarding + login flow in e2e (skip detection and unique users).

### Added

- Mock backend script for CI e2e runs.

## [1.0.0] - 2026-02-02

### Added

- Feature-Sliced structure with shared UI kit and widgets.
- Signals-based AppStore with localStorage persistence.
- Simulator, skills, analytics, onboarding flows with mock APIs.
- Domain events, achievements, notifications, and debug tooling.
- UI polish: empty states, toasts, and skeleton loading.
