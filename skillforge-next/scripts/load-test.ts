const baseUrl = process.env.BASE_URL ?? "http://localhost:3002";
const targetPath = process.env.TARGET_PATH ?? "/api/health";
const durationSeconds = Number(process.env.DURATION_SECONDS ?? "10");
const concurrency = Number(process.env.CONCURRENCY ?? "5");
const timeoutMs = Number(process.env.TIMEOUT_MS ?? "5000");

const runRequest = async (): Promise<{ ok: boolean; durationMs: number }> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}${targetPath}`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    await response.arrayBuffer();
    return { ok: response.ok, durationMs: Date.now() - started };
  } catch {
    return { ok: false, durationMs: Date.now() - started };
  } finally {
    clearTimeout(timeout);
  }
};

const runWorker = async (
  stopAt: number,
  durations: number[],
  counters: { requests: number; errors: number },
) => {
  while (Date.now() < stopAt) {
    const result = await runRequest();
    durations.push(result.durationMs);
    counters.requests += 1;
    if (!result.ok) {
      counters.errors += 1;
    }
  }
};

const percentile = (values: number[], p: number): number => {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.floor((sorted.length - 1) * p),
  );
  return sorted[index];
};

const run = async () => {
  const stopAt = Date.now() + Math.max(1, durationSeconds) * 1000;
  const durations: number[] = [];
  const counters = { requests: 0, errors: 0 };

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () =>
      runWorker(stopAt, durations, counters),
    ),
  );

  const total = counters.requests;
  const errors = counters.errors;
  const avg =
    durations.reduce((sum, value) => sum + value, 0) /
    Math.max(1, durations.length);

  console.log("Load test summary");
  console.log(`Target: ${baseUrl}${targetPath}`);
  console.log(`Duration: ${durationSeconds}s, Concurrency: ${concurrency}`);
  console.log(`Requests: ${total}, Errors: ${errors}`);
  console.log(`Avg: ${avg.toFixed(1)}ms`);
  console.log(`p50: ${percentile(durations, 0.5)}ms`);
  console.log(`p95: ${percentile(durations, 0.95)}ms`);
  console.log(`p99: ${percentile(durations, 0.99)}ms`);

  if (errors > 0) {
    process.exit(1);
  }
};

void run();
