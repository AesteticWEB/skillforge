import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const run = async () => {
  await execAsync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    env: process.env,
  });
  await execAsync("npx prisma db seed", {
    cwd: process.cwd(),
    env: process.env,
  });
  console.log("Database migrations and seed completed");
};

void run();
