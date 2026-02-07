# Performance Checks

Use the built-in load test script for quick sanity checks.

```bash
BASE_URL=http://localhost:3002 \
TARGET_PATH=/api/content/items \
DURATION_SECONDS=20 \
CONCURRENCY=10 \
npm run load-test
```

Tips:

- Keep `LOG_LEVEL=warn` to reduce log overhead during tests.
- Prefer `/api/content/items` for read-heavy testing.
- Treat any errors as failures and investigate upstream logs.
