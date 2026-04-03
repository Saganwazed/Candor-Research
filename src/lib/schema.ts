import { z } from "zod";

export const BiasDirectionEnum = z.enum([
  "Left",
  "Center-Left",
  "Center",
  "Center-Right",
  "Right",
  "Unclear",
]);

export const FlagTypeEnum = z.enum([
  "Unverified Claim",
  "Missing Context",
  "Loaded Language",
  "Anonymous Sourcing",
  "Statistical Misuse",
  "False Balance",
]);

export const ConfidenceEnum = z.enum(["High", "Medium", "Low"]);

export const CredibilityFlagSchema = z.object({
  flag_type: FlagTypeEnum,
  description: z.string().max(500),
});

export const AnalysisResponseSchema = z.object({
  bias_summary: z.string().max(200),
  bias_direction: BiasDirectionEnum,
  bias_justification: z.string().max(500),
  credibility_flags: z.array(CredibilityFlagSchema).max(10),
  hidden_agenda: z.string().max(500),
  analysis_confidence: ConfidenceEnum,
  content_suitable: z.boolean(),
});

export type BiasDirection = z.infer<typeof BiasDirectionEnum>;
export type FlagType = z.infer<typeof FlagTypeEnum>;
export type Confidence = z.infer<typeof ConfidenceEnum>;
export type CredibilityFlag = z.infer<typeof CredibilityFlagSchema>;
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
