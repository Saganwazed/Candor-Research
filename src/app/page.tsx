"use client";

import { useState } from "react";
import type { AnalysisResponse } from "@/lib/schema";
import InputSection from "@/components/InputSection";
import LoadingState from "@/components/LoadingState";
import ReportSection from "@/components/ReportSection";
import Disclaimer from "@/components/Disclaimer";
import ThemeToggle from "@/components/ThemeToggle";
import ShareModal from "@/components/ShareModal";

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
          setError(
            fetchData.error ||
              "Could not retrieve article content. The site may block automated access."
          );
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
        setError(data.error || "Something went wrong. Try again.");
        return;
      }

      setAnalysis(data.analysis);
      setAnalysisToken(data.token ?? null);
    } catch {
      setError("Could not connect to the server. Try again.");
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
    } catch {
      setError("Could not create share link. Try again.");
    } finally {
      setIsSharing(false);
    }
  }

  async function handleToggleVisibility(isPublic: boolean) {
    if (!shareData) return;

    const response = await fetch("/api/share", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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
