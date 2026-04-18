import { z } from "zod";

/**
 * The six fixed rubric dimensions for persona judgement profiles.
 * These names, meanings, and scale are non-negotiable.
 */
export const RUBRIC_DIMENSIONS = [
  "risk_appetite",
  "evidence_threshold",
  "tolerance_for_ambiguity",
  "intervention_frequency",
  "escalation_bias",
  "delivery_vs_rigour_bias",
] as const;

export type RubricDimensionName = (typeof RUBRIC_DIMENSIONS)[number];

export const RUBRIC_DIMENSION_LABELS: Record<RubricDimensionName, string> = {
  risk_appetite: "Risk Appetite",
  evidence_threshold: "Evidence Threshold",
  tolerance_for_ambiguity: "Tolerance for Ambiguity",
  intervention_frequency: "Intervention Frequency",
  escalation_bias: "Escalation Bias",
  delivery_vs_rigour_bias: "Delivery vs Rigour Bias",
};

export const RUBRIC_DIMENSION_DESCRIPTIONS: Record<
  RubricDimensionName,
  string
> = {
  risk_appetite:
    "How willing the persona is to accept downside, uncertainty, or incomplete assurance in order to move forward.",
  evidence_threshold:
    "How much and what kind of evidence the persona requires before accepting a claim, proposal, or conclusion.",
  tolerance_for_ambiguity:
    "How comfortable the persona is operating when inputs are incomplete, messy, or still evolving.",
  intervention_frequency:
    "How often the persona tends to step into a discussion to challenge, clarify, or redirect.",
  escalation_bias:
    "How quickly the persona tends to escalate issues, risks, or concerns rather than handling them locally.",
  delivery_vs_rigour_bias:
    "Where the persona naturally sits on the spectrum between speed/enablement and thoroughness/precision.",
};

/**
 * A single rubric dimension score.
 * Score is 1-10 with a mandatory interpretive note.
 * The note explains how the score shows up in practice — not why it is "good" or "bad".
 */
export const RubricScoreSchema = z.object({
  score: z
    .number()
    .int()
    .min(1, "Rubric scores must be at least 1")
    .max(10, "Rubric scores must be at most 10"),
  note: z
    .string()
    .min(10, "Interpretive notes must be meaningful — at least 10 characters")
    .describe(
      "Explains how the score shows up in practice. What the persona is likely to push on, let pass, or how it behaves at extremes.",
    ),
});

export type RubricScore = z.infer<typeof RubricScoreSchema>;

/**
 * The complete judgement & reasoning profile.
 * All six dimensions are required. No optional dimensions.
 */
export const RubricProfileSchema = z.object({
  risk_appetite: RubricScoreSchema,
  evidence_threshold: RubricScoreSchema,
  tolerance_for_ambiguity: RubricScoreSchema,
  intervention_frequency: RubricScoreSchema,
  escalation_bias: RubricScoreSchema,
  delivery_vs_rigour_bias: RubricScoreSchema,
});

export type RubricProfile = z.infer<typeof RubricProfileSchema>;

/**
 * Validate that a rubric profile is internally coherent.
 * Returns an array of warnings (not errors) for potentially inconsistent combinations.
 */
export function validateRubricCoherence(profile: RubricProfile): string[] {
  const warnings: string[] = [];

  // High risk appetite + high evidence threshold is unusual (wants to move fast but needs lots of proof)
  if (
    profile.risk_appetite.score >= 8 &&
    profile.evidence_threshold.score >= 8
  ) {
    warnings.push(
      "High risk appetite (${profile.risk_appetite.score}) combined with high evidence threshold (${profile.evidence_threshold.score}) is unusual. " +
        "Consider whether the persona genuinely needs strong evidence before taking risks, or whether one score should be adjusted.",
    );
  }

  // Low tolerance for ambiguity + low evidence threshold is unusual
  if (
    profile.tolerance_for_ambiguity.score <= 3 &&
    profile.evidence_threshold.score <= 3
  ) {
    warnings.push(
      "Low tolerance for ambiguity combined with low evidence threshold suggests the persona wants clarity but doesn't require strong proof. Verify this is intentional.",
    );
  }

  // High intervention frequency + low escalation bias means the persona intervenes a lot but doesn't escalate
  // This is valid (hands-on fixer) but worth flagging
  if (
    profile.intervention_frequency.score >= 8 &&
    profile.escalation_bias.score <= 3
  ) {
    warnings.push(
      "High intervention frequency with low escalation bias suggests a hands-on persona that prefers to fix issues locally rather than escalate. Confirm this is the intended pattern.",
    );
  }

  return warnings;
}
