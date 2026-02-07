import { exec } from "node:child_process";
import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";

const execAsync = promisify(exec);

const port = Number(process.env.E2E_PORT ?? "3102");
const baseUrl = `http://127.0.0.1:${port}`;
const e2eLogin = process.env.E2E_LOGIN ?? "e2e_user";
const e2ePassword = process.env.E2E_PASSWORD ?? "Password12";

const env = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: process.env.DATABASE_URL ?? "file:./e2e.db",
  SESSION_SECRET:
    process.env.SESSION_SECRET ?? "e2e-secret-32-characters-minimum",
  LOG_LEVEL: "error",
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

const extractCookie = (response: Response): string => {
  const raw = response.headers.get("set-cookie");
  if (!raw) {
    throw new Error("Missing set-cookie header");
  }
  return raw.split(";")[0] ?? "";
};

const json = (body: unknown) => ({
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const run = async () => {
  await runCommand("npx prisma db push");
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

    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      ...json({ login: e2eLogin, password: e2ePassword }),
    });

    if (!registerResponse.ok && registerResponse.status !== 409) {
      throw new Error(`Register failed: ${registerResponse.status}`);
    }

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      ...json({ login: e2eLogin, password: e2ePassword }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const cookie = extractCookie(loginResponse);

    const progressResponse = await fetch(`${baseUrl}/api/progress`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({ stateJson: "{}" }),
    });

    if (!progressResponse.ok) {
      throw new Error(`Progress update failed: ${progressResponse.status}`);
    }

    const itemsResponse = await fetch(`${baseUrl}/api/content/items`, {
      headers: { cookie },
    });
    if (!itemsResponse.ok) {
      throw new Error(`Content items failed: ${itemsResponse.status}`);
    }

    const metricsResponse = await fetch(`${baseUrl}/api/metrics`);
    if (!metricsResponse.ok) {
      throw new Error(`Metrics failed: ${metricsResponse.status}`);
    }

    console.log("E2E checks passed");
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "E2E failed",
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
