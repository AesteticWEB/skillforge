import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const items = await prisma.item.findMany({
    where: { enabled: true },
    orderBy: { title: "asc" },
  });

  return NextResponse.json({ ok: true, items });
}
