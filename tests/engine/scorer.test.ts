import { describe, expect, it } from "vitest";
import {
  buildRubricProfile,
  formatRubricProfile,
  generateScoreCandidates,
  resolveScore,
} from "../../src/engine/rubric/scorer.js";
import type { ExtractedSignal } from "../../src/engine/discovery/discovery.js";
import type { RubricProfile } from "../../src/schema/rubric.js";

function signal(
  name: ExtractedSignal["signal"],
  value: string,
  confidence: ExtractedSignal["confidence"] = "high",
  source = "q1",
): ExtractedSignal {
  return {
    signal: name,
    value,
    confidence,
    source_question_id: source,
  };
}

describe("generateScoreCandidates", () => {
  it("maps each signal to its targeted dimensions", () => {
    const candidates = generateScoreCandidates([
      signal("discomfort_triggers", "bad assumptions"),
    ]);
    const dims = candidates.map((c) => c.dimension).sort();
    expect(dims).toEqual(["escalation_bias", "risk_appetite"]);
  });

  it("carries source confidence through to the candidate", () => {
    const candidates = generateScoreCandidates([
      signal("ambiguity_handling", "tolerates missing data", "medium"),
    ]);
    for (const c of candidates) {
      expect(c.confidence).toBe("medium");
      expect(c.reasoning).toContain("ambiguity_handling");
    }
  });

  it("ignores signals that don't map to a dimension", () => {
    const candidates = generateScoreCandidates([
      {
        signal: "discomfort_triggers" as ExtractedSignal["signal"],
        value: "v",
        confidence: "high",
        source_question_id: "q",
      },
    ]);
    expect(candidates.length).toBeGreaterThan(0);
  });
});

describe("resolveScore", () => {
  it("returns null when no candidates for the dimension", () => {
    expect(resolveScore("risk_appetite", [])).toBeNull();
  });

  it("prefers higher-confidence candidates", () => {
    const result = resolveScore("risk_appetite", [
      {
        dimension: "risk_appetite",
        score: 2,
        confidence: "low",
        source: "a",
        reasoning: "low",
      },
      {
        dimension: "risk_appetite",
        score: 8,
        confidence: "high",
        source: "b",
        reasoning: "high-confidence evidence",
      },
    ]);
    expect(result?.score).toBe(8);
    expect(result?.note).toContain("high-confidence evidence");
  });

  it("averages equal-confidence candidates", () => {
    const result = resolveScore("evidence_threshold", [
      {
        dimension: "evidence_threshold",
        score: 6,
        confidence: "high",
        source: "a",
        reasoning: "r1",
      },
      {
        dimension: "evidence_threshold",
        score: 8,
        confidence: "high",
        source: "b",
        reasoning: "r2",
      },
    ]);
    expect(result?.score).toBe(7);
    expect(result?.note).toBe("r1. r2");
  });

  it("clamps resolved scores to the 1-10 range", () => {
    const result = resolveScore("risk_appetite", [
      {
        dimension: "risk_appetite",
        score: 99,
        confidence: "high",
        source: "a",
        reasoning: "r",
      },
    ]);
    expect(result?.score).toBe(10);
  });
});

describe("buildRubricProfile", () => {
  it("reports missing dimensions when signal coverage is sparse", () => {
    const result = buildRubricProfile([signal("discomfort_triggers", "v")]);
    expect(result.missing_dimensions.length).toBeGreaterThan(0);
  });

  it("returns no missing dimensions when all six are covered", () => {
    const allSignals: ExtractedSignal[] = [
      signal("discomfort_triggers", "v1"),
      signal("evidence_change_thresholds", "v2"),
      signal("ambiguity_handling", "v3"),
      signal("pressure_behaviour", "v4"),
      signal("deferral_preferences", "v5"),
    ];
    const result = buildRubricProfile(allSignals);
    expect(result.missing_dimensions).toEqual([]);
  });

  it("produces coherence warnings only when profile is complete", () => {
    const sparse = buildRubricProfile([signal("discomfort_triggers", "v")]);
    expect(sparse.warnings).toEqual([]);
  });
});

describe("formatRubricProfile", () => {
  it("renders bars and notes for every dimension", () => {
    const profile: RubricProfile = {
      risk_appetite: { score: 3, note: "Conservative risk posture overall." },
      evidence_threshold: {
        score: 8,
        note: "Requires substantive evidence before accepting.",
      },
      tolerance_for_ambiguity: {
        score: 4,
        note: "Prefers clarity; uncomfortable with missing data.",
      },
      intervention_frequency: {
        score: 7,
        note: "Steps in often when assumptions look unsafe.",
      },
      escalation_bias: {
        score: 6,
        note: "Escalates moderately, favouring formal channels.",
      },
      delivery_vs_rigour_bias: {
        score: 3,
        note: "Leans strongly toward rigour over delivery speed.",
      },
    };

    const output = formatRubricProfile(profile);
    expect(output).toContain("Risk Appetite");
    expect(output).toContain("Evidence Threshold");
    expect(output).toContain("3/10");
    expect(output).toContain("8/10");
    expect(output).toContain("█");
  });
});
