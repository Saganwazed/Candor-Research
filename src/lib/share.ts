import { nanoid } from "nanoid";
import { createApiClient } from "@/utils/supabase/api";
import type { AnalysisResponse } from "./schema";

// --- Types ---

export interface SharedReportSnapshot {
  bias_summary: string;
  bias_direction: string;
  bias_justification: string;
  credibility_flags: Array<{ flag_type: string; description: string }>;
  hidden_agenda: string;
  analysis_confidence: string;
  content_suitable: boolean;
  article_title: string | null;
  source_domain: string | null;
  analyzed_at: string;
}

export interface SharedReportRow {
  id: string;
  share_id: string;
  report_snapshot: SharedReportSnapshot;
  source_domain: string | null;
  article_title: string | null;
  creator_session_id: string | null;
  is_public: boolean;
  view_count: number;
  created_at: string;
  expires_at: string | null;
}

// --- Share ID Generation ---

export function generateShareId(): string {
  return nanoid(12);
}

// --- Snapshot Sanitization ---

export function sanitizeSnapshot(
  analysis: AnalysisResponse,
  sourceUrl: string | null,
  articleTitle: string | null
): SharedReportSnapshot {
  let sourceDomain: string | null = null;
  if (sourceUrl) {
    try {
      sourceDomain = new URL(sourceUrl).hostname;
    } catch {
      sourceDomain = null;
    }
  }

  return {
    bias_summary: analysis.bias_summary,
    bias_direction: analysis.bias_direction,
    bias_justification: analysis.bias_justification,
    credibility_flags: analysis.credibility_flags.map((f) => ({
      flag_type: f.flag_type,
      description: f.description,
    })),
    hidden_agenda: analysis.hidden_agenda,
    analysis_confidence: analysis.analysis_confidence,
    content_suitable: analysis.content_suitable,
    article_title: articleTitle?.slice(0, 200) ?? null,
    source_domain: sourceDomain,
    analyzed_at: new Date().toISOString(),
  };
}

// --- Public API ---

export async function createSharedReport(
  analysis: AnalysisResponse,
  sourceUrl: string | null,
  articleTitle: string | null,
  sessionId: string | null
): Promise<{ share_id: string }> {
  const supabase = createApiClient();
  const shareId = generateShareId();
  const snapshot = sanitizeSnapshot(analysis, sourceUrl, articleTitle);

  const { error } = await supabase.from("shared_reports").insert({
    share_id: shareId,
    report_snapshot: snapshot,
    source_domain: snapshot.source_domain,
    article_title: snapshot.article_title,
    creator_session_id: sessionId,
    is_public: true,
    view_count: 0,
  });

  if (error) throw new Error(`Failed to create shared report: ${error.message}`);

  return { share_id: shareId };
}

export async function getSharedReport(
  shareId: string
): Promise<SharedReportRow | null> {
  const supabase = createApiClient();

  const { data } = await supabase
    .from("shared_reports")
    .select("*")
    .eq("share_id", shareId)
    .eq("is_public", true)
    .maybeSingle();

  return data ?? null;
}

export async function getSharedReportForOwner(
  shareId: string,
  sessionId: string
): Promise<SharedReportRow | null> {
  const supabase = createApiClient();

  const { data } = await supabase
    .from("shared_reports")
    .select("*")
    .eq("share_id", shareId)
    .eq("creator_session_id", sessionId)
    .maybeSingle();

  return data ?? null;
}

export async function toggleReportVisibility(
  shareId: string,
  sessionId: string,
  isPublic: boolean
): Promise<{ success: boolean }> {
  const supabase = createApiClient();

  const { count } = await supabase
    .from("shared_reports")
    .update({ is_public: isPublic }, { count: "exact" })
    .eq("share_id", shareId)
    .eq("creator_session_id", sessionId);

  return { success: (count ?? 0) > 0 };
}

export async function incrementViewCount(shareId: string): Promise<void> {
  const supabase = createApiClient();

  await supabase.rpc("increment_view_count", { p_share_id: shareId });
}
