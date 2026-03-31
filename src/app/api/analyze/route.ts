import { NextRequest, NextResponse } from "next/server";
import { AnalysisResponseSchema } from "@/lib/schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompt";
import { getMockAnalysis } from "@/lib/mock";
import { checkRateLimit } from "@/lib/rate-limit";

// Force Node.js runtime — jsdom requires Node APIs
export const runtime = "nodejs";
export const maxDuration = 30;
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_ARTICLE_WORDS = 9000;
const MIN_EXTRACTED_WORDS = 50; // ~300 words threshold for meaningful content
const URL_FETCH_TIMEOUT_MS = 5000;
const AI_INFERENCE_TIMEOUT_MS = 15000;
const MIN_TEXT_CHARS = 150;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function truncateToWordLimit(text: string, maxWords: number): { text: string; wasTruncated: boolean } {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) {
    return { text, wasTruncated: false };
  }
  return { text: words.slice(0, maxWords).join(" "), wasTruncated: true };
}

async function fetchAndExtractArticle(url: string): Promise<{ text: string; title: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NewsLens/1.0; +https://newslens.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    // Dynamic import to avoid crashing Vercel serverless functions
    const { JSDOM } = await import("jsdom");
    const { Readability } = await import("@mozilla/readability");
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      throw new Error("Could not extract article content");
    }

    const cleanedText = article.textContent
      .replace(/\s+/g, " ")
      .trim();

    const wordCount = cleanedText.split(/\s+/).length;
    if (wordCount < MIN_EXTRACTED_WORDS) {
      throw new Error("INSUFFICIENT_CONTENT");
    }

    return { text: cleanedText, title: article.title || "" };
  } finally {
    clearTimeout(timeout);
  }
}

async function analyzeWithAI(
  articleText: string,
  wasTruncated: boolean,
  retryCount = 0
): Promise<ReturnType<typeof AnalysisResponseSchema.parse>> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  
  if (!apiKey) {
    // Use mock mode when no API key is configured
    return getMockAnalysis(articleText);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
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
  const jsonText = response.text().trim();

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
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip);
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

    const body = await request.json();
    const { mode, url, text } = body as {
      mode: "url" | "text";
      url?: string;
      text?: string;
    };

    let articleText: string;
    let wasTruncated = false;

    if (mode === "url") {
      // Validate URL
      if (!url || !/^https?:\/\/.+\..+/.test(url)) {
        return NextResponse.json(
          {
            error:
              "That doesn't look like a valid URL. Try pasting the article text instead.",
          },
          { status: 400 }
        );
      }

      try {
        const extracted = await fetchAndExtractArticle(url);
        const truncated = truncateToWordLimit(extracted.text, MAX_ARTICLE_WORDS);
        articleText = truncated.text;
        wasTruncated = truncated.wasTruncated;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (message === "INSUFFICIENT_CONTENT") {
          return NextResponse.json(
            {
              error:
                "We couldn't extract enough content from that URL — it may be paywalled or restricted. Try pasting the text directly.",
            },
            { status: 422 }
          );
        }
        return NextResponse.json(
          {
            error:
              "We couldn't read that article — it may be paywalled or restricted. Try pasting the text directly.",
          },
          { status: 422 }
        );
      }
    } else if (mode === "text") {
      if (!text || text.length < MIN_TEXT_CHARS) {
        return NextResponse.json(
          {
            error:
              "Paste the full article text — this looks too short.",
          },
          { status: 400 }
        );
      }
      const truncated = truncateToWordLimit(text, MAX_ARTICLE_WORDS);
      articleText = truncated.text;
      wasTruncated = truncated.wasTruncated;
    } else {
      return NextResponse.json(
        { error: "Invalid mode. Use 'url' or 'text'." },
        { status: 400 }
      );
    }

    // Run AI analysis
    try {
      const analysis = await analyzeWithAI(articleText, wasTruncated);
      return NextResponse.json(
        { analysis },
        {
          headers: {
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          },
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
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
