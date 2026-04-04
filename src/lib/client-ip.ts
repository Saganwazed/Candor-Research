import { NextRequest } from "next/server";

/**
 * Extract the client IP from the request.
 *
 * Security notes:
 * - request.ip is set by Vercel from the connecting socket — most trustworthy.
 * - x-forwarded-for: the FIRST IP is set by the outermost trusted proxy.
 *   The LAST IP is attacker-controlled. Always take the first.
 * - x-real-ip is NOT trusted — it can be spoofed by the client unless
 *   a known trusted proxy (like Nginx) overwrites it.
 */
export function getClientIp(request: NextRequest): string {
  // Vercel sets request.ip from the actual connecting IP
  if (request.ip) return request.ip;

  // First IP in x-forwarded-for is from the outermost trusted proxy
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}
