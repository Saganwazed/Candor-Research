"use client";

import type { AnalysisResponse } from "@/lib/schema";
import BiasDirection from "./BiasDirection";
import CredibilityFlags from "./CredibilityFlags";
import HiddenAgenda from "./HiddenAgenda";
import FeedbackBar from "./FeedbackBar";

interface ReportSectionProps {
  analysis: AnalysisResponse;
}

export default function ReportSection({ analysis }: ReportSectionProps) {
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
      <div className="bias-summary report-reveal" id="section-bias-summary">
        <p className="bias-summary-text">{analysis.bias_summary}</p>
      </div>
      <BiasDirection
        direction={analysis.bias_direction}
        justification={analysis.bias_justification}
      />
      <CredibilityFlags flags={analysis.credibility_flags} />
      <HiddenAgenda agenda={analysis.hidden_agenda} />

      <div className="report-reveal report-reveal-delay-4">
        <FeedbackBar />

        {/* Persistent disclaimer on every report per R4 */}
        <div className="disclaimer">
          <p className="disclaimer-text">
            AI analysis — use as a starting point, not a verdict.
          </p>
        </div>
      </div>
    </div>
  );
}
