type CheckResult = {
  name: string;
  ok: boolean;
  message?: string;
  durationMs: number;
};

type EndpointCheck = {
  name: string;
  path: string;
  validate: (payload: unknown) => string | null;
};

const baseUrl = process.env.BASE_URL ?? "http://localhost:3002";
const timeoutMs = Number(process.env.TIMEOUT_MS ?? "5000");

const ensureObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";

const buildChecks = (): EndpointCheck[] => [
  {
    name: "health",
    path: "/api/health",
    validate: (payload) => {
      if (!ensureObject(payload)) {
        return "payload is not an object";
      }
      if (payload.ok !== true) {
        return "ok !== true";
      }
      if (typeof payload.status !== "string") {
        return "missing status";
      }
      if (typeof payload.timestamp !== "string") {
        return "missing timestamp";
      }
      return null;
    },
  },
  {
    name: "items",
    path: "/api/content/items",
    validate: (payload) => {
      if (!ensureObject(payload)) {
        return "payload is not an object";
      }
      if (payload.ok !== true) {
        return "ok !== true";
      }
      if (!Array.isArray(payload.items)) {
        return "items is not an array";
      }
      return null;
    },
  },
  {
    name: "scenarios",
    path: "/api/content/scenarios",
    validate: (payload) => {
      if (!ensureObject(payload)) {
        return "payload is not an object";
      }
      if (payload.ok !== true) {
        return "ok !== true";
      }
      if (!Array.isArray(payload.scenarios)) {
        return "scenarios is not an array";
      }
      return null;
    },
  },
  {
    name: "exams",
    path: "/api/content/exams",
    validate: (payload) => {
      if (!ensureObject(payload)) {
        return "payload is not an object";
      }
      if (payload.ok !== true) {
        return "ok !== true";
      }
      if (!Array.isArray(payload.exams)) {
        return "exams is not an array";
      }
      return null;
    },
  },
  {
    name: "questions",
    path: "/api/content/questions",
    validate: (payload) => {
      if (!ensureObject(payload)) {
        return "payload is not an object";
      }
      if (payload.ok !== true) {
        return "ok !== true";
      }
      if (!Array.isArray(payload.questions)) {
        return "questions is not an array";
      }
      return null;
    },
  },
];

const fetchJson = async (
  path: string,
): Promise<{ status: number; payload: unknown; durationMs: number }> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    return {
      status: response.status,
      payload,
      durationMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const run = async () => {
  const checks = buildChecks();
  const results: CheckResult[] = [];

  for (const check of checks) {
    try {
      const { status, payload, durationMs } = await fetchJson(check.path);
      if (status < 200 || status >= 300) {
        results.push({
          name: check.name,
          ok: false,
          message: `HTTP ${status}`,
          durationMs,
        });
        continue;
      }

      const validation = check.validate(payload);
      if (validation) {
        results.push({
          name: check.name,
          ok: false,
          message: validation,
          durationMs,
        });
        continue;
      }

      results.push({ name: check.name, ok: true, durationMs });
    } catch (error) {
      results.push({
        name: check.name,
        ok: false,
        message: error instanceof Error ? error.message : "Unknown error",
        durationMs: 0,
      });
    }
  }

  const failed = results.filter((result) => !result.ok);
  for (const result of results) {
    if (result.ok) {
      console.log(
        `[ok] ${result.name} (${result.durationMs}ms)`,
      );
    } else {
      console.error(
        `[fail] ${result.name}: ${result.message ?? "Unknown error"}`,
      );
    }
  }

  if (failed.length) {
    console.error(`Contract checks failed: ${failed.length}/${results.length}`);
    process.exit(1);
  }

  console.log(`All contract checks passed (${results.length}).`);
};

void run();
