import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/api-logger";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiLogging(request, async () => {
    const limiter = rateLimit(request, "content:incidents", { windowMs: 60_000, max: 120 });
    if (!limiter.ok) {
      return limiter.response;
    }
    const incidents = await prisma.incident.findMany({
      where: { enabled: true },
      include: { options: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ ok: true, incidents });
  });
}
