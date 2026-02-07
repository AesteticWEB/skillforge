import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const resolveDatabasePath = (): string => {
  const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!dbUrl.startsWith("file:")) {
    throw new Error("Only file-based SQLite DATABASE_URL is supported.");
  }
  const rawPath = dbUrl.slice("file:".length);
  return resolve(rawPath);
};

const getArgValue = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
};

const resolveLatestBackup = (): string | undefined => {
  const backupsDir = resolve(process.cwd(), "backups");
  if (!existsSync(backupsDir)) {
    return undefined;
  }
  const entries = readdirSync(backupsDir)
    .filter((name) => name.endsWith(".db"))
    .map((name) => ({
      name,
      time: statSync(resolve(backupsDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.time - a.time);
  if (!entries.length) {
    return undefined;
  }
  return resolve(backupsDir, entries[0].name);
};

const dbPath = resolveDatabasePath();
const requested = getArgValue("--file") ?? process.env.BACKUP_FILE;
const backupPath = requested ? resolve(requested) : resolveLatestBackup();

if (!backupPath) {
  throw new Error(
    "Backup file not provided. Use --file <path> or set BACKUP_FILE.",
  );
}
if (!existsSync(backupPath)) {
  throw new Error(`Backup file not found at ${backupPath}`);
}

copyFileSync(backupPath, dbPath);
console.log(`Database restored from ${backupPath} -> ${dbPath}`);
