import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

async function fetchWithJina(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Jina Reader returned status: ${response.status}`);
    }

    const text = await response.text();
    if (!text || text.trim().length === 0) {
      throw new Error("Jina Reader returned empty body");
    }
    
    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithReadability(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Fallback fetch returned status: ${response.status}`);
    }

    const html = await response.text();
    if (!html || html.trim().length === 0) {
      throw new Error("Fallback fetch returned empty body");
    }

    // Dynamic import to avoid Vercel serverless cold-start penalties globally
    const { JSDOM } = await import("jsdom");
    const { Readability } = await import("@mozilla/readability");

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      throw new Error("Readability could not extract content");
    }

    return article.textContent.replace(/\s+/g, " ").trim();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || !/^https?:\/\/.+/.test(url)) {
      return NextResponse.json(
        { error: "Invalid URL provided." },
        { status: 400 }
      );
    }

    let content = "";

    try {
      // 1. Try Jina Reader
      content = await fetchWithJina(url);
    } catch (jinaError) {
      console.warn("Jina Reader failed, trying fallback:", jinaError);
      
      try {
        // 2. Try Fallback
        content = await fetchWithReadability(url);
      } catch (fallbackError) {
        console.warn("Fallback failed:", fallbackError);
        return NextResponse.json(
          {
            error:
              "Could not retrieve article content. The site may block automated access.",
          },
          { status: 422 }
        );
      }
    }

    // Minimum sanity check for content length
    if (content.length < 100) {
      return NextResponse.json(
        {
          error:
            "Could not retrieve article content. The site may block automated access.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("fetch-url route error:", error);
    return NextResponse.json(
      {
        error:
          "Could not retrieve article content. The site may block automated access.",
      },
      { status: 500 }
    );
  }
}
