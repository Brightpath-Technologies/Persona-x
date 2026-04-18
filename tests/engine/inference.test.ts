import { describe, expect, it } from "vitest";
import {
  checkCrossSectionConsistency,
  evaluateInference,
} from "../../src/engine/inference/inference.js";
import { createPipelineState } from "../../src/engine/population/pipeline.js";
import { createDiscoveryState } from "../../src/engine/discovery/discovery.js";
import type { ExtractedSignal } from "../../src/engine/discovery/discovery.js";
import type { PipelineState } from "../../src/engine/population/pipeline.js";

function stateWithSignals(signals: ExtractedSignal[]): PipelineState {
  const discovery = createDiscoveryState();
  discovery.signals = signals;
  return createPipelineState(discovery);
}

function sig(
  name: ExtractedSignal["signal"],
  value: string,
  confidence: ExtractedSignal["confidence"]
): ExtractedSignal {
  return { signal: name, value, confidence, source_question_id: "q" };
}

describe("evaluateInference", () => {
  it("refuses to infer boundaries under any circumstance", () => {
    const state = stateWithSignals([
      sig("discomfort_triggers", "v", "high"),
      sig("deferral_preferences", "w", "high"),
    ]);
    const decision = evaluateInference("boundaries", state);
    expect(decision.can_infer).toBe(false);
    expect(decision.justification).toMatch(/boundaries/i);
  });

  it("refuses to infer purpose under any circumstance", () => {
    const state = stateWithSignals([sig("discomfort_triggers", "v", "high")]);
    const decision = evaluateInference("purpose", state);
    expect(decision.can_infer).toBe(false);
    expect(decision.justification).toMatch(/purpose/i);
  });

  it("infers rubric with high confidence given two high-confidence signals", () => {
    const state = stateWithSignals([
      sig("discomfort_triggers", "v1", "high"),
      sig("evidence_change_thresholds", "v2", "high"),
    ]);
    const decision = evaluateInference("rubric", state);
    expect(decision.can_infer).toBe(true);
    expect(decision.confidence).toBe("high");
  });

  it("infers with medium confidence when signals are mixed strength", () => {
    const state = stateWithSignals([
      sig("ambiguity_handling", "v1", "high"),
      sig("pressure_behaviour", "v2", "medium"),
    ]);
    const decision = evaluateInference("reasoning", state);
    expect(decision.can_infer).toBe(true);
    expect(decision.confidence).toBe("medium");
  });

  it("declines to infer when signal coverage is insufficient", () => {
    const state = stateWithSignals([
      sig("pressure_behaviour", "v", "low"),
    ]);
    const decision = evaluateInference("reasoning", state);
    expect(decision.can_infer).toBe(false);
    expect(decision.justification).toMatch(/insufficient/i);
  });

  it("declines to infer when signals conflict", () => {
    const state = stateWithSignals([
      sig("evidence_change_thresholds", "high threshold", "high"),
      sig("evidence_change_thresholds", "low threshold", "high"),
    ]);
    const decision = evaluateInference("rubric", state);
    expect(decision.can_infer).toBe(false);
    expect(decision.conflicts.length).toBeGreaterThan(0);
  });
});

describe("checkCrossSectionConsistency", () => {
  it("warns when high evidence_threshold rubric lacks systematic questioning", () => {
    const state = stateWithSignals([]);
    state.partial_persona.rubric = {
      risk_appetite: { score: 5, note: "balanced risk" },
      evidence_threshold: { score: 9, note: "demands rigorous evidence" },
      tolerance_for_ambiguity: { score: 5, note: "balanced tolerance" },
      intervention_frequency: { score: 5, note: "moderate intervention" },
      escalation_bias: { score: 5, note: "moderate escalation" },
      delivery_vs_rigour_bias: { score: 5, note: "balanced" },
    };
    state.partial_persona.reasoning = {
      default_assumptions: ["ok"],
      notices_first: ["ok"],
      systematically_questions: [],
      under_pressure: "holds",
    };
    const warnings = checkCrossSectionConsistency("reasoning", state);
    expect(warnings.some((w) => w.includes("systematically"))).toBe(true);
  });

  it("warns when high intervention is paired with gentle questioning", () => {
    const state = stateWithSignals([]);
    state.partial_persona.rubric = {
      risk_appetite: { score: 5, note: "balanced" },
      evidence_threshold: { score: 5, note: "balanced" },
      tolerance_for_ambiguity: { score: 5, note: "balanced" },
      intervention_frequency: { score: 9, note: "steps in constantly" },
      escalation_bias: { score: 5, note: "balanced" },
      delivery_vs_rigour_bias: { score: 5, note: "balanced" },
    };
    state.partial_persona.interaction = {
      primary_mode: "questions",
      challenge_strength: "gentle",
      silent_when: ["never"],
      handles_poor_input: "gently redirects",
    };
    const warnings = checkCrossSectionConsistency("interaction", state);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("returns no warnings when rubric is absent", () => {
    const state = stateWithSignals([]);
    expect(checkCrossSectionConsistency("reasoning", state)).toEqual([]);
    expect(checkCrossSectionConsistency("interaction", state)).toEqual([]);
  });
});
