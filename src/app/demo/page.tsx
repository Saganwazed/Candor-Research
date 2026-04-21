"use client";

import type { GraphAnalysisResponse } from "@/lib/schema";
import ReportSection from "@/components/ReportSection";
import ThemeToggle from "@/components/ThemeToggle";

const MOCK: GraphAnalysisResponse = {
  content_suitable: true,
  nodes: [
    { id: "s1", type: "source", label: "NewsSource A" },
    { id: "s2", type: "source", label: "Govt. Statistics Bureau" },
    { id: "s3", type: "source", label: "Economic Institute" },
    { id: "c1", type: "claim", label: "30% unemployment rise in 2025" },
    { id: "c2", type: "claim", label: "Only 5% unemployment increase" },
    { id: "c3", type: "claim", label: "Higher figure misleading — seasonal" },
    { id: "e1", type: "entity", label: "Country X" },
    { id: "e2", type: "entity", label: "Unemployment Rate 2025" },
  ],
  edges: [
    { from: "s1", to: "c1", relation: "claims" },
    { from: "s2", to: "c2", relation: "claims" },
    { from: "s3", to: "c3", relation: "claims" },
    { from: "c1", to: "e1", relation: "about" },
    { from: "c2", to: "e2", relation: "about" },
    { from: "c1", to: "c2", relation: "contradicts" },
    { from: "c3", to: "c1", relation: "misleading" },
    { from: "s3", to: "s2", relation: "cites" },
  ],
  claim_verdicts: [
    {
      node_id: "c1",
      claim_text: "Unemployment in Country X rose 30% in 2025",
      evidence_support:
        "Cited only by NewsSource A with no corroborating primary data provided in the article.",
      conflicting_sources:
        "Government Statistics Bureau directly contradicts this with an official figure of 5%, a sixfold difference.",
      framing_analysis:
        "Positioned as the headline figure before contradictions are introduced, anchoring readers to the higher number through primacy bias.",
      verdict: "contradicted",
    },
    {
      node_id: "c2",
      claim_text: "Official government data shows only 5% unemployment increase",
      evidence_support:
        "Attributed to the Government Statistics Bureau, a primary institutional source with methodological authority.",
      conflicting_sources:
        "NewsSource A reports a figure six times higher, but cites no primary dataset.",
      framing_analysis:
        "Introduced as a rebuttal rather than a lead figure, structurally downplaying official data relative to the unverified claim.",
      verdict: "supported",
    },
    {
      node_id: "c3",
      claim_text:
        "The higher unemployment figure is misleading due to seasonal adjustment effects",
      evidence_support:
        "Advanced by the Economic Institute, which cites seasonal methodology as the explanatory factor.",
      conflicting_sources: "None identified in the article.",
      framing_analysis:
        "Framed as expert commentary rather than a direct correction, softening the epistemological weight of the methodological critique.",
      verdict: "unverifiable",
    },
  ],
  overall_assessment:
    "The article presents conflicting unemployment statistics from three sources without adequately contextualising the methodological discrepancy. By leading with an unverified 30% figure from a single outlet before introducing official government data showing only 5%, the article employs an anchoring pattern that biases reader interpretation toward the higher, unsubstantiated claim. The Economic Institute seasonal-adjustment explanation is structurally marginalised as secondary commentary. Sourcing is asymmetric: the contradicting official figure is given equal or lesser prominence despite coming from a primary institutional source. The overall structure suggests selective framing designed to amplify alarm rather than to accurately represent the statistical landscape.",
  bias_direction: "Center-Right",
  bias_summary:
    "Unverified high figure anchors narrative; official contradiction buried.",
  analysis_confidence: "High",
};

export default function DemoPage() {
  return (
    <main className="page-container">
      <ThemeToggle />
      <header>
        <h1 className="wordmark">Candor</h1>
        <p className="tagline" style={{ color: "var(--color-flag-amber)" }}>
          Demo — graph-based claim verification
        </p>
      </header>
      <ReportSection
        analysis={MOCK}
        onShare={() => {}}
        isSharing={false}
        hasShared={false}
      />
    </main>
  );
}
