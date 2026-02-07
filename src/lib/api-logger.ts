import { NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";

export type ApiLogContext = {
  requestId: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string | null;
};

const getClientIp = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
};

const getRequestId = (request: Request): string => {
  const incoming = request.headers.get("x-request-id");
  if (incoming && incoming.trim().length > 0) {
    return incoming.trim();
  }
  return crypto.randomUUID();
};

export const withApiLogging = async (
  request: Request,
  handler: (context: ApiLogContext) => Promise<Response>,
): Promise<Response> => {
  const requestId = getRequestId(request);
  const url = new URL(request.url);
  const context: ApiLogContext = {
    requestId,
    method: request.method,
    path: url.pathname,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  };
  const startedAt = Date.now();

  try {
    const response = await handler(context);
    response.headers.set("x-request-id", requestId);
    logInfo("api_request", {
      requestId,
      method: context.method,
      path: context.path,
      status: response.status,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    logError("api_error", {
      requestId,
      method: context.method,
      path: context.path,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { ok: false, error: "Internal Server Error", requestId },
      { status: 500 },
    );
  }
};
