import { createHmac, timingSafeEqual } from "crypto";
import type { AnalysisResponse } from "./schema";

/**
 * SHARE_SECRET must be a dedicated, high-entropy secret (min 32 random bytes).
 * No fallback to API keys or hardcoded strings — fail hard if missing.
 */
function getSecret(): string {
  const secret = process.env.SHARE_SECRET;
  if (!secret) {
    throw new Error(
      "SHARE_SECRET environment variable is required. " +
      "Generate one with: openssl rand -base64 32"
    );
  }
  return secret;
}

export function signAnalysis(analysis: AnalysisResponse): string {
  return createHmac("sha256", getSecret())
    .update(JSON.stringify(analysis))
    .digest("hex");
}

export function verifyAnalysis(analysis: AnalysisResponse, token: string): boolean {
  const expected = signAnalysis(analysis);
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}
