// ─── Configuration ────────────────────────────────────────────────────────────

// Production URL. For development, override via chrome.storage.local.set({ api_base_override: "http://localhost:3000" })
const DEFAULT_API_BASE = "https://candor.app";

async function getApiBase() {
  const { api_base_override } = await chrome.storage.local.get("api_base_override");
  return api_base_override || DEFAULT_API_BASE;
}

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyze") {
    handleAnalyze(message.tabId, message.isTwitter)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message || "Unknown error" }));
    return true; // Keep channel open for async response
  }
});

// ─── Analysis Pipeline ────────────────────────────────────────────────────────

async function handleAnalyze(tabId, isTwitter) {
  // Step 1: Inject Readability library
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["lib/Readability.js"],
  });

  // Step 2: Inject content script and get extracted text
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: extractArticle,
    args: [isTwitter],
  });

  if (!result || result.error) {
    return { error: result?.error || "Could not extract content from this page." };
  }

  const text = result.text;
  const minLength = isTwitter ? 10 : 150;

  if (!text || text.length < minLength) {
    return { error: "Not enough content to analyze on this page." };
  }

  // Step 3: Store in-progress state for popup recovery
  await chrome.storage.session.set({
    [`analysis_${tabId}`]: { status: "loading", timestamp: Date.now() },
  });

  // Step 4: Call Candor API
  try {
    const apiBase = await getApiBase();
    const response = await fetch(`${apiBase}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "text", text, isTwitter }),
    });

    const data = await response.json();

    if (!response.ok) {
      const result = { error: data.error || "Analysis failed. Try again." };
      await chrome.storage.session.set({
        [`analysis_${tabId}`]: { status: "error", ...result, timestamp: Date.now() },
      });
      return result;
    }

    const analysisResult = { analysis: data.analysis };
    await chrome.storage.session.set({
      [`analysis_${tabId}`]: { status: "done", ...analysisResult, timestamp: Date.now() },
    });
    return analysisResult;
  } catch {
    const result = { error: "Could not connect to Candor. Check your connection and try again." };
    await chrome.storage.session.set({
      [`analysis_${tabId}`]: { status: "error", ...result, timestamp: Date.now() },
    });
    return result;
  }
}

// ─── Content Extraction Function (injected into page) ─────────────────────────
// This function runs in the content script context, NOT in the service worker.
// MUST be completely self-contained — no external references, because
// chrome.scripting.executeScript({ func }) serializes this function alone.

function extractArticle(isTwitter) {
  try {
    // ── Twitter/X path ────────────────────────────────────────────────────
    if (isTwitter) {
      const tweetTextEls = document.querySelectorAll('[data-testid="tweetText"]');

      if (tweetTextEls.length === 0) {
        // Fallback: try article elements
        const articles = document.querySelectorAll("article");
        if (articles.length === 0) {
          return { error: "Could not find tweet content on this page." };
        }

        const texts = Array.from(articles)
          .slice(0, 5)
          .map((el) => el.textContent?.trim())
          .filter(Boolean);

        if (texts.length === 0) {
          return { error: "Could not extract tweet text." };
        }

        return { text: texts.join("\n\n") };
      }

      // Main tweet + thread (up to 5 tweets)
      const texts = Array.from(tweetTextEls)
        .slice(0, 5)
        .map((el) => el.textContent?.trim())
        .filter(Boolean);

      if (texts.length === 0) {
        return { error: "Tweet appears to be empty." };
      }

      // Author info
      let authorInfo = "";
      const authorEl = document.querySelector('[data-testid="User-Name"]');
      if (authorEl) {
        authorInfo = "Author: " + (authorEl.textContent?.trim() || "Unknown") + "\n\n";
      }

      return {
        text:
          "[Social Media Post \u2014 Twitter/X]\n" +
          authorInfo +
          texts.join("\n\n") +
          "\n\n[This is a social media post. Analyze the bias and framing within the post itself.]",
      };
    }

    // ── News article path ─────────────────────────────────────────────────

    // Readability is injected as a global from lib/Readability.js
    if (typeof Readability === "undefined") {
      return { error: "Article parser failed to load." };
    }

    // Clone the document so Readability doesn't mutate the live page
    const documentClone = document.cloneNode(true);
    const reader = new Readability(documentClone);
    const article = reader.parse();

    if (!article || !article.textContent || article.textContent.trim().length < 100) {
      return {
        error:
          "Could not extract article content from this page. Try pasting the text at candor.app instead.",
      };
    }

    return { text: article.textContent.trim() };
  } catch (err) {
    return { error: err.message || "Extraction failed." };
  }
}
