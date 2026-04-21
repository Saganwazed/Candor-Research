import { NextRequest, NextResponse } from "next/server";
import {
  ClaimGraphSchema,
  GraphReasoningSchema,
  GraphAnalysisResponseSchema,
  type ClaimGraph,
  type GraphAnalysisResponse,
} from "@/lib/schema";
import {
  STAGE1_SYSTEM_PROMPT,
  buildStage1UserPrompt,
  STAGE2_SYSTEM_PROMPT,
  buildStage2UserPrompt,
} from "@/lib/prompt";
import { checkRateLimit } from "@/lib/rate-limit";
import { signAnalysis } from "@/lib/sign";
import { getClientIp } from "@/lib/client-ip";
import { parseJsonBody } from "@/lib/safe-body";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ARTICLE_WORDS = 9000;
const STAGE_TIMEOUT_MS = 28000;
const MIN_TEXT_CHARS = 150;
const MIN_TEXT_CHARS_TWITTER = 10;
const MAX_BODY_BYTES = 500_000;

function truncateToWordLimit(
  text: string,
  maxWords: number
): { text: string; wasTruncated: boolean } {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return { text, wasTruncated: false };
  return { text: words.slice(0, maxWords).join(" "), wasTruncated: true };
}

function stripJsonFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```json")) s = s.slice(7);
  else if (s.startsWith("```")) s = s.slice(3);
  if (s.endsWith("```")) s = s.slice(0, s.length - 3);
  return s.trim();
}

function getModel(apiKey: string, systemPrompt: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });
}

async function runStage1(
  articleText: string,
  wasTruncated: boolean,
  apiKey: string,
  retries = 0
): Promise<ClaimGraph> {
  const model = getModel(apiKey, STAGE1_SYSTEM_PROMPT);
  const result = await Promise.race([
    model.generateContent(buildStage1UserPrompt(articleText, wasTruncated)),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI_TIMEOUT")), STAGE_TIMEOUT_MS)
    ),
  ]);

  const json = stripJsonFences(result.response.text());
  if (!json) throw new Error("AI_EMPTY_RESPONSE");

  try {
    return ClaimGraphSchema.parse(JSON.parse(json));
  } catch {
    if (retries < 1) return runStage1(articleText, wasTruncated, apiKey, retries + 1);
    throw new Error("AI_PARSE_FAILURE");
  }
}

async function runStage2(
  articleText: string,
  wasTruncated: boolean,
  graph: ClaimGraph,
  apiKey: string,
  retries = 0
): Promise<ReturnType<typeof GraphReasoningSchema.parse>> {
  const model = getModel(apiKey, STAGE2_SYSTEM_PROMPT);
  const result = await Promise.race([
    model.generateContent(
      buildStage2UserPrompt(articleText, wasTruncated, {
        nodes: graph.nodes,
        edges: graph.edges,
      })
    ),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI_TIMEOUT")), STAGE_TIMEOUT_MS)
    ),
  ]);

  const json = stripJsonFences(result.response.text());
  if (!json) throw new Error("AI_EMPTY_RESPONSE");

  try {
    return GraphReasoningSchema.parse(JSON.parse(json));
  } catch {
    if (retries < 1) return runStage2(articleText, wasTruncated, graph, apiKey, retries + 1);
    throw new Error("AI_PARSE_FAILURE");
  }
}

async function analyzeWithGraph(
  articleText: string,
  wasTruncated: boolean
): Promise<GraphAnalysisResponse> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");

  // Stage 1: extract claim graph
  const graph = await runStage1(articleText, wasTruncated, apiKey);

  // If content is unsuitable, short-circuit with a minimal valid response
  if (!graph.content_suitable) {
    return GraphAnalysisResponseSchema.parse({
      content_suitable: false,
      nodes: [],
      edges: [],
      claim_verdicts: [],
      overall_assessment: "",
      bias_direction: "Unclear",
      bias_summary: "No clear bias detected.",
      analysis_confidence: "Low",
    });
  }

  // Stage 2: reason over the graph
  const reasoning = await runStage2(articleText, wasTruncated, graph, apiKey);

  return GraphAnalysisResponseSchema.parse({
    ...graph,
    ...reasoning,
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "You've reached the analysis limit. Try again in about an hour." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    }

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
          error: isTwitter
            ? "Could not retrieve enough content from this tweet."
            : "Paste the full article text — this looks too short.",
        },
        { status: 400 }
      );
    }

    const truncated = truncateToWordLimit(text, MAX_ARTICLE_WORDS);

    try {
      const analysis = await analyzeWithGraph(truncated.text, truncated.wasTruncated);
      return NextResponse.json(
        { analysis, token: signAnalysis(analysis) },
        { headers: { "X-RateLimit-Remaining": rateLimit.remaining.toString() } }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message === "API_KEY_MISSING") {
        return NextResponse.json(
          { error: "Unable to create report. The analysis service is not configured." },
          { status: 503 }
        );
      }
      if (message === "AI_TIMEOUT") {
        return NextResponse.json(
          { error: "The analysis took too long. Try again or paste a shorter article." },
          { status: 504 }
        );
      }
      if (message === "AI_PARSE_FAILURE" || message === "AI_EMPTY_RESPONSE") {
        return NextResponse.json(
          { error: "We couldn't generate a valid report for this article. Try again." },
          { status: 502 }
        );
      }
      console.error("Analysis error:", err);
      return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
