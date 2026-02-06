import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profession = searchParams.get("profession");
  const stage = searchParams.get("stage");

  const exams = await prisma.exam.findMany({
    where: {
      enabled: true,
      ...(profession ? { profession } : {}),
      ...(stage ? { stage } : {}),
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ ok: true, exams });
}
