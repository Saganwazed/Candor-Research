import { createHmac } from "crypto";
import type { AnalysisResponse } from "./schema";

const SECRET = process.env.SHARE_SECRET || process.env.GOOGLE_GEMINI_API_KEY || "candor-dev";

export function signAnalysis(analysis: AnalysisResponse): string {
  return createHmac("sha256", SECRET)
    .update(JSON.stringify(analysis))
    .digest("hex");
}

export function verifyAnalysis(analysis: AnalysisResponse, token: string): boolean {
  const expected = signAnalysis(analysis);
  if (expected.length !== token.length) return false;
  // Constant-time comparison
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return mismatch === 0;
}
