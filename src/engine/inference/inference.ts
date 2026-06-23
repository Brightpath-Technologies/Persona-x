import type { ExtractedSignal } from "../discovery/discovery.js";
import type {
  PipelineState,
  PopulationSection,
} from "../population/pipeline.js";

/**
 * Inference Engine
 *
 * Implements the Ask vs Infer Rule.
 *
 * The engine must ask for input when:
 * - ambiguity would materially change persona behaviour, or
 * - a boundary, refusal, or escalation posture is unclear.
 *
 * The engine may infer when:
 * - multiple signals point in the same direction, and
 * - inference maintains consistency with earlier sections.
 *
 * Inference is allowed to keep momentum, not to invent behaviour.
 */

export interface InferenceDecision {
  section: PopulationSection;
  can_infer: boolean;
  confidence: "high" | "medium" | "low";
  justification: string;
  supporting_signals: ExtractedSignal[];
  conflicts: string[];
}

/**
 * Determine whether a section can be safely inferred from existing signals.
 * Returns a structured decision with justification.
 */
export function evaluateInference(
  section: PopulationSection,
  state: PipelineState,
): InferenceDecision {
  const signals = state.discovery.signals;

  // Boundaries must always be asked — never inferred
  if (section === "boundaries") {
    return {
      section,
      can_infer: false,
      confidence: "low",
      justification:
        "Boundaries, refusals, and escalation postures must be explicitly stated. Inference is not permitted for boundaries.",
      supporting_signals: [],
      conflicts: [],
    };
  }

  // Purpose must always be asked
  if (section === "purpose") {
    return {
      section,
      can_infer: false,
      confidence: "low",
      justification:
        "Persona purpose is foundational and must be stated by the user. Inference is not permitted for purpose.",
      supporting_signals: [],
      conflicts: [],
    };
  }

  // For other sections, check signal coverage and direction
  const relevantSignals = getRelevantSignals(section, signals);
  const conflicts = detectConflicts(relevantSignals);

  if (conflicts.length > 0) {
    return {
      section,
      can_infer: false,
      confidence: "low",
      justification: `Conflicting signals detected: ${conflicts.join("; ")}. Must ask user to resolve.`,
      supporting_signals: relevantSignals,
      conflicts,
    };
  }

  const highConfidenceCount = relevantSignals.filter(
    (s) => s.confidence === "high",
  ).length;
  const mediumConfidenceCount = relevantSignals.filter(
    (s) => s.confidence === "medium",
  ).length;

  // Need at least 2 signals pointing the same direction to infer
  if (highConfidenceCount >= 2) {
    return {
      section,
      can_infer: true,
      confidence: "high",
      justification: `${highConfidenceCount} high-confidence signals converge. Safe to infer.`,
      supporting_signals: relevantSignals,
      conflicts: [],
    };
  }

  if (highConfidenceCount >= 1 && mediumConfidenceCount >= 1) {
    return {
      section,
      can_infer: true,
      confidence: "medium",
      justification: `Mixed confidence signals (${highConfidenceCount} high, ${mediumConfidenceCount} medium) but directionally consistent. Can infer with flagging.`,
      supporting_signals: relevantSignals,
      conflicts: [],
    };
  }

  return {
    section,
    can_infer: false,
    confidence: "low",
    justification:
      "Insufficient signal strength to infer safely. Must ask user.",
    supporting_signals: relevantSignals,
    conflicts: [],
  };
}

/**
 * Get signals relevant to a specific population section.
 */
function getRelevantSignals(
  section: PopulationSection,
  signals: ExtractedSignal[],
): ExtractedSignal[] {
  const sectionSignalMap: Record<PopulationSection, string[]> = {
    purpose: [],
    panel_role: ["discomfort_triggers", "deferral_preferences"],
    rubric: [
      "discomfort_triggers",
      "evidence_change_thresholds",
      "ambiguity_handling",
      "pressure_behaviour",
      "deferral_preferences",
    ],
    reasoning: [
      "evidence_change_thresholds",
      "ambiguity_handling",
      "pressure_behaviour",
    ],
    interaction: ["pressure_behaviour", "deferral_preferences"],
    boundaries: [],
    optional: [],
  };

  const relevantSignalNames = sectionSignalMap[section] ?? [];
  return signals.filter((s) => relevantSignalNames.includes(s.signal));
}

/**
 * Detect conflicting signals within a set.
 * Returns descriptions of the conflicts found.
 */
function detectConflicts(signals: ExtractedSignal[]): string[] {
  const conflicts: string[] = [];

  // Group signals by type
  const bySignal = new Map<string, ExtractedSignal[]>();
  for (const signal of signals) {
    const existing = bySignal.get(signal.signal) ?? [];
    existing.push(signal);
    bySignal.set(signal.signal, existing);
  }

  // Check for contradictory values within the same signal type
  for (const [signalName, signalGroup] of bySignal) {
    if (signalGroup.length < 2) continue;

    const values = signalGroup.map((s) => s.value);
    const uniqueValues = new Set(values);
    if (uniqueValues.size > 1) {
      conflicts.push(
        `Signal '${signalName}' has conflicting values: ${[...uniqueValues].join(" vs ")}`,
      );
    }
  }

  return conflicts;
}

/**
 * Check whether a newly populated section is consistent with previously
 * populated sections. Enforces the rule: "Later sections may not
 * contradict earlier ones without explicit confirmation."
 */
export function checkCrossSectionConsistency(
  section: PopulationSection,
  state: PipelineState,
): string[] {
  const warnings: string[] = [];

  // If we have rubric and reasoning, check alignment
  if (section === "reasoning" && state.partial_persona.rubric) {
    const rubric = state.partial_persona.rubric;

    // High evidence threshold should align with reasoning that questions claims
    if (rubric.evidence_threshold.score >= 7) {
      const reasoning = state.partial_persona.reasoning;
      if (reasoning && reasoning.systematically_questions.length === 0) {
        warnings.push(
          "Reasoning has no systematically questioned items, but the rubric shows high evidence threshold. These should align.",
        );
      }
    }
  }

  // If we have rubric and interaction, check alignment
  if (section === "interaction" && state.partial_persona.rubric) {
    const rubric = state.partial_persona.rubric;
    const interaction = state.partial_persona.interaction;

    // High intervention frequency should align with active interaction style
    if (
      rubric.intervention_frequency.score >= 7 &&
      interaction?.primary_mode === "questions" &&
      interaction?.challenge_strength === "gentle"
    ) {
      warnings.push(
        "Interaction style shows gentle questioning, but the rubric indicates high intervention frequency. Consider whether the persona actively intervenes with questions or remains more passive.",
      );
    }
  }

  return warnings;
}
