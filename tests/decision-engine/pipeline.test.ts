import { describe, it, expect } from "vitest";
import {
  createDecisionPipeline,
  getCurrentStagePanel,
  recordStageResult,
  advanceToNextStage,
  isPipelineDone,
  formatAuditTrail,
  checkKillCriteria,
  STAGE_PANELS,
} from "../../src/decision-engine/pipeline.js";
import type {
  OpportunityBrief,
  ChallengeReport,
} from "../../src/decision-engine/schema.js";

function makePassingBrief(): OpportunityBrief {
  return {
    opportunity: {
      title: "Test Opportunity",
      problem_statement:
        "Organisations lack structured decision-making frameworks",
      proposed_solution: "Panel-based evaluation with structured personas",
      target_buyer: "Enterprise decision-makers",
    },
    scores: {
      problem_severity: {
        score: 8,
        note: "High severity — affects all organisations",
      },
      societal_benefit: {
        score: 7,
        note: "Reduces poor decisions in governance",
      },
      market_viability: {
        score: 7,
        note: "Growing demand for structured AI tools",
      },
      persona_x_fit: {
        score: 9,
        note: "Core use case for multi-perspective challenge",
      },
      defensibility: {
        score: 6,
        note: "Moderate defensibility through persona methodology",
      },
      execution_complexity: {
        score: 5,
        note: "Medium complexity — requires LLM integration",
      },
      composite: 7.3,
    },
    panel_tensions: [
      {
        concern: "Market timing",
        resolution: "Early movers in structured AI persona space",
      },
    ],
    decision: "proceed",
    rationale: "Strong problem-solution fit with clear buyer identification",
  };
}

function makePassingChallengeReport(): ChallengeReport {
  return {
    opportunity_ref: "test-001",
    risks_identified: [
      {
        risk: "LLM hallucination in persona responses",
        severity: "high",
        raised_by: "Failure Archaeologist",
        mitigation: "Schema validation on all LLM outputs",
        status: "mitigated",
      },
    ],
    historical_parallels: [
      {
        precedent: "Expert system failures of the 1990s",
        relevance: "Similar attempt to codify human judgement",
        differentiator:
          "LLMs provide flexibility that rule-based systems lacked",
      },
    ],
    ethical_assessment: {
      harm_vectors: ["Persona bias amplification"],
      affected_populations: ["Decision subjects"],
      safeguards_required: ["Rubric transparency", "Audit trails"],
      verdict: "pass",
    },
    customer_reality_check: {
      value_clarity: "Clear value in reducing decision blind spots",
      friction_points: ["Learning curve for persona design"],
      willingness_to_pay: "Validated at $49-799 per use case",
    },
    final_positions: {
      sceptical_investor: "pass",
      failure_archaeologist: "conditional_pass",
      ethical_boundary_guardian: "pass",
      customer_devils_advocate: "pass",
    },
    conditions_for_stage_3: [
      "Must include rubric transparency in all outputs",
      "Must validate LLM outputs against schemas",
    ],
    decision: "proceed",
  };
}

describe("Decision Pipeline Creation", () => {
  it("creates a pipeline in active state starting at propose", () => {
    const pipeline = createDecisionPipeline("AI review panel tool");
    expect(pipeline.current_stage).toBe("propose");
    expect(pipeline.stage_index).toBe(0);
    expect(pipeline.status).toBe("active");
    expect(pipeline.audit_trail).toHaveLength(0);
  });

  it("stores the opportunity input", () => {
    const pipeline = createDecisionPipeline("Structured persona framework");
    expect(pipeline.opportunity_input).toBe("Structured persona framework");
  });

  it("initialises all artefacts as null", () => {
    const pipeline = createDecisionPipeline("Test");
    expect(pipeline.artefacts.opportunity_brief).toBeNull();
    expect(pipeline.artefacts.challenge_report).toBeNull();
    expect(pipeline.artefacts.prototype_spec).toBeNull();
    expect(pipeline.artefacts.delivery_plan).toBeNull();
  });
});

describe("Stage Panels", () => {
  it("has panels for all 4 stages", () => {
    expect(Object.keys(STAGE_PANELS)).toHaveLength(4);
    expect(STAGE_PANELS.propose).toBeDefined();
    expect(STAGE_PANELS.challenge).toBeDefined();
    expect(STAGE_PANELS.prototype).toBeDefined();
    expect(STAGE_PANELS.execute).toBeDefined();
  });

  it("each panel has 4 personas", () => {
    for (const panel of Object.values(STAGE_PANELS)) {
      expect(panel.personas).toHaveLength(4);
    }
  });

  it("returns current stage panel", () => {
    const pipeline = createDecisionPipeline("Test");
    const panel = getCurrentStagePanel(pipeline);
    expect(panel.name).toBe("Opportunity Structuring Panel");
    expect(panel.personas).toContain("opportunity-architect");
  });
});

describe("Stage Progression", () => {
  it("records stage 1 result and evaluates gate", () => {
    const pipeline = createDecisionPipeline("Test");
    const brief = makePassingBrief();
    const updated = recordStageResult(pipeline, "propose", brief);

    expect(updated.artefacts.opportunity_brief).toBe(brief);
    expect(updated.gate_results.stage_1).not.toBeNull();
    expect(updated.gate_results.stage_1!.passed).toBe(true);
    expect(updated.audit_trail).toHaveLength(1);
  });

  it("advances from propose to challenge after passing gate", () => {
    let pipeline = createDecisionPipeline("Test");
    pipeline = recordStageResult(pipeline, "propose", makePassingBrief());
    pipeline = advanceToNextStage(pipeline);

    expect(pipeline.current_stage).toBe("challenge");
    expect(pipeline.stage_index).toBe(1);
    expect(pipeline.status).toBe("active");
  });

  it("records stage 2 result and evaluates gate", () => {
    let pipeline = createDecisionPipeline("Test");
    pipeline = recordStageResult(pipeline, "propose", makePassingBrief());
    pipeline = advanceToNextStage(pipeline);
    pipeline = recordStageResult(
      pipeline,
      "challenge",
      makePassingChallengeReport(),
    );

    expect(pipeline.artefacts.challenge_report).not.toBeNull();
    expect(pipeline.gate_results.stage_2!.passed).toBe(true);
    expect(pipeline.audit_trail).toHaveLength(2);
  });

  it("defers when stage 1 gate fails", () => {
    const pipeline = createDecisionPipeline("Test");
    const brief = makePassingBrief();
    brief.scores.composite = 5.0;
    brief.scores.societal_benefit.score = 3;

    let updated = recordStageResult(pipeline, "propose", brief);
    updated = advanceToNextStage(updated);

    expect(updated.status).toBe("deferred");
  });

  it("kills when ethical guardian fails", () => {
    let pipeline = createDecisionPipeline("Test");
    pipeline = recordStageResult(pipeline, "propose", makePassingBrief());
    pipeline = advanceToNextStage(pipeline);

    const report = makePassingChallengeReport();
    report.final_positions.ethical_boundary_guardian = "fail";

    pipeline = recordStageResult(pipeline, "challenge", report);
    pipeline = advanceToNextStage(pipeline);

    expect(pipeline.status).toBe("killed");
  });
});

describe("Pipeline Completion", () => {
  it("reports not done when active", () => {
    const pipeline = createDecisionPipeline("Test");
    expect(isPipelineDone(pipeline)).toBe(false);
  });

  it("reports done when deferred", () => {
    let pipeline = createDecisionPipeline("Test");
    const brief = makePassingBrief();
    brief.scores.composite = 4.0;
    brief.scores.societal_benefit.score = 3;

    pipeline = recordStageResult(pipeline, "propose", brief);
    pipeline = advanceToNextStage(pipeline);

    expect(isPipelineDone(pipeline)).toBe(true);
  });
});

describe("Kill Criteria", () => {
  it("returns null when no kill criteria met", () => {
    const pipeline = createDecisionPipeline("Test");
    expect(checkKillCriteria(pipeline)).toBeNull();
  });

  it("kills when societal benefit <= 2", () => {
    let pipeline = createDecisionPipeline("Test");
    const brief = makePassingBrief();
    brief.scores.societal_benefit.score = 2;
    pipeline = recordStageResult(pipeline, "propose", brief);

    const killReason = checkKillCriteria(pipeline);
    expect(killReason).not.toBeNull();
    expect(killReason).toContain("extractive");
  });
});

describe("Audit Trail", () => {
  it("formats audit trail as readable markdown", () => {
    let pipeline = createDecisionPipeline("AI governance panel");
    pipeline = recordStageResult(pipeline, "propose", makePassingBrief());

    const trail = formatAuditTrail(pipeline);
    expect(trail).toContain("# Decision Engine Audit Trail");
    expect(trail).toContain("AI governance panel");
    expect(trail).toContain("gate_passed");
  });
});
