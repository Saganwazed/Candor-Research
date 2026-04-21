"use client";

import type { GraphAnalysisResponse } from "@/lib/schema";
import ClaimGraph from "./ClaimGraph";
import ClaimVerdicts from "./ClaimVerdicts";
import GraphReport from "./GraphReport";
import FeedbackBar from "./FeedbackBar";
import ShareButton from "./ShareButton";

interface ReportSectionProps {
  analysis: GraphAnalysisResponse;
  onShare: () => void;
  isSharing: boolean;
  hasShared: boolean;
}

export default function ReportSection({
  analysis,
  onShare,
  isSharing,
  hasShared,
}: ReportSectionProps) {
  if (!analysis.content_suitable) {
    return (
      <div className="report report-reveal" id="report-unsuitable">
        <div className="content-warning">
          <p className="content-warning-text">
            This doesn&apos;t look like a news article. Try submitting a news
            story for the best results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="report" id="report">
      {/* Summary headline */}
      <div className="bias-summary report-reveal" id="section-bias-summary">
        <p className="bias-summary-text">{analysis.bias_summary}</p>
      </div>

      {/* Claim graph */}
      <div className="report-section report-reveal report-reveal-delay-1" id="section-claim-graph">
        <h2 className="section-heading">Claim graph</h2>
        <p className="graph-section-intro">
          Sources, claims, and entities extracted from the article — mapped with
          their logical relationships.
        </p>
        <ClaimGraph nodes={analysis.nodes} edges={analysis.edges} />
      </div>

      {/* Per-claim verdicts */}
      <ClaimVerdicts verdicts={analysis.claim_verdicts} />

      {/* Narrative report + bias direction */}
      <GraphReport
        assessment={analysis.overall_assessment}
        biasDirection={analysis.bias_direction}
      />

      {/* Actions */}
      <div className="report-reveal report-reveal-delay-4">
        <div className="report-actions-row">
          <FeedbackBar />
          <ShareButton
            onShare={onShare}
            isSharing={isSharing}
            hasShared={hasShared}
          />
        </div>
        <div className="disclaimer">
          <p className="disclaimer-text">
            AI analysis — use as a starting point, not a verdict.
          </p>
        </div>
      </div>
    </div>
  );
}
