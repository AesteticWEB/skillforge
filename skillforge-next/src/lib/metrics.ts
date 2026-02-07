import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

type MetricsState = {
  registry: Registry;
  requestCounter: Counter<"method" | "path" | "status">;
  requestDuration: Histogram<"method" | "path" | "status">;
};

const globalForMetrics = globalThis as unknown as { metrics?: MetricsState };

const createMetrics = (): MetricsState => {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: "skillforge_" });

  const requestCounter = new Counter({
    name: "skillforge_http_requests_total",
    help: "Total HTTP requests",
    labelNames: ["method", "path", "status"],
    registers: [registry],
  });

  const requestDuration = new Histogram({
    name: "skillforge_http_request_duration_ms",
    help: "HTTP request duration in ms",
    labelNames: ["method", "path", "status"],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
    registers: [registry],
  });

  return { registry, requestCounter, requestDuration };
};

const metricsState = globalForMetrics.metrics ?? createMetrics();
if (!globalForMetrics.metrics) {
  globalForMetrics.metrics = metricsState;
}

const normalizePath = (path: string): string =>
  path
    .split("/")
    .map((segment) => {
      if (!segment) {
        return segment;
      }
      if (/^[0-9]+$/.test(segment)) {
        return ":id";
      }
      if (/^[0-9a-f-]{16,}$/i.test(segment)) {
        return ":id";
      }
      return segment;
    })
    .join("/");

export const recordRequest = (
  method: string,
  path: string,
  status: number,
  durationMs: number,
): void => {
  const normalizedPath = normalizePath(path);
  metricsState.requestCounter.inc({
    method,
    path: normalizedPath,
    status: String(status),
  });
  metricsState.requestDuration.observe(
    {
      method,
      path: normalizedPath,
      status: String(status),
    },
    durationMs,
  );
};

export const metricsRegistry = metricsState.registry;
