import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.spec.ts"],
    setupFiles: ["tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "src/lib/env.ts",
        "src/lib/rate-limit.ts",
        "src/lib/api-logger.ts",
        "src/lib/logger.ts",
        "src/lib/validation.ts",
        "src/lib/auth.ts",
        "src/lib/password.ts",
        "src/lib/route-params.ts",
        "src/lib/session-cookie.ts",
        "src/app/api/health/route.ts",
        "src/app/api/telemetry/route.ts",
      ],
      exclude: ["src/lib/prisma.ts", "src/lib/server-auth.ts"],
      lines: 70,
      statements: 70,
      functions: 70,
      branches: 60,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
