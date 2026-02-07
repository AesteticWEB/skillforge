import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api-logger";
import { rateLimit } from "@/lib/rate-limit";
import { logInfo, logWarn } from "@/lib/logger";

export const runtime = "nodejs";

type TelemetryPayload = {
  level: "error" | "warn" | "info";
  message: string;
  context?: string;
  stack?: string;
  occurredAt: string;
};

const MAX_MESSAGE_LENGTH = 500;
const MAX_CONTEXT_LENGTH = 200;
const MAX_STACK_LENGTH = 2000;

const clampText = (value: unknown, max: number): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, max);
};

const isTelemetryLevel = (
  value: unknown,
): value is TelemetryPayload["level"] =>
  value === "error" || value === "warn" || value === "info";

export async function POST(request: Request) {
  return withApiLogging(request, async () => {
    const limit = rateLimit(request, "telemetry", {
      windowMs: 60_000,
      max: 30,
    });
    if (!limit.ok) {
      return limit.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logWarn("telemetry.invalid_json");
      return NextResponse.json(
        { ok: false, error: "Invalid payload" },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      logWarn("telemetry.invalid_body");
      return NextResponse.json(
        { ok: false, error: "Invalid payload" },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;
    const level = isTelemetryLevel(payload.level) ? payload.level : "error";
    const message = clampText(payload.message, MAX_MESSAGE_LENGTH);
    const occurredAt = clampText(payload.occurredAt, 60);
    if (!message || !occurredAt) {
      logWarn("telemetry.missing_fields");
      return NextResponse.json(
        { ok: false, error: "Invalid payload" },
        { status: 400 },
      );
    }

    const context = clampText(payload.context, MAX_CONTEXT_LENGTH);
    const stack = clampText(payload.stack, MAX_STACK_LENGTH);

    logInfo("telemetry.reported", {
      level,
      message,
      context,
      stack,
      occurredAt,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ ok: true });
  });
}
