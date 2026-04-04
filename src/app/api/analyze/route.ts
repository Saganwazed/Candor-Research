import { NextRequest, NextResponse } from "next/server";
import { AnalysisResponseSchema } from "@/lib/schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompt";
import { checkRateLimit } from "@/lib/rate-limit";
import { signAnalysis } from "@/lib/sign";
import { getClientIp } from "@/lib/client-ip";
import { parseJsonBody } from "@/lib/safe-body";

export const runtime = "nodejs";
export const maxDuration = 30;
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_ARTICLE_WORDS = 9000;
const AI_INFERENCE_TIMEOUT_MS = 25000;
const MIN_TEXT_CHARS = 150;
const MIN_TEXT_CHARS_TWITTER = 10;
const MAX_BODY_BYTES = 500_000;

function truncateToWordLimit(text: string, maxWords: number): { text: string; wasTruncated: boolean } {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) {
    return { text, wasTruncated: false };
  }
  return { text: words.slice(0, maxWords).join(" "), wasTruncated: true };
}


async function analyzeWithAI(
  articleText: string,
  wasTruncated: boolean,
  retryCount = 0
): Promise<ReturnType<typeof AnalysisResponseSchema.parse>> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  const result = await Promise.race([
    model.generateContent(buildUserPrompt(articleText, wasTruncated)),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI_TIMEOUT")), AI_INFERENCE_TIMEOUT_MS)
    ),
  ]);

  const response = result.response;
  let jsonText = response.text().trim();

  // Strip markdown code fences if Gemini wraps the response
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
    return AnalysisResponseSchema.parse(parsed);
  } catch {
    if (retryCount < 1) {
      return analyzeWithAI(articleText, wasTruncated, retryCount + 1);
    }
    throw new Error("AI_PARSE_FAILURE");
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (uses fixed getClientIp — no IP spoofing)
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

    // Parse body with enforced byte limit (not just Content-Length header)
    let body: { mode: "text"; text?: string; isTwitter?: boolean };
    try {
      body = await parseJsonBody(request, MAX_BODY_BYTES);
    } catch (err) {
      if (err instanceof Error && err.message === "BODY_TOO_LARGE") {
        return NextResponse.json({ error: "Request too large." }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { mode, text, isTwitter } = body;
    const minChars = isTwitter ? MIN_TEXT_CHARS_TWITTER : MIN_TEXT_CHARS;

    if (mode !== "text" || !text || text.length < minChars) {
      return NextResponse.json(
        {
          error:
            isTwitter
              ? "Could not retrieve enough content from this tweet."
              : "Paste the full article text — this looks too short.",
        },
        { status: 400 }
      );
    }
    const truncated = truncateToWordLimit(text, MAX_ARTICLE_WORDS);

    try {
      const analysis = await analyzeWithAI(truncated.text, truncated.wasTruncated);
      return NextResponse.json(
        { analysis, token: signAnalysis(analysis) },
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
              "Unable to create report. The analysis service is not configured.",
          },
          { status: 503 }
        );
      }
      if (message === "AI_TIMEOUT") {
        return NextResponse.json(
          {
            error:
              "The analysis took too long. Try again or paste a shorter article.",
          },
          { status: 504 }
        );
      }
      if (message === "AI_PARSE_FAILURE") {
        return NextResponse.json(
          {
            error:
              "We couldn't generate a valid report for this article. Try again.",
          },
          { status: 502 }
        );
      }
      console.error("Analysis error:", err);
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
