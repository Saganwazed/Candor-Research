import { randomBytes } from "crypto";

export const CLAIM_EXTRACTION_SYSTEM_PROMPT = `You are a claim extraction engine. Your job is to extract key factual claims from articles that can be verified against external sources.

## Instructions

Extract all major factual claims from the provided article. For each claim:
1. Identify the specific factual assertion
2. Identify the source(s) cited for that claim
3. Extract any numerical data, dates, or specific facts
4. Note if the claim is presented as direct fact or attributed to a source

A claim can contain multiple pieces of information. For example:
"Country X's unemployment rate increased by 30% in 2025, according to NewsSource A" contains:
- Claim: unemployment rate increase
- Data: 30%
- Timeframe: 2025
- Source: NewsSource A

Return ONLY valid JSON with no preamble or markdown.`;

export const CLAIM_VERIFICATION_SYSTEM_PROMPT = `You are a claim verification and reasoning engine. Your job is to analyze extracted claims against available information and build a graph showing relationships, conflicts, and verification status.

## Instructions

For each claim provided:
1. Assess verification status (Supported/Contradicted/Unclear/Partially Supported)
2. Identify supporting and contradicting evidence
3. Note conflicting sources with different framing
4. Explain the reasoning for each verification
5. Build a graph showing claim relationships and evidence connections

When verifying claims:
- Use your internal knowledge about facts, statistics, and current events
- Identify when sources report the same fact differently (e.g., different statistics)
- Note when claims are contradicted by reliable sources
- Identify framing differences between sources
- Assess confidence based on evidence strength

For the graph:
- Nodes: claims, sources, entities, evidence pieces
- Edges: "claims" (source makes claim), "about" (claim concerns entity), "supports" (evidence supports claim), "contradicts" (evidence contradicts claim), "related_to" (related claims)

Return ONLY valid JSON with no preamble or markdown.`;

export function buildClaimExtractionPrompt(articleText: string): string {
  const boundary = randomBytes(16).toString("hex");
  const openTag = `<article-${boundary}>`;
  const closeTag = `</article-${boundary}>`;

  const sanitized = articleText
    .replace(new RegExp(`</article-${boundary}>`, "gi"), "")
    .replace(/<\/article[^>]*>/gi, "");

  return `Extract all major factual claims from the following article:\n\n${openTag}\n${sanitized}\n${closeTag}

Return a JSON object with this structure:
{
  "claims": [
    {
      "id": "claim_1",
      "text": "The specific claim text",
      "sources": ["source name or 'article' if not attributed"],
      "entities": ["entity1", "entity2"],
      "numerical_data": {"key": "value"} or null,
      "timeframe": "when this claim is about"
    }
  ]
}`;
}

export function buildClaimVerificationPrompt(
  claims: Array<{ id: string; text: string; sources: string[] }>,
  articleText: string
): string {
  const claimsJson = JSON.stringify(claims, null, 2);
  const boundary = randomBytes(16).toString("hex");
  const openTag = `<article-${boundary}>`;
  const closeTag = `</article-${boundary}>`;

  const sanitized = articleText
    .replace(new RegExp(`</article-${boundary}>`, "gi"), "")
    .replace(/<\/article[^>]*>/gi, "");

  return `You have extracted the following claims from an article:

${claimsJson}

Now verify these claims against available information. For each claim:
1. Determine if it is supported, contradicted, unclear, or partially supported
2. Identify any conflicting information from different sources
3. Note framing differences if the same fact is reported differently
4. Build a relationship graph between claims and sources

Article context:
${openTag}
${sanitized}
${closeTag}

Return a JSON object with this structure:
{
  "verified_claims": [
    {
      "id": "claim_1",
      "text": "The claim text",
      "confidence": 85,
      "verification_status": "Supported" | "Contradicted" | "Unclear" | "Partially Supported",
      "sources": ["source1", "source2"],
      "supporting_evidence": ["evidence describing why it's supported"],
      "conflicting_evidence": ["evidence describing contradictions"],
      "reasoning": "Detailed reasoning about verification"
    }
  ],
  "graph": {
    "nodes": [
      {
        "id": "node_id",
        "type": "claim" | "source" | "entity" | "evidence",
        "label": "Display name",
        "description": "Description",
        "confidence": 85
      }
    ],
    "edges": [
      {
        "source": "node_1",
        "target": "node_2",
        "type": "claims" | "about" | "supports" | "contradicts" | "related_to" | "evidence_for",
        "label": "Optional label"
      }
    ]
  },
  "key_conflicts": [
    {
      "claim_1": "First conflicting claim",
      "claim_2": "Second conflicting claim",
      "conflict_description": "Description of the conflict",
      "framing_differences": ["difference 1", "difference 2"]
    }
  ],
  "summary": "Overall summary of claim verification",
  "analysis_confidence": "High" | "Medium" | "Low"
}`;
}
