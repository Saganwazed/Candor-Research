import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.SHARE_SECRET;

const COOKIE_NAME = "candor_session";

function getSecret(): string {
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET (or SHARE_SECRET) environment variable is required");
  }
  return SESSION_SECRET;
}

function signValue(value: string): string {
  return createHmac("sha256", getSecret())
    .update(value)
    .digest("base64url");
}

/**
 * Read and verify the signed session cookie.
 * Returns the session ID if valid, null otherwise.
 */
export function getSignedSessionId(request: NextRequest): string | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const dotIndex = raw.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const value = raw.substring(0, dotIndex);
  const signature = raw.substring(dotIndex + 1);
  const expected = signValue(value);

  // Constant-time comparison
  if (signature.length !== expected.length) return null;
  try {
    const sigBuf = Buffer.from(signature, "utf-8");
    const expBuf = Buffer.from(expected, "utf-8");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }

  return value;
}

/**
 * Set a signed, HttpOnly session cookie on the response.
 */
export function setSignedSessionCookie(
  response: NextResponse,
  sessionId: string
): void {
  const signed = `${sessionId}.${signValue(sessionId)}`;
  response.cookies.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}
