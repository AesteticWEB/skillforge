import { validateEnv } from "../src/lib/env";

try {
  validateEnv(process.env);
  console.log("Environment OK");
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Invalid environment configuration",
  );
  process.exit(1);
}
