import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionSecret, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const isAdminRoute = (pathname: string) =>
  pathname.startsWith("/admin") || pathname.startsWith("/debug");

const isProtectedRoute = (pathname: string) => pathname.startsWith("/account");

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isAdminRoute(pathname) && !isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const session = await verifySessionToken(token, getSessionSecret());
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAdminRoute(pathname) && (session.role !== "admin" || session.login !== "admin1")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/debug/:path*", "/account/:path*"],
};
