"use client";

import { useState } from "react";
import type { AnalysisResponse } from "@/lib/schema";
import type { ClaimVerificationReport } from "@/lib/claim-verification-schema";
import InputSection from "@/components/InputSection";
import LoadingState from "@/components/LoadingState";
import ReportSection from "@/components/ReportSection";
import Disclaimer from "@/components/Disclaimer";
import ThemeToggle from "@/components/ThemeToggle";
import ShareModal from "@/components/ShareModal";
import ExtensionBanner from "@/components/ExtensionBanner";
import ClaimVerificationReport from "@/components/ClaimVerificationReport";
import { useAnalyticsEvents } from "@/lib/posthog-events";

export default function Home() {
  const [fetchStatus, setFetchStatus] = useState<"" | "fetching" | "analyzing">("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState("");

  // Claim verification state
  const [claimVerificationReport, setClaimVerificationReport] =
    useState<ClaimVerificationReport | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<
    "" | "verifying"
  >("");
  const [verificationError, setVerificationError] = useState("");
  const [lastArticleText, setLastArticleText] = useState<string | null>(null);

  // Share state
  const [isSharing, setIsSharing] = useState(false);
  const [shareData, setShareData] = useState<{
    shareId: string;
    publicUrl: string;
  } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareIsPublic, setShareIsPublic] = useState(true);

  // Track source URL and article title for share context
  const [lastSourceUrl, setLastSourceUrl] = useState<string | null>(null);
  const [lastArticleTitle, setLastArticleTitle] = useState<string | null>(null);
  // HMAC token from analyze response — proves the report is server-generated
  const [analysisToken, setAnalysisToken] = useState<string | null>(null);

  // PostHog analytics
  const { trackAnalysis, trackAnalysisError, trackFetchError, trackShareCreated } = useAnalyticsEvents();

  async function handleAnalyze(mode: "url" | "text", value: string) {
    setFetchStatus(mode === "url" ? "fetching" : "analyzing");
    setAnalysis(null);
    setError("");
    setShareData(null);
    setShareIsPublic(true);
    setAnalysisToken(null);
    setLastSourceUrl(mode === "url" ? value : null);
    setLastArticleTitle(null);
    setClaimVerificationReport(null);
    setVerificationError("");
    setLastArticleText(null);

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
        if (fetchData.title) setLastArticleTitle(fetchData.title);
        setFetchStatus("analyzing");
      }

      const isTwitter = mode === "url" && /^https?:\/\/(www\.|mobile\.)?(twitter\.com|x\.com)\//i.test(value);

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
      setLastArticleText(articleText);

      // Track successful analysis
      trackAnalysis(mode, data.analysis?.bias_direction);
    } catch {
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
      // Read CSRF token from cookie (double-submit pattern)
      const csrfToken = document.cookie
        .split("; ")
        .find((c) => c.startsWith("candor_csrf="))
        ?.split("=")[1] ?? "";

      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          analysis,
          source_url: lastSourceUrl,
          article_title: lastArticleTitle,
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
    } catch {
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

    setShareIsPublic(isPublic);
  }

  async function handleVerifyClaims() {
    if (!lastArticleText) return;

    setVerificationStatus("verifying");
    setVerificationError("");
    setClaimVerificationReport(null);

    try {
      const response = await fetch("/api/verify-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: lastArticleText }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Could not verify claims. Try again.";
        setVerificationError(errorMsg);
        return;
      }

      setClaimVerificationReport(data.report);
    } catch {
      setVerificationError("Could not connect to the server. Try again.");
    } finally {
      setVerificationStatus("");
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

      {/* Claim Verification */}
      {analysis && fetchStatus === "" && (
        <div className="mt-6">
          {!claimVerificationReport && verificationStatus === "" && (
            <button
              onClick={handleVerifyClaims}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Verify claims in this article
            </button>
          )}

          {verificationStatus === "verifying" && (
            <LoadingState customMessage="Verifying claims…" />
          )}

          {verificationError && verificationStatus === "" && (
            <div
              className="error-message"
              role="alert"
              style={{ marginTop: "24px" }}
            >
              {verificationError}
            </div>
          )}

          {claimVerificationReport && verificationStatus === "" && (
            <ClaimVerificationReport report={claimVerificationReport} />
          )}
        </div>
      )}

      {/* Extension Banner */}
      <ExtensionBanner />

      {/* Share Modal */}
      {showShareModal && shareData && analysis && (
        <ShareModal
          publicUrl={shareData.publicUrl}
          articleTitle={lastArticleTitle}
          isPublic={shareIsPublic}
          onClose={() => setShowShareModal(false)}
          onToggleVisibility={handleToggleVisibility}
        />
      )}
    </main>
  );
}
