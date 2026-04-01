"use client";

import { useState } from "react";
import type { AnalysisResponse } from "@/lib/schema";
import InputSection from "@/components/InputSection";
import LoadingState from "@/components/LoadingState";
import ReportSection from "@/components/ReportSection";
import Disclaimer from "@/components/Disclaimer";

export default function Home() {
  const [fetchStatus, setFetchStatus] = useState<"" | "fetching" | "analyzing">("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState("");

  async function handleAnalyze(mode: "url" | "text", value: string) {
    setFetchStatus(mode === "url" ? "fetching" : "analyzing");
    setAnalysis(null);
    setError("");

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

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "text", text: articleText }),
        });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong. Try again.");
        return;
      }

      setAnalysis(data.analysis);
    } catch {
      setError("Could not connect to the server. Try again.");
    } finally {
      setFetchStatus("");
    }
  }

  return (
    <main className="page-container">
      {/* Header */}
      <header>
        <h1 className="wordmark">NewsLens</h1>
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
      {analysis && fetchStatus === "" && <ReportSection analysis={analysis} />}
    </main>
  );
}
