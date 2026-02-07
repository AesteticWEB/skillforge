import { exec } from "node:child_process";
import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";

const execAsync = promisify(exec);

const port = Number(process.env.LOAD_TEST_PORT ?? "3103");
const baseUrl = `http://127.0.0.1:${port}`;

const env = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: process.env.DATABASE_URL ?? "file:./load-test.db",
  SESSION_SECRET:
    process.env.SESSION_SECRET ?? "load-test-secret-32-characters-minimum",
  LOG_LEVEL: "error",
  BASE_URL: baseUrl,
};

const runCommand = async (command: string) => {
  await execAsync(command, {
    cwd: process.cwd(),
    env,
  });
};

const waitForHealth = async () => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // ignore
    }
    await delay(1000);
  }
  throw new Error("Backend did not become healthy in time");
};

const run = async () => {
  await runCommand("npx prisma migrate deploy");
  await runCommand("npx prisma db seed");

  const server = spawn("npm", ["run", "dev", "--", "-p", String(port)], {
    cwd: process.cwd(),
    env,
    stdio: "pipe",
  });

  let serverOutput = "";
  server.stdout?.on("data", (chunk) => {
    serverOutput += String(chunk);
  });
  server.stderr?.on("data", (chunk) => {
    serverOutput += String(chunk);
  });

  try {
    await waitForHealth();
    await runCommand("tsx scripts/load-test.ts");
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Load test failed",
    );
    if (serverOutput) {
      console.error(serverOutput.slice(-4000));
    }
    process.exitCode = 1;
  } finally {
    server.kill("SIGTERM");
  }
};

void run();
