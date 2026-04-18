import type {
  RubricProfile,
  RubricScore,
  RubricDimensionName,
} from "../../schema/rubric.js";
import {
  RUBRIC_DIMENSIONS,
  RUBRIC_DIMENSION_LABELS,
  validateRubricCoherence,
} from "../../schema/rubric.js";
import type { ExtractedSignal } from "../discovery/discovery.js";

/**
 * Rubric Scorer
 *
 * Translates discovery signals into rubric scores.
 * Implements the Rubric Population Rule.
 *
 * All rubric dimensions must result in:
 * - a numeric score on the 1-10 scale
 * - a corresponding interpretive note
 */

/** Mapping from priority signals to the rubric dimensions they influence */
const SIGNAL_TO_DIMENSION_MAP: Record<string, RubricDimensionName[]> = {
  discomfort_triggers: ["risk_appetite", "escalation_bias"],
  evidence_change_thresholds: ["evidence_threshold", "delivery_vs_rigour_bias"],
  ambiguity_handling: ["tolerance_for_ambiguity", "delivery_vs_rigour_bias"],
  pressure_behaviour: [
    "intervention_frequency",
    "escalation_bias",
    "delivery_vs_rigour_bias",
  ],
  deferral_preferences: ["escalation_bias", "intervention_frequency"],
};

/** Candidate score with its source */
export interface ScoreCandidate {
  dimension: RubricDimensionName;
  score: number;
  confidence: "high" | "medium" | "low";
  source: string;
  reasoning: string;
}

/**
 * Analyse signals and produce score candidates for each dimension.
 * This is the intermediate step — candidates are then resolved into final scores.
 */
export function generateScoreCandidates(
  signals: ExtractedSignal[],
): ScoreCandidate[] {
  const candidates: ScoreCandidate[] = [];

  for (const signal of signals) {
    const dimensions = SIGNAL_TO_DIMENSION_MAP[signal.signal];
    if (!dimensions) continue;

    for (const dimension of dimensions) {
      candidates.push({
        dimension,
        score: 5, // Default midpoint — will be refined by LLM interpretation
        confidence: signal.confidence,
        source: signal.source_question_id,
        reasoning: `Derived from ${signal.signal}: ${signal.value}`,
      });
    }
  }

  return candidates;
}

/**
 * Resolve multiple score candidates for a dimension into a single score.
 * Higher-confidence candidates take priority. When confidence is equal,
 * scores are averaged.
 */
export function resolveScore(
  dimension: RubricDimensionName,
  candidates: ScoreCandidate[],
): RubricScore | null {
  const relevant = candidates.filter((c) => c.dimension === dimension);
  if (relevant.length === 0) return null;

  // Sort by confidence: high > medium > low
  const confidenceOrder = { high: 3, medium: 2, low: 1 };
  relevant.sort(
    (a, b) => confidenceOrder[b.confidence] - confidenceOrder[a.confidence],
  );

  // Use highest-confidence candidates
  const bestConfidence = relevant[0]!.confidence;
  const bestCandidates = relevant.filter(
    (c) => c.confidence === bestConfidence,
  );

  // Average the scores from equally-confident candidates
  const avgScore = Math.round(
    bestCandidates.reduce((sum, c) => sum + c.score, 0) / bestCandidates.length,
  );

  // Build interpretive note from the reasoning
  const note = bestCandidates.map((c) => c.reasoning).join(". ");

  return {
    score: Math.max(1, Math.min(10, avgScore)),
    note,
  };
}

/**
 * Build a complete rubric profile from discovery signals.
 * Returns the profile plus any coherence warnings.
 */
export function buildRubricProfile(signals: ExtractedSignal[]): {
  profile: Partial<RubricProfile>;
  warnings: string[];
  missing_dimensions: RubricDimensionName[];
} {
  const candidates = generateScoreCandidates(signals);
  const profile: Partial<RubricProfile> = {};
  const missingDimensions: RubricDimensionName[] = [];

  for (const dimension of RUBRIC_DIMENSIONS) {
    const resolved = resolveScore(dimension, candidates);
    if (resolved) {
      (profile as Record<string, RubricScore>)[dimension] = resolved;
    } else {
      missingDimensions.push(dimension);
    }
  }

  // Check coherence if we have a complete profile
  let warnings: string[] = [];
  if (missingDimensions.length === 0) {
    warnings = validateRubricCoherence(profile as RubricProfile);
  }

  return { profile, warnings, missing_dimensions: missingDimensions };
}

/**
 * Format a rubric profile for human-readable display.
 */
export function formatRubricProfile(profile: RubricProfile): string {
  const lines: string[] = ["## Judgement & Reasoning Profile", ""];

  for (const dimension of RUBRIC_DIMENSIONS) {
    const score = profile[dimension];
    const label = RUBRIC_DIMENSION_LABELS[dimension];
    const bar = "█".repeat(score.score) + "░".repeat(10 - score.score);
    lines.push(`**${label}**: ${bar} ${score.score}/10`);
    lines.push(`  ${score.note}`);
    lines.push("");
  }

  return lines.join("\n");
}
