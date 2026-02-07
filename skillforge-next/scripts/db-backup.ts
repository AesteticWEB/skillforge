import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const resolveDatabasePath = (): string => {
  const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!dbUrl.startsWith("file:")) {
    throw new Error("Only file-based SQLite DATABASE_URL is supported.");
  }
  const rawPath = dbUrl.slice("file:".length);
  return resolve(rawPath);
};

const dbPath = resolveDatabasePath();
if (!existsSync(dbPath)) {
  throw new Error(`Database file not found at ${dbPath}`);
}

const backupsDir = resolve(process.cwd(), "backups");
mkdirSync(backupsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = resolve(backupsDir, `skillforge-${timestamp}.db`);

copyFileSync(dbPath, backupPath);
console.log(`Backup created: ${backupPath}`);
