"use client";

import { useState } from "react";
import type { AnalysisResponse } from "@/lib/schema";
import InputSection from "@/components/InputSection";
import LoadingState from "@/components/LoadingState";
import ReportSection from "@/components/ReportSection";
import Disclaimer from "@/components/Disclaimer";
import ThemeToggle from "@/components/ThemeToggle";
import ShareModal from "@/components/ShareModal";
import ExtensionBanner from "@/components/ExtensionBanner";
import { useAnalyticsEvents } from "@/lib/posthog-events";

export default function Home() {
  const [fetchStatus, setFetchStatus] = useState<"" | "fetching" | "analyzing">("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState("");

  // Share state
  const [isSharing, setIsSharing] = useState(false);
  const [shareData, setShareData] = useState<{
    shareId: string;
    publicUrl: string;
  } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Track source URL for share context
  const [lastSourceUrl, setLastSourceUrl] = useState<string | null>(null);
  // HMAC token from analyze response — proves the report is server-generated
  const [analysisToken, setAnalysisToken] = useState<string | null>(null);

  // PostHog analytics
  const { trackAnalysis, trackAnalysisError, trackFetchError, trackShareCreated } = useAnalyticsEvents();

  async function handleAnalyze(mode: "url" | "text", value: string) {
    setFetchStatus(mode === "url" ? "fetching" : "analyzing");
    setAnalysis(null);
    setError("");
    setShareData(null);
    setAnalysisToken(null);
    setLastSourceUrl(mode === "url" ? value : null);

    try {
      let articleText = value;

      if (mode === "url") {
        const fetchRes = await fetch("/api/fetch-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: value }),
        });

        const fetchData = await fetchRes.json();

        if (!fetchRes.ok) {
          const errorMsg = fetchData.error || "Could not retrieve article content. The site may block automated access.";
          setError(errorMsg);
          trackFetchError(errorMsg);
          setFetchStatus("");
          return;
        }

        articleText = fetchData.content;
        setFetchStatus("analyzing");
      }

      const isTwitter = mode === "url" && /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i.test(value);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "text", text: articleText, isTwitter }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Something went wrong. Try again.";
        setError(errorMsg);
        trackAnalysisError(mode, errorMsg);
        return;
      }

      setAnalysis(data.analysis);
      setAnalysisToken(data.token ?? null);

      // Track successful analysis
      trackAnalysis(mode, data.analysis?.bias_direction);
    } catch (err) {
      const errorMsg = "Could not connect to the server. Try again.";
      setError(errorMsg);
      trackAnalysisError(mode, errorMsg);
    } finally {
      setFetchStatus("");
    }
  }

  async function handleShare() {
    if (!analysis) return;

    // If already shared, just re-show the modal
    if (shareData) {
      setShowShareModal(true);
      return;
    }

    setIsSharing(true);

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis,
          source_url: lastSourceUrl,
          article_title: null,
          token: analysisToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create share link.");
        return;
      }

      setShareData({
        shareId: data.share_id,
        publicUrl: data.public_url,
      });
      setShowShareModal(true);

      // Track share creation
      trackShareCreated(analysis?.bias_direction);
    } catch (err) {
      setError("Could not create share link. Try again.");
    } finally {
      setIsSharing(false);
    }
  }

  async function handleToggleVisibility(isPublic: boolean) {
    if (!shareData) return;

    // Read CSRF token from cookie (double-submit pattern)
    const csrfToken = document.cookie
      .split("; ")
      .find((c) => c.startsWith("candor_csrf="))
      ?.split("=")[1] ?? "";

    const response = await fetch("/api/share", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        share_id: shareData.shareId,
        is_public: isPublic,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to toggle visibility");
    }
  }

  return (
    <main className="page-container">
      <ThemeToggle />

      {/* Sentry Test Button */}
      <button
        onClick={() => {
          myUndefinedFunction();
        }}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          padding: "8px 12px",
          fontSize: "12px",
          backgroundColor: "#f44f46",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          zIndex: 9999,
        }}
        title="Trigger a test error for Sentry"
      >
        Test Sentry
      </button>

      {/* Header */}
      <header>
        <h1 className="wordmark">Candor</h1>
        <p className="tagline">
          Paste a news article or URL. Get an instant bias report.
        </p>
      </header>

      {/* Input */}
      <InputSection onAnalyze={handleAnalyze} isLoading={fetchStatus !== ""} />

      {/* Disclaimer — once per session, below input */}
      <Disclaimer />

      {/* Loading */}
      {fetchStatus !== "" && (
        <LoadingState customMessage={fetchStatus === "fetching" ? "Fetching article\u2026" : undefined} />
      )}

      {/* Error */}
      {error && fetchStatus === "" && (
        <div className="error-message" role="alert" id="api-error" style={{ marginTop: "48px" }}>
          {error}
        </div>
      )}

      {/* Report */}
      {analysis && fetchStatus === "" && (
        <ReportSection
          analysis={analysis}
          onShare={handleShare}
          isSharing={isSharing}
          hasShared={shareData !== null}
        />
      )}

      {/* Extension Banner */}
      <ExtensionBanner />

      {/* Share Modal */}
      {showShareModal && shareData && analysis && (
        <ShareModal
          publicUrl={shareData.publicUrl}
          articleTitle={null}
          onClose={() => setShowShareModal(false)}
          onToggleVisibility={handleToggleVisibility}
        />
      )}
    </main>
  );
}
