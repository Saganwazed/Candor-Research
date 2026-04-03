import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const FETCH_TIMEOUT_MS = 15000;
const MAX_BODY_BYTES = 8192;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

function isBlockedUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return true;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return true;

  const hostname = parsed.hostname.toLowerCase();

  if (["localhost", "127.0.0.1", "::1", "0.0.0.0", "[::1]"].includes(hostname)) return true;

  // Link-local: AWS metadata (169.254.169.254), Azure IMDS, GCP metadata
  if (hostname.startsWith("169.254.")) return true;

  // Private IPv4 ranges
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
  }

  return false;
}

function isTwitterUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return ["twitter.com", "x.com", "mobile.twitter.com"].includes(hostname);
  } catch {
    return false;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

async function fetchTweetContent(url: string): Promise<string> {
  const oembedEndpoint = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(oembedEndpoint, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Twitter oEmbed returned ${response.status}`);
    }

    const data = await response.json() as {
      html: string;
      author_name: string;
      author_url: string;
    };

    // Extract tweet <p> text from oEmbed HTML
    const pMatch = data.html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    if (!pMatch) throw new Error("Could not parse tweet text from oEmbed HTML");

    const tweetText = decodeHtmlEntities(
      pMatch[1]
        .replace(/<a[^>]*>([^<]*)<\/a>/g, "$1") // replace links with their text
        .replace(/<[^>]+>/g, "")                 // strip remaining tags
        .trim()
    );

    const handle = data.author_url.split("/").filter(Boolean).pop() || "unknown";

    return (
      `[Social Media Post — Twitter/X]\n` +
      `Author: ${data.author_name} (@${handle})\n\n` +
      `${tweetText}\n\n` +
      `[This is a social media post. Analyze the bias and framing within the post itself.]`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

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

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string" || !/^https?:\/\/.+/.test(url)) {
      return NextResponse.json(
        { error: "Invalid URL provided." },
        { status: 400 }
      );
    }

    if (isBlockedUrl(url)) {
      return NextResponse.json(
        { error: "Invalid URL provided." },
        { status: 400 }
      );
    }

    let content = "";
    const isTwitter = isTwitterUrl(url);

    if (isTwitter) {
      // Twitter/X: use oEmbed API (no login required), Jina as fallback
      try {
        content = await fetchTweetContent(url);
      } catch (oembedError) {
        console.warn("Twitter oEmbed failed, trying Jina:", oembedError);
        try {
          content = await fetchWithJina(url);
        } catch {
          return NextResponse.json(
            { error: "Could not retrieve this tweet. It may be protected, deleted, or from an account that restricts access." },
            { status: 422 }
          );
        }
      }
    } else {
      try {
        content = await fetchWithJina(url);
      } catch (jinaError) {
        console.warn("Jina Reader failed:", jinaError);
        return NextResponse.json(
          { error: "Could not retrieve article content. The site may block automated access." },
          { status: 422 }
        );
      }
    }

    // Minimum sanity check
    if (content.length < 30) {
      return NextResponse.json(
        { error: "Could not retrieve enough content from this URL." },
        { status: 422 }
      );
    }

    return NextResponse.json({ content, isTwitter });
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
