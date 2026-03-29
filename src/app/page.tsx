"use client";

import { useState } from "react";
import type { AnalysisResponse } from "@/lib/schema";
import InputSection from "@/components/InputSection";
import LoadingState from "@/components/LoadingState";
import ReportSection from "@/components/ReportSection";
import Disclaimer from "@/components/Disclaimer";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState("");

  async function handleAnalyze(mode: "url" | "text", value: string) {
    setIsLoading(true);
    setAnalysis(null);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "url" ? { mode, url: value } : { mode, text: value }
        ),
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
      setIsLoading(false);
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
      <InputSection onAnalyze={handleAnalyze} isLoading={isLoading} />

      {/* Disclaimer — once per session, below input */}
      <Disclaimer />

      {/* Loading */}
      {isLoading && <LoadingState />}

      {/* Error */}
      {error && !isLoading && (
        <div className="error-message" role="alert" id="api-error" style={{ marginTop: "48px" }}>
          {error}
        </div>
      )}

      {/* Report */}
      {analysis && !isLoading && <ReportSection analysis={analysis} />}
    </main>
  );
}
