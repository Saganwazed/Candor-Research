import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const FETCH_TIMEOUT_MS = 15000;
const BROWSER_TIMEOUT_MS = 20000;
const MAX_BODY_BYTES = 8192;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

// ─── URL Validation ──────────────────────────────────────────────────────────

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
  if (hostname.startsWith("169.254.")) return true;

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

// ─── Tier 0: Twitter oEmbed ──────────────────────────────────────────────────

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

    const data = (await response.json()) as {
      html: string;
      author_name: string;
      author_url: string;
    };

    const pMatch = data.html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    if (!pMatch) throw new Error("Could not parse tweet text from oEmbed HTML");

    const tweetText = decodeHtmlEntities(
      pMatch[1]
        .replace(/<a[^>]*>([^<]*)<\/a>/g, "$1")
        .replace(/<[^>]+>/g, "")
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

// ─── Tier 1: Jina Reader (fast, free) ───────────────────────────────────────

async function fetchWithJina(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT },
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

// ─── Tier 2: Direct fetch + Mozilla Readability ─────────────────────────────

async function fetchWithReadability(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Direct fetch returned ${response.status}`);
    }

    const html = await response.text();
    if (!html || html.length < 200) {
      throw new Error("Direct fetch returned insufficient HTML");
    }

    // Dynamic imports — only loaded when this tier is actually needed
    const { JSDOM } = await import("jsdom");
    const { Readability } = await import("@mozilla/readability");

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent || article.textContent.trim().length < 100) {
      throw new Error("Readability could not extract article content");
    }

    return article.textContent.trim();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Tier 3: Headless Chromium (catches JS-heavy / bot-protected sites) ─────

async function fetchWithBrowser(url: string): Promise<string> {
  // Dynamic imports — heavy deps only loaded as last resort
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteer = await import("puppeteer-core");

  const browser = await puppeteer.default.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 720 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: BROWSER_TIMEOUT_MS,
    });

    // Wait a beat for any lazy-loaded content
    await new Promise((r) => setTimeout(r, 1000));

    // Extract article text — try multiple selectors
    const text = await page.evaluate(() => {
      // Priority: <article>, [role="article"], <main>, then <body>
      const selectors = [
        "article",
        '[role="article"]',
        "main",
        ".article-body",
        ".post-content",
        ".entry-content",
        ".story-body",
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent && el.textContent.trim().length > 200) {
          return el.textContent.trim();
        }
      }

      // Fallback: body text, stripping nav/footer/header/aside
      const clone = document.body.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("nav, footer, header, aside, script, style, [role='navigation']").forEach((el) => el.remove());

      return clone.textContent?.trim() || "";
    });

    if (!text || text.length < 100) {
      throw new Error("Browser extraction returned insufficient content");
    }

    return text;
  } finally {
    await browser.close();
  }
}

// ─── Route Handler ───────────────────────────────────────────────────────────

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
      // Twitter/X: oEmbed → Jina fallback
      try {
        content = await fetchTweetContent(url);
      } catch (oembedError) {
        console.warn("Twitter oEmbed failed, trying Jina:", oembedError);
        try {
          content = await fetchWithJina(url);
        } catch {
          return NextResponse.json(
            {
              error:
                "Could not retrieve this tweet. It may be protected, deleted, or from an account that restricts access.",
            },
            { status: 422 }
          );
        }
      }
    } else {
      // Articles: Jina → Readability → Headless Chromium
      let method = "";
      try {
        content = await fetchWithJina(url);
        method = "jina";
      } catch (jinaError) {
        console.warn("Tier 1 (Jina) failed:", jinaError);

        try {
          content = await fetchWithReadability(url);
          method = "readability";
        } catch (readabilityError) {
          console.warn("Tier 2 (Readability) failed:", readabilityError);

          try {
            content = await fetchWithBrowser(url);
            method = "browser";
          } catch (browserError) {
            console.warn("Tier 3 (Browser) failed:", browserError);
            return NextResponse.json(
              {
                error:
                  "Could not retrieve article content. All extraction methods failed for this site.",
              },
              { status: 422 }
            );
          }
        }
      }

      console.log(`[fetch-url] Extracted via ${method}: ${url.slice(0, 80)}`);
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
