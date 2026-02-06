import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await requireSession();
  if (!guard.ok) {
    return guard.response;
  }

  const body = await request.json().catch(() => null);
  const currentPassword =
    typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const confirm = typeof body?.confirm === "string" ? body.confirm : "";

  if (!currentPassword || !newPassword || !confirm) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  if (newPassword !== confirm) {
    return NextResponse.json({ ok: false, error: "Passwords do not match" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: guard.session.sub } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    return NextResponse.json({ ok: false, error: "Invalid current password" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
