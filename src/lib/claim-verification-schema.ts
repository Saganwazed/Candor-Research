import { z } from "zod";

export const VerificationStatusEnum = z.enum([
  "Supported",
  "Contradicted",
  "Unclear",
  "Partially Supported",
]);

export const NodeTypeEnum = z.enum(["claim", "source", "entity", "evidence"]);

export const EdgeTypeEnum = z.enum([
  "claims",
  "about",
  "supports",
  "contradicts",
  "related_to",
  "evidence_for",
]);

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: NodeTypeEnum,
  label: z.string(),
  description: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
});

export const GraphEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: EdgeTypeEnum,
  label: z.string().optional(),
});

export const ClaimSchema = z.object({
  id: z.string(),
  text: z.string(),
  confidence: z.number().min(0).max(100),
  verification_status: VerificationStatusEnum,
  sources: z.array(z.string()),
  supporting_evidence: z.array(z.string()).optional(),
  conflicting_evidence: z.array(z.string()).optional(),
  reasoning: z.string(),
});

export const ClaimVerificationReportSchema = z.object({
  claims: z.array(ClaimSchema),
  graph: z.object({
    nodes: z.array(GraphNodeSchema),
    edges: z.array(GraphEdgeSchema),
  }),
  summary: z.string().max(500),
  key_conflicts: z.array(
    z.object({
      claim_1: z.string(),
      claim_2: z.string(),
      conflict_description: z.string(),
      framing_differences: z.array(z.string()).optional(),
    })
  ),
  analysis_confidence: z.enum(["High", "Medium", "Low"]),
});

export type VerificationStatus = z.infer<typeof VerificationStatusEnum>;
export type NodeType = z.infer<typeof NodeTypeEnum>;
export type EdgeType = z.infer<typeof EdgeTypeEnum>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type ClaimVerificationReport = z.infer<
  typeof ClaimVerificationReportSchema
>;
