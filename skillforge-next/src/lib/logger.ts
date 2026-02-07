import { env } from "@/lib/env";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const resolveLogLevel = (): LogLevel => {
  const raw = env.LOG_LEVEL?.toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return env.NODE_ENV === "production" ? "info" : "debug";
};

const CURRENT_LEVEL = resolveLogLevel();

const shouldLog = (level: LogLevel): boolean =>
  LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[CURRENT_LEVEL];

const safeSerialize = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ msg: "Failed to serialize log payload" });
  }
};

export const log = (level: LogLevel, message: string, data?: Record<string, unknown>): void => {
  if (!shouldLog(level)) {
    return;
  }
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(data ? { data } : {}),
  };
  const serialized = safeSerialize(payload);
  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
};

export const logDebug = (message: string, data?: Record<string, unknown>): void =>
  log("debug", message, data);

export const logInfo = (message: string, data?: Record<string, unknown>): void =>
  log("info", message, data);

export const logWarn = (message: string, data?: Record<string, unknown>): void =>
  log("warn", message, data);

export const logError = (message: string, data?: Record<string, unknown>): void =>
  log("error", message, data);
