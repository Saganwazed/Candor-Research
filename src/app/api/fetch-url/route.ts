import { NextRequest, NextResponse } from "next/server";
import { lookup } from "dns/promises";
import { parseJsonBody } from "@/lib/safe-body";

export const runtime = "nodejs";
export const maxDuration = 30;

const FETCH_TIMEOUT_MS = 15000;
const BROWSER_TIMEOUT_MS = 20000;
const MAX_BODY_BYTES = 8192;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

// ─── URL & IP Validation ────────────────────────────────────────────────────

/**
 * Check if an IP address is private/reserved (SSRF blocklist).
 */
function isBlockedIp(ip: string): boolean {
  if (["127.0.0.1", "::1", "0.0.0.0", "::"].includes(ip)) return true;
  if (ip.startsWith("169.254.")) return true; // Link-local + AWS metadata

  // IPv6-mapped IPv4 (e.g. ::ffff:127.0.0.1) — extract the IPv4 part and recheck
  const mappedV4 = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (mappedV4) return isBlockedIp(mappedV4[1]);

  // IPv6 private/reserved ranges
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // fc00::/7 Unique Local
  if (ip.startsWith("fe80")) return true; // fe80::/10 Link-local
  if (ip.startsWith("::ffff:")) return true; // Any remaining mapped addresses

  const ipv4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 0) return true;       // 0.0.0.0/8
    if (a === 10) return true;      // 10.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
    if (a === 127) return true;     // 127.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
  }

  return false;
}

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

  // Also check if hostname is a raw IP
  if (isBlockedIp(hostname)) return true;

  return false;
}

/**
 * Resolve hostname via DNS and validate the resolved IP against the blocklist.
 * Prevents DNS rebinding attacks (TOCTOU between hostname check and fetch).
 */
async function resolveAndValidate(urlString: string): Promise<{ resolvedIp: string; parsed: URL }> {
  const parsed = new URL(urlString);

  // If hostname is already an IP, validate directly
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname)) {
    if (isBlockedIp(parsed.hostname)) {
      throw new Error("BLOCKED_IP");
    }
    return { resolvedIp: parsed.hostname, parsed };
  }

  // Resolve DNS and validate the actual IP
  const { address } = await lookup(parsed.hostname);

  if (isBlockedIp(address)) {
    throw new Error("BLOCKED_IP");
  }

  return { resolvedIp: address, parsed };
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
    // Jina Reader expects the raw URL as a path segment (not percent-encoded)
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

// ─── Tier 2: Direct fetch + Mozilla Readability (DNS-pinned) ───────────────

const MAX_REDIRECTS = 5;

async function fetchWithReadability(url: string, resolvedIp: string, redirectCount = 0): Promise<{ content: string; title: string | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Use the resolved IP in the Host header to prevent DNS rebinding.
    // We replace the hostname with the resolved IP in the URL and set Host header.
    const parsed = new URL(url);
    const ipUrl = new URL(url);
    ipUrl.hostname = resolvedIp;

    const response = await fetch(ipUrl.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Host: parsed.hostname, // Original hostname for virtual hosting
      },
      signal: controller.signal,
      redirect: "manual", // Don't follow redirects to avoid re-resolving DNS
    });

    // Handle redirects manually — re-validate the redirect target
    if (response.status >= 300 && response.status < 400) {
      if (redirectCount >= MAX_REDIRECTS) {
        throw new Error("Too many redirects");
      }
      const location = response.headers.get("location");
      if (location) {
        const redirectUrl = new URL(location, url).toString();
        if (isBlockedUrl(redirectUrl)) {
          throw new Error("Redirect target is blocked");
        }
        // Re-resolve DNS for the redirect target
        const { resolvedIp: newIp } = await resolveAndValidate(redirectUrl);
        return fetchWithReadability(redirectUrl, newIp, redirectCount + 1);
      }
    }

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

    return { content: article.textContent.trim(), title: article.title || null };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Tier 3: Headless Chromium (catches JS-heavy / bot-protected sites) ─────
// JavaScript is DISABLED and requests are intercepted to prevent SSRF.

async function fetchWithBrowser(url: string, resolvedIp: string): Promise<{ content: string; title: string | null }> {
  // Dynamic imports — heavy deps only loaded as last resort
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteer = await import("puppeteer-core");

  const browser = await puppeteer.default.launch({
    args: [
      ...chromium.args,
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-default-apps",
      "--no-first-run",
    ],
    defaultViewport: { width: 1280, height: 720 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);

    // SECURITY: Disable JavaScript execution on untrusted pages
    await page.setJavaScriptEnabled(false);

    // SECURITY: Intercept requests — only allow the target URL's origin
    const allowedOrigin = new URL(url).origin;
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      try {
        const reqUrl = new URL(req.url());
        if (reqUrl.origin === allowedOrigin || reqUrl.protocol === "data:") {
          req.continue();
        } else {
          req.abort("blockedbyclient");
        }
      } catch {
        req.abort("blockedbyclient");
      }
    });

    // Navigate using the resolved IP to prevent DNS rebinding
    const parsed = new URL(url);
    const ipUrl = new URL(url);
    ipUrl.hostname = resolvedIp;

    await page.setExtraHTTPHeaders({ Host: parsed.hostname });
    await page.goto(ipUrl.toString(), {
      waitUntil: "networkidle2",
      timeout: BROWSER_TIMEOUT_MS,
    });

    // Extract article text — try multiple selectors
    const text = await page.evaluate(() => {
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

    const title = await page.title();

    return { content: text, title: title || null };
  } finally {
    await browser.close();
  }
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Parse body with enforced byte limit
    let body: { url: string };
    try {
      body = await parseJsonBody(request, MAX_BODY_BYTES);
    } catch (err) {
      if (err instanceof Error && err.message === "BODY_TOO_LARGE") {
        return NextResponse.json({ error: "Request too large." }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

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

    // SECURITY: Resolve DNS and validate the resolved IP BEFORE any fetch.
    // Prevents DNS rebinding / TOCTOU attacks.
    let resolvedIp: string;
    try {
      const resolved = await resolveAndValidate(url);
      resolvedIp = resolved.resolvedIp;
    } catch {
      return NextResponse.json(
        { error: "Invalid URL provided." },
        { status: 400 }
      );
    }

    let content = "";
    let title: string | null = null;
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
      // Articles: Jina → Readability (DNS-pinned) → Headless Chromium (sandboxed)
      let method = "";
      try {
        content = await fetchWithJina(url);
        method = "jina";
      } catch (jinaError) {
        console.warn("Tier 1 (Jina) failed:", jinaError);

        try {
          const result = await fetchWithReadability(url, resolvedIp);
          content = result.content;
          title = result.title;
          method = "readability";
        } catch (readabilityError) {
          console.warn("Tier 2 (Readability) failed:", readabilityError);

          try {
            const result = await fetchWithBrowser(url, resolvedIp);
            content = result.content;
            title = result.title;
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

    return NextResponse.json({ content, isTwitter, title });
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
