import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/api-logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiLogging(request, async () => {
    const items = await prisma.item.findMany({
      where: { enabled: true },
      orderBy: { title: "asc" },
    });

    return NextResponse.json({ ok: true, items });
  });
}
