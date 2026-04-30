import { NextRequest, NextResponse } from "next/server";
import { ClaimVerificationReportSchema } from "@/lib/claim-verification-schema";
import {
  CLAIM_EXTRACTION_SYSTEM_PROMPT,
  CLAIM_VERIFICATION_SYSTEM_PROMPT,
  buildClaimExtractionPrompt,
  buildClaimVerificationPrompt,
} from "@/lib/claim-verification-prompt";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { parseJsonBody } from "@/lib/safe-body";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_ARTICLE_WORDS = 9000;
const AI_INFERENCE_TIMEOUT_MS = 25000;
const MAX_BODY_BYTES = 500_000;

function truncateToWordLimit(
  text: string,
  maxWords: number
): { text: string; wasTruncated: boolean } {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) {
    return { text, wasTruncated: false };
  }
  return { text: words.slice(0, maxWords).join(" "), wasTruncated: true };
}

interface ExtractedClaim {
  id: string;
  text: string;
  sources: string[];
  entities?: string[];
  numerical_data?: Record<string, unknown>;
  timeframe?: string;
}

async function extractClaimsWithAI(
  articleText: string,
  retryCount = 0
): Promise<ExtractedClaim[]> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: CLAIM_EXTRACTION_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  const result = await Promise.race([
    model.generateContent(buildClaimExtractionPrompt(articleText)),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI_TIMEOUT")), AI_INFERENCE_TIMEOUT_MS)
    ),
  ]);

  const response = result.response;
  let jsonText = response.text().trim();

  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.substring(7);
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.substring(3);
  }
  if (jsonText.endsWith("```")) {
    jsonText = jsonText.substring(0, jsonText.length - 3);
  }
  jsonText = jsonText.trim();

  if (!jsonText) {
    throw new Error("Unexpected empty response from AI");
  }

  try {
    const parsed = JSON.parse(jsonText);
    return parsed.claims || [];
  } catch {
    if (retryCount < 1) {
      return extractClaimsWithAI(articleText, retryCount + 1);
    }
    throw new Error("AI_PARSE_FAILURE");
  }
}

async function verifyClaimsWithAI(
  claims: ExtractedClaim[],
  articleText: string,
  retryCount = 0
): Promise<ReturnType<typeof ClaimVerificationReportSchema.parse>> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: CLAIM_VERIFICATION_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8000,
      responseMimeType: "application/json",
    },
  });

  const result = await Promise.race([
    model.generateContent(buildClaimVerificationPrompt(claims, articleText)),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI_TIMEOUT")), AI_INFERENCE_TIMEOUT_MS)
    ),
  ]);

  const response = result.response;
  let jsonText = response.text().trim();

  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.substring(7);
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.substring(3);
  }
  if (jsonText.endsWith("```")) {
    jsonText = jsonText.substring(0, jsonText.length - 3);
  }
  jsonText = jsonText.trim();

  if (!jsonText) {
    throw new Error("Unexpected empty response from AI");
  }

  try {
    const parsed = JSON.parse(jsonText);
    const transformedReport = {
      claims: parsed.verified_claims || [],
      graph: parsed.graph || { nodes: [], edges: [] },
      summary: parsed.summary || "",
      key_conflicts: parsed.key_conflicts || [],
      analysis_confidence: parsed.analysis_confidence || "Medium",
    };
    return ClaimVerificationReportSchema.parse(transformedReport);
  } catch {
    if (retryCount < 1) {
      return verifyClaimsWithAI(claims, articleText, retryCount + 1);
    }
    throw new Error("AI_PARSE_FAILURE");
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "You've reached the analysis limit. Try again in about an hour.",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    }

    let body: { text: string };
    try {
      body = await parseJsonBody(request, MAX_BODY_BYTES);
    } catch (err) {
      if (err instanceof Error && err.message === "BODY_TOO_LARGE") {
        return NextResponse.json({ error: "Request too large." }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { text } = body;

    if (!text || text.length < 150) {
      return NextResponse.json(
        { error: "Article text too short for claim verification." },
        { status: 400 }
      );
    }

    const truncated = truncateToWordLimit(text, MAX_ARTICLE_WORDS);

    try {
      const extractedClaims = await extractClaimsWithAI(truncated.text);

      if (!extractedClaims || extractedClaims.length === 0) {
        return NextResponse.json(
          {
            error:
              "No verifiable claims found in the article. Try a different article.",
          },
          { status: 400 }
        );
      }

      const verificationReport = await verifyClaimsWithAI(
        extractedClaims,
        truncated.text
      );

      return NextResponse.json(
        { report: verificationReport },
        {
          headers: {
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          },
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message === "API_KEY_MISSING") {
        return NextResponse.json(
          {
            error:
              "Unable to verify claims. The analysis service is not configured.",
          },
          { status: 503 }
        );
      }
      if (message === "AI_TIMEOUT") {
        return NextResponse.json(
          {
            error:
              "The verification took too long. Try again or paste a shorter article.",
          },
          { status: 504 }
        );
      }
      if (message === "AI_PARSE_FAILURE") {
        return NextResponse.json(
          {
            error:
              "We couldn't generate a valid verification report. Try again.",
          },
          { status: 502 }
        );
      }
      console.error("Claim verification error:", err);
      return NextResponse.json(
        { error: "Something went wrong. Try again." },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
