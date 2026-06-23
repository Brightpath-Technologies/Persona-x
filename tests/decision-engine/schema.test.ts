import { describe, it, expect } from "vitest";
import {
  calculateCompositeScore,
  checkStage1Gate,
  checkStage2Gate,
  EVALUATION_DIMENSIONS,
  EVALUATION_WEIGHTS,
  type EvaluationScore,
  type EvaluationDimension,
  type OpportunityBrief,
  type ChallengeReport,
} from "../../src/decision-engine/schema.js";

function makeEvalScores(
  overrides: Partial<Record<EvaluationDimension, number>> = {},
): Record<EvaluationDimension, EvaluationScore> {
  const defaults: Record<EvaluationDimension, number> = {
    problem_severity: 8,
    societal_benefit: 7,
    market_viability: 7,
    persona_x_fit: 8,
    defensibility: 6,
    execution_complexity: 5,
  };

  const merged = { ...defaults, ...overrides };
  const result: Partial<Record<EvaluationDimension, EvaluationScore>> = {};

  for (const dim of EVALUATION_DIMENSIONS) {
    result[dim] = {
      score: merged[dim],
      note: `Test note for ${dim} with score ${merged[dim]}`,
    };
  }

  return result as Record<EvaluationDimension, EvaluationScore>;
}

describe("Evaluation Dimensions", () => {
  it("has exactly 6 dimensions", () => {
    expect(EVALUATION_DIMENSIONS).toHaveLength(6);
  });

  it("weights sum to 1.0", () => {
    const total = Object.values(EVALUATION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0);
  });
});

describe("calculateCompositeScore", () => {
  it("calculates weighted composite from dimension scores", () => {
    const scores = makeEvalScores();
    const composite = calculateCompositeScore(scores);

    // Manual calculation: 8*0.2 + 7*0.2 + 7*0.2 + 8*0.2 + 6*0.1 + 5*0.1
    // = 1.6 + 1.4 + 1.4 + 1.6 + 0.6 + 0.5 = 7.1
    expect(composite).toBeCloseTo(7.1);
  });

  it("returns maximum of 10 when all scores are 10", () => {
    const scores = makeEvalScores({
      problem_severity: 10,
      societal_benefit: 10,
      market_viability: 10,
      persona_x_fit: 10,
      defensibility: 10,
      execution_complexity: 10,
    });
    expect(calculateCompositeScore(scores)).toBe(10);
  });

  it("returns minimum of 1 when all scores are 1", () => {
    const scores = makeEvalScores({
      problem_severity: 1,
      societal_benefit: 1,
      market_viability: 1,
      persona_x_fit: 1,
      defensibility: 1,
      execution_complexity: 1,
    });
    expect(calculateCompositeScore(scores)).toBe(1);
  });
});

describe("checkStage1Gate", () => {
  it("passes when composite >= 7.0, societal >= 5, persona_x_fit >= 6", () => {
    const brief: OpportunityBrief = {
      opportunity: {
        title: "Test Opportunity",
        problem_statement: "Test problem",
        proposed_solution: "Test solution",
        target_buyer: "Test buyer",
      },
      scores: {
        ...makeEvalScores(),
        composite: 7.5,
      },
      panel_tensions: [],
      decision: "proceed",
      rationale: "Test rationale",
    };

    const result = checkStage1Gate(brief);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("fails when composite < 7.0", () => {
    const scores = makeEvalScores({ problem_severity: 3, societal_benefit: 5 });
    const brief: OpportunityBrief = {
      opportunity: {
        title: "Test",
        problem_statement: "Test",
        proposed_solution: "Test",
        target_buyer: "Test",
      },
      scores: { ...scores, composite: 5.5 },
      panel_tensions: [],
      decision: "defer",
      rationale: "Low composite",
    };

    const result = checkStage1Gate(brief);
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("Composite score"))).toBe(
      true,
    );
  });

  it("fails when societal_benefit < 5", () => {
    const scores = makeEvalScores({ societal_benefit: 3 });
    const brief: OpportunityBrief = {
      opportunity: {
        title: "Test",
        problem_statement: "Test",
        proposed_solution: "Test",
        target_buyer: "Test",
      },
      scores: { ...scores, composite: 7.0 },
      panel_tensions: [],
      decision: "defer",
      rationale: "Low societal benefit",
    };

    const result = checkStage1Gate(brief);
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("Societal benefit"))).toBe(
      true,
    );
  });

  it("fails when persona_x_fit < 6", () => {
    const scores = makeEvalScores({ persona_x_fit: 4 });
    const brief: OpportunityBrief = {
      opportunity: {
        title: "Test",
        problem_statement: "Test",
        proposed_solution: "Test",
        target_buyer: "Test",
      },
      scores: { ...scores, composite: 7.0 },
      panel_tensions: [],
      decision: "defer",
      rationale: "Low fit",
    };

    const result = checkStage1Gate(brief);
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("Persona-x fit"))).toBe(true);
  });

  it("fails when any dimension scored <= 2", () => {
    const scores = makeEvalScores({ defensibility: 2 });
    const brief: OpportunityBrief = {
      opportunity: {
        title: "Test",
        problem_statement: "Test",
        proposed_solution: "Test",
        target_buyer: "Test",
      },
      scores: { ...scores, composite: 7.5 },
      panel_tensions: [],
      decision: "defer",
      rationale: "Low defensibility",
    };

    const result = checkStage1Gate(brief);
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("defensibility"))).toBe(true);
  });
});

describe("checkStage2Gate", () => {
  function makeChallengeReport(
    overrides: Partial<ChallengeReport> = {},
  ): ChallengeReport {
    return {
      opportunity_ref: "test-001",
      risks_identified: [],
      historical_parallels: [],
      ethical_assessment: {
        harm_vectors: [],
        affected_populations: [],
        safeguards_required: [],
        verdict: "pass",
      },
      customer_reality_check: {
        value_clarity: "Clear value proposition",
        friction_points: [],
        willingness_to_pay: "Demonstrated",
      },
      final_positions: {
        sceptical_investor: "pass",
        failure_archaeologist: "pass",
        ethical_boundary_guardian: "pass",
        customer_devils_advocate: "pass",
      },
      conditions_for_stage_3: [],
      decision: "proceed",
      ...overrides,
    };
  }

  it("passes when all positions pass and no unresolved critical risks", () => {
    const report = makeChallengeReport();
    const result = checkStage2Gate(report);
    expect(result.passed).toBe(true);
  });

  it("fails when ethical_boundary_guardian fails", () => {
    const report = makeChallengeReport({
      final_positions: {
        sceptical_investor: "pass",
        failure_archaeologist: "pass",
        ethical_boundary_guardian: "fail",
        customer_devils_advocate: "pass",
      },
    });
    const result = checkStage2Gate(report);
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("kill");
    expect(result.failures.some((f) => f.includes("Ethical"))).toBe(true);
  });

  it("fails when there are unresolved critical risks", () => {
    const report = makeChallengeReport({
      risks_identified: [
        {
          risk: "Data breach potential",
          severity: "critical",
          raised_by: "Sceptical Investor",
          mitigation: "None proposed",
          status: "unresolved",
        },
      ],
    });
    const result = checkStage2Gate(report);
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("critical risk"))).toBe(true);
  });

  it("passes when critical risks are mitigated", () => {
    const report = makeChallengeReport({
      risks_identified: [
        {
          risk: "Data breach potential",
          severity: "critical",
          raised_by: "Sceptical Investor",
          mitigation: "Encryption and access controls",
          status: "mitigated",
        },
      ],
    });
    const result = checkStage2Gate(report);
    expect(result.passed).toBe(true);
  });
});
