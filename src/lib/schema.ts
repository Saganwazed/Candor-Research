import { z } from "zod";

export const BiasDirectionEnum = z.enum([
  "Left",
  "Center-Left",
  "Center",
  "Center-Right",
  "Right",
  "Unclear",
]);

export const ConfidenceEnum = z.enum(["High", "Medium", "Low"]);

export const NodeTypeEnum = z.enum(["source", "claim", "entity"]);

export const EdgeRelationEnum = z.enum([
  "claims",      // source makes this claim
  "about",       // claim/source is about this entity
  "contradicts", // claim directly contradicts another claim
  "supports",    // source or evidence supports a claim
  "misleading",  // claim is characterised as misleading
  "cites",       // source cites another source
]);

export const VerdictEnum = z.enum([
  "supported",
  "contradicted",
  "unverifiable",
  "misleading",
]);

export const GraphNodeSchema = z.object({
  id: z.string().max(20),
  type: NodeTypeEnum,
  label: z.string().max(200),
});

export const GraphEdgeSchema = z.object({
  from: z.string().max(20),
  to: z.string().max(20),
  relation: EdgeRelationEnum,
});

export const ClaimVerdictSchema = z.object({
  node_id: z.string().max(20),
  claim_text: z.string().max(500),
  evidence_support: z.string().max(600),
  conflicting_sources: z.string().max(600),
  framing_analysis: z.string().max(600),
  verdict: VerdictEnum,
});

// Stage 1 output: graph structure
export const ClaimGraphSchema = z.object({
  content_suitable: z.boolean(),
  nodes: z.array(GraphNodeSchema).max(30),
  edges: z.array(GraphEdgeSchema).max(60),
});

// Stage 2 output: reasoning over the graph
export const GraphReasoningSchema = z.object({
  claim_verdicts: z.array(ClaimVerdictSchema).max(20),
  overall_assessment: z.string().max(1500),
  bias_direction: BiasDirectionEnum,
  bias_summary: z.string().max(200),
  analysis_confidence: ConfidenceEnum,
});

// Combined final response
export const GraphAnalysisResponseSchema = ClaimGraphSchema.merge(GraphReasoningSchema);

export type BiasDirection = z.infer<typeof BiasDirectionEnum>;
export type Confidence = z.infer<typeof ConfidenceEnum>;
export type NodeType = z.infer<typeof NodeTypeEnum>;
export type EdgeRelation = z.infer<typeof EdgeRelationEnum>;
export type Verdict = z.infer<typeof VerdictEnum>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type ClaimVerdict = z.infer<typeof ClaimVerdictSchema>;
export type ClaimGraph = z.infer<typeof ClaimGraphSchema>;
export type GraphReasoning = z.infer<typeof GraphReasoningSchema>;
export type GraphAnalysisResponse = z.infer<typeof GraphAnalysisResponseSchema>;
