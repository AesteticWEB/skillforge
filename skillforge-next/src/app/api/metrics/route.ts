import { NextResponse } from "next/server";
import { metricsRegistry } from "@/lib/metrics";
import { env } from "@/lib/env";
import { withApiLogging } from "@/lib/api-logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiLogging(request, async () => {
    if (env.METRICS_TOKEN) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${env.METRICS_TOKEN}`) {
        return NextResponse.json(
          { ok: false, error: "Unauthorized" },
          { status: 401 },
        );
      }
    }

    const body = await metricsRegistry.metrics();
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": metricsRegistry.contentType,
      },
    });
  });
}
