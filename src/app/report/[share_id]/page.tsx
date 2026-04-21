import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedReport, incrementViewCount } from "@/lib/share";
import type { GraphNode, GraphEdge, ClaimVerdict } from "@/lib/schema";
import ClaimGraph from "@/components/ClaimGraph";
import ClaimVerdicts from "@/components/ClaimVerdicts";
import GraphReport from "@/components/GraphReport";
import ConversionFooter from "@/components/ConversionFooter";
import SharedReportTracker from "@/components/SharedReportTracker";

interface PageProps {
  params: { share_id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const report = await getSharedReport(params.share_id);
  if (!report) return { title: "Report not found — Candor" };

  const snapshot = report.report_snapshot;
  const title = report.article_title
    ? `Candor Analysis: ${report.article_title}`
    : "Candor — News Analysis Report";
  const claimCount = snapshot.claim_verdicts?.length ?? 0;
  const description = `Bias: ${snapshot.bias_direction} · ${claimCount} claim${claimCount !== 1 ? "s" : ""} analysed · Graph-based claim verification by Candor`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      url: `${baseUrl}/report/${params.share_id}`,
      images: [`${baseUrl}/api/og-image/${params.share_id}`],
      siteName: "Candor",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${baseUrl}/api/og-image/${params.share_id}`],
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SharedReportPage({ params }: PageProps) {
  const report = await getSharedReport(params.share_id);
  if (!report) notFound();

  incrementViewCount(params.share_id).catch(() => {});

  const snapshot = report.report_snapshot;

  return (
    <SharedReportTracker shareId={params.share_id}>
      <main className="page-container">
        <header>
          <a href="/" className="shared-report-wordmark-link">
            <h1 className="wordmark" style={{ fontSize: "var(--text-2xl)" }}>
              Candor
            </h1>
          </a>

          {(report.article_title || report.source_domain) && (
            <div className="shared-report-context">
              {report.article_title && (
                <p className="shared-report-article-title">
                  &ldquo;{report.article_title}&rdquo;
                </p>
              )}
              {report.source_domain && (
                <p className="shared-report-source">{report.source_domain}</p>
              )}
            </div>
          )}
        </header>

        <div className="report">
          <div className="bias-summary report-reveal" id="section-bias-summary">
            <p className="bias-summary-text">{snapshot.bias_summary}</p>
          </div>

          {/* Claim graph */}
          {snapshot.nodes?.length > 0 && (
            <div className="report-section report-reveal report-reveal-delay-1" id="section-claim-graph">
              <h2 className="section-heading">Claim graph</h2>
              <p className="graph-section-intro">
                Sources, claims, and entities extracted from the article — mapped with their logical relationships.
              </p>
              <ClaimGraph
                nodes={snapshot.nodes as GraphNode[]}
                edges={snapshot.edges as GraphEdge[]}
              />
            </div>
          )}

          {/* Per-claim verdicts */}
          {snapshot.claim_verdicts?.length > 0 && (
            <ClaimVerdicts verdicts={snapshot.claim_verdicts as ClaimVerdict[]} />
          )}

          {/* Narrative report */}
          {snapshot.overall_assessment && (
            <GraphReport
              assessment={snapshot.overall_assessment}
              biasDirection={snapshot.bias_direction}
            />
          )}

          <div className="shared-report-attribution report-reveal report-reveal-delay-4">
            <p className="shared-report-attribution-text">
              Analysed by Candor · {formatDate(snapshot.analyzed_at)}
            </p>
            <p className="disclaimer-text">
              AI analysis — use as a starting point, not a verdict.
            </p>
          </div>
        </div>

        <ConversionFooter />
      </main>
    </SharedReportTracker>
  );
}
