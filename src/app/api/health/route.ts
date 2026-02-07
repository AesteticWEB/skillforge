import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api-logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiLogging(request, async () => {
    const version =
      process.env.APP_VERSION ?? process.env.npm_package_version ?? "unknown";

    return NextResponse.json({
      ok: true,
      status: "ok",
      version,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    });
  });
}
