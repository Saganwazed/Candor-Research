import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE = "candor_csrf";

/**
 * Next.js middleware: sets a CSRF token cookie on every request.
 * Mutating API endpoints (POST/PATCH/DELETE) must verify that the
 * x-csrf-token header matches this cookie value (double-submit pattern).
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Set CSRF cookie if not already present
  if (!request.cookies.get(CSRF_COOKIE)) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");

    response.cookies.set(CSRF_COOKIE, token, {
      httpOnly: false, // JS must read this to send in header
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/og-image).*)"],
};
