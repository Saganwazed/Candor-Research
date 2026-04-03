import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedReport, incrementViewCount } from "@/lib/share";
import type { BiasDirection as BiasDirectionType, CredibilityFlag } from "@/lib/schema";
import BiasDirection from "@/components/BiasDirection";
import CredibilityFlags from "@/components/CredibilityFlags";
import HiddenAgenda from "@/components/HiddenAgenda";
import ConversionFooter from "@/components/ConversionFooter";

interface PageProps {
  params: { share_id: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const report = await getSharedReport(params.share_id);

  if (!report) {
    return { title: "Report not found — Candor" };
  }

  const snapshot = report.report_snapshot;
  const title = report.article_title
    ? `Candor Analysis: ${report.article_title}`
    : "Candor — News Bias Report";
  const description = `Bias: ${snapshot.bias_direction} · ${snapshot.credibility_flags.length} credibility flags detected · Analyzed by Candor`;

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
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SharedReportPage({ params }: PageProps) {
  const report = await getSharedReport(params.share_id);

  if (!report) {
    notFound();
  }

  // Fire-and-forget view count increment
  incrementViewCount(params.share_id).catch(() => {});

  const snapshot = report.report_snapshot;

  return (
    <main className="page-container">
      {/* Header — Wordmark linked to homepage */}
      <header>
        <a href="/" className="shared-report-wordmark-link">
          <h1 className="wordmark" style={{ fontSize: "var(--text-2xl)" }}>
            Candor
          </h1>
        </a>

        {/* Article context */}
        {(report.article_title || report.source_domain) && (
          <div className="shared-report-context">
            {report.article_title && (
              <p className="shared-report-article-title">
                &ldquo;{report.article_title}&rdquo;
              </p>
            )}
            {report.source_domain && (
              <p className="shared-report-source">
                {report.source_domain}
              </p>
            )}
          </div>
        )}
      </header>

      {/* Report Content */}
      <div className="report">
        {/* Bias Summary */}
        <div className="bias-summary report-reveal" id="section-bias-summary">
          <p className="bias-summary-text">{snapshot.bias_summary}</p>
        </div>

        {/* Bias Direction */}
        <BiasDirection
          direction={snapshot.bias_direction as BiasDirectionType}
          justification={snapshot.bias_justification}
        />

        {/* Credibility Flags */}
        <CredibilityFlags
          flags={snapshot.credibility_flags as CredibilityFlag[]}
        />

        {/* Hidden Agenda */}
        <HiddenAgenda agenda={snapshot.hidden_agenda} />

        {/* Attribution */}
        <div className="shared-report-attribution report-reveal report-reveal-delay-4">
          <p className="shared-report-attribution-text">
            Analyzed by Candor · {formatDate(snapshot.analyzed_at)}
          </p>
          <p className="disclaimer-text">
            AI analysis — use as a starting point, not a verdict.
          </p>
        </div>
      </div>

      {/* Conversion Footer */}
      <ConversionFooter />
    </main>
  );
}
