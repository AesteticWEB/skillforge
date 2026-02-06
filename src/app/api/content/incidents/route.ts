import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const incidents = await prisma.incident.findMany({
    where: { enabled: true },
    include: { options: true },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ ok: true, incidents });
}
