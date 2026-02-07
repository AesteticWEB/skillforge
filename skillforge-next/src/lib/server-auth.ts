import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionSecret, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import type { SessionPayload } from "@/lib/auth";

export const requireSession = async (): Promise<
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse }
> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  const session = await verifySessionToken(token, getSessionSecret());
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, session };
};

export const requireAdmin = async (): Promise<
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse }
> => {
  const guard = await requireSession();
  if (!guard.ok) {
    return guard;
  }
  const { session } = guard;
  if (session.role !== "admin" || session.login !== "admin1") {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, session };
};
