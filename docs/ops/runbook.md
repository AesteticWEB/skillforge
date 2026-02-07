# Runbook

## Release

```bash
npm install
npm run lint
npm test
npm run test:e2e
npm run build
```

Deploy `dist/skillforge` to static hosting and verify `/`, `/skills`, `/analytics`, and `/debug`.

## Incident triage

- Check browser console for `SkillForge` errors.
- Review stored telemetry (if backend is enabled).
- Confirm backend health: `GET /api/health`.

## Rollback

- Re-deploy the last known-good `dist/skillforge` build.
- If telemetry is noisy, disable locally via
  `localStorage.setItem('skillforge.telemetry.disabled', 'true')`.
