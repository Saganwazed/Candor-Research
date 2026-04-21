"use client";

import type { ClaimVerdict, Verdict } from "@/lib/schema";

interface ClaimVerdictsProps {
  verdicts: ClaimVerdict[];
}

const VERDICT_LABEL: Record<Verdict, string> = {
  supported:    "Supported",
  contradicted: "Contradicted",
  unverifiable: "Unverifiable",
  misleading:   "Misleading",
};

const VERDICT_CLASS: Record<Verdict, string> = {
  supported:    "verdict-chip--supported",
  contradicted: "verdict-chip--contradicted",
  unverifiable: "verdict-chip--unverifiable",
  misleading:   "verdict-chip--misleading",
};

export default function ClaimVerdicts({ verdicts }: ClaimVerdictsProps) {
  if (!verdicts.length) return null;

  return (
    <div
      className="report-section report-reveal report-reveal-delay-2"
      id="section-claim-verdicts"
    >
      <h2 className="section-heading">Claim analysis</h2>
      <p className="verdicts-intro">
        Each atomic claim extracted from the article is evaluated across three dimensions: supporting evidence, conflicting sources, and framing choices.
      </p>

      <div className="verdicts-list">
        {verdicts.map((v, i) => (
          <div key={v.node_id} className="verdict-card">
            <div className="verdict-card-header">
              <span className="verdict-node-id">{v.node_id}</span>
              <span className={`verdict-chip ${VERDICT_CLASS[v.verdict]}`}>
                {VERDICT_LABEL[v.verdict]}
              </span>
            </div>

            <p className="verdict-claim-text">&ldquo;{v.claim_text}&rdquo;</p>

            <div className="verdict-assessments">
              <div className="verdict-assessment">
                <span className="verdict-assessment-label">Evidence</span>
                <p className="verdict-assessment-text">{v.evidence_support}</p>
              </div>
              <div className="verdict-assessment">
                <span className="verdict-assessment-label">Conflicts</span>
                <p className="verdict-assessment-text">{v.conflicting_sources}</p>
              </div>
              <div className="verdict-assessment">
                <span className="verdict-assessment-label">Framing</span>
                <p className="verdict-assessment-text">{v.framing_analysis}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
