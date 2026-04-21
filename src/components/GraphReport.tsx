"use client";

interface GraphReportProps {
  assessment: string;
  biasDirection: string;
  biasJustification?: string;
}

export default function GraphReport({
  assessment,
  biasDirection,
  biasJustification,
}: GraphReportProps) {
  return (
    <div
      className="report-section report-reveal report-reveal-delay-3"
      id="section-graph-report"
    >
      <h2 className="section-heading">Analysis report</h2>

      <div className="graph-report-bias-row">
        <span className="graph-report-bias-label">Bias direction</span>
        <span className="graph-report-bias-value">{biasDirection}</span>
      </div>

      {biasJustification && (
        <p className="graph-report-bias-note">{biasJustification}</p>
      )}

      <div className="graph-report-body">
        <p className="graph-report-text">{assessment}</p>
      </div>
    </div>
  );
}
