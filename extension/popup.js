// ─── Constants ────────────────────────────────────────────────────────────────

const POSITION_MAP = {
  Left: 4,
  "Center-Left": 28,
  Center: 50,
  "Center-Right": 72,
  Right: 96,
  Unclear: 50,
};

const FLAG_COLOR_MAP = {
  "Unverified Claim": "amber",
  "Missing Context": "amber",
  "Loaded Language": "orange",
  "Anonymous Sourcing": "yellow",
  "Statistical Misuse": "red",
  "False Balance": "orange",
};

const LOADING_LABELS = [
  "Reading the article...",
  "Checking for bias signals...",
  "Analyzing credibility...",
  "Writing your report...",
];

// ─── DOM References ───────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const states = {
  idle: $("state-idle"),
  loading: $("state-loading"),
  error: $("state-error"),
  report: $("state-report"),
  unsuitable: $("state-unsuitable"),
};

// ─── State Machine ────────────────────────────────────────────────────────────

let loadingInterval = null;

function showState(stateName) {
  Object.entries(states).forEach(([name, el]) => {
    el.hidden = name !== stateName;
  });

  if (stateName !== "loading") {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }
}

function startLoadingAnimation() {
  let index = 0;
  const label = $("loading-label");
  label.textContent = LOADING_LABELS[0];
  label.style.opacity = "1";

  loadingInterval = setInterval(() => {
    label.style.opacity = "0";
    setTimeout(() => {
      index = (index + 1) % LOADING_LABELS.length;
      label.textContent = LOADING_LABELS[index];
      label.style.opacity = "1";
    }, 200);
  }, 2000);
}

// ─── Report Rendering ─────────────────────────────────────────────────────────

function renderReport(analysis) {
  // Bias Summary
  $("bias-summary-text").textContent = analysis.bias_summary;

  // Spectrum Marker
  const position = POSITION_MAP[analysis.bias_direction] ?? 50;
  $("spectrum-marker").style.left = `${position}%`;

  // Bias Label + Justification
  $("bias-label").textContent = analysis.bias_direction;
  $("bias-justification").textContent = analysis.bias_justification;

  // Credibility Flags
  const container = $("flags-container");
  container.innerHTML = "";

  if (analysis.credibility_flags.length === 0) {
    const p = document.createElement("p");
    p.className = "no-flags-message";
    p.textContent = "No credibility flags detected.";
    container.appendChild(p);
  } else {
    analysis.credibility_flags.forEach((flag) => {
      const item = document.createElement("div");
      item.className = "flag-item";

      const chip = document.createElement("span");
      const colorClass = FLAG_COLOR_MAP[flag.flag_type] || "amber";
      chip.className = `flag-chip flag-chip--${colorClass}`;
      chip.textContent = flag.flag_type;

      const desc = document.createElement("p");
      desc.className = "flag-description";
      desc.textContent = flag.description;

      item.appendChild(chip);
      item.appendChild(desc);
      container.appendChild(item);
    });
  }

  // Hidden Agenda
  $("agenda-text").textContent = analysis.hidden_agenda;

  // Confidence Badge
  $("confidence-badge").textContent = `${analysis.analysis_confidence} confidence`;

  showState("report");
}

// ─── Analysis Handler ─────────────────────────────────────────────────────────

async function runAnalysis() {
  showState("loading");
  startLoadingAnimation();

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      showError("Cannot access this tab.");
      return;
    }

    // Check if we can inject into this tab
    if (
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://") ||
      tab.url.startsWith("about:") ||
      tab.url.startsWith("edge://")
    ) {
      showError("Candor can't analyze browser pages. Try it on a news article.");
      return;
    }

    // Detect Twitter/X
    const isTwitter = /^https?:\/\/(www\.|mobile\.)?(twitter\.com|x\.com)\//i.test(tab.url);

    // Check for cached result first (popup close recovery)
    const cached = await chrome.storage.session.get(`analysis_${tab.id}`);
    const cachedResult = cached[`analysis_${tab.id}`];
    if (cachedResult && cachedResult.status === "done" && Date.now() - cachedResult.timestamp < 120000) {
      renderReport(cachedResult.analysis);
      return;
    }

    // Send to background for extraction + analysis
    const result = await chrome.runtime.sendMessage({
      action: "analyze",
      tabId: tab.id,
      isTwitter,
    });

    if (result.error) {
      showError(result.error);
      return;
    }

    if (result.analysis && !result.analysis.content_suitable) {
      showState("unsuitable");
      return;
    }

    if (result.analysis) {
      renderReport(result.analysis);
    } else {
      showError("Unexpected response from analysis.");
    }
  } catch (err) {
    showError(err.message || "Something went wrong. Try again.");
  }
}

function showError(message) {
  $("error-text").textContent = message;
  showState("error");
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────

function initTheme() {
  chrome.storage.local.get("candor_theme", ({ candor_theme }) => {
    if (candor_theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      $("icon-sun").style.display = "none";
      $("icon-moon").style.display = "block";
    } else if (candor_theme === "light") {
      document.documentElement.removeAttribute("data-theme");
      $("icon-sun").style.display = "block";
      $("icon-moon").style.display = "none";
    }
    // If no preference stored, OS media query handles it via CSS
  });
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark" ||
    (!document.documentElement.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    $("icon-sun").style.display = "block";
    $("icon-moon").style.display = "none";
    chrome.storage.local.set({ candor_theme: "light" });
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    $("icon-sun").style.display = "none";
    $("icon-moon").style.display = "block";
    chrome.storage.local.set({ candor_theme: "dark" });
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  $("btn-analyze").addEventListener("click", runAnalysis);
  $("btn-retry").addEventListener("click", runAnalysis);
  $("btn-retry-unsuitable").addEventListener("click", runAnalysis);
  $("btn-theme").addEventListener("click", toggleTheme);

  // Check for in-progress analysis on popup open (recovery)
  chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
    if (!tab?.id) return;
    const cached = await chrome.storage.session.get(`analysis_${tab.id}`);
    const result = cached[`analysis_${tab.id}`];

    if (!result) return;

    if (result.status === "loading" && Date.now() - result.timestamp < 30000) {
      showState("loading");
      startLoadingAnimation();
      // Poll for result (with 35s safety timeout)
      const poll = setInterval(async () => {
        const updated = await chrome.storage.session.get(`analysis_${tab.id}`);
        const r = updated[`analysis_${tab.id}`];
        if (r && r.status === "done") {
          clearInterval(poll);
          clearTimeout(pollTimeout);
          renderReport(r.analysis);
        } else if (r && r.status === "error") {
          clearInterval(poll);
          clearTimeout(pollTimeout);
          showError(r.error);
        }
      }, 500);
      const pollTimeout = setTimeout(() => {
        clearInterval(poll);
        showError("Analysis timed out. Try again.");
      }, 35000);
    } else if (result.status === "done" && Date.now() - result.timestamp < 120000) {
      renderReport(result.analysis);
    }
  });
});
