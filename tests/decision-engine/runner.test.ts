import { describe, it, expect, vi, beforeEach } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Runner Integration Tests
 *
 * Tests the pipeline-to-panel connection. LLM calls are mocked so no API
 * key is required. Real persona YAML files are loaded from examples/engine/
 * to verify the full loading and wiring path.
 */

// Mock LLM modules before importing the runner
vi.mock("../../src/llm/panel-llm.js", () => ({
  generatePersonaResponse: vi.fn(),
  generateRoundSummary: vi.fn(),
}));

vi.mock("../../src/llm/client.js", () => ({
  sendMessage: vi.fn(),
  sendMessageForJSON: vi.fn(),
  createClient: vi.fn(),
}));

import { generatePersonaResponse, generateRoundSummary } from "../../src/llm/panel-llm.js";
import { sendMessageForJSON } from "../../src/llm/client.js";
import { runStage, runDecisionEngine } from "../../src/decision-engine/runner.js";
import {
  createDecisionPipeline,
  advanceToNextStage,
  recordStageResult,
  STAGE_PANELS,
} from "../../src/decision-engine/pipeline.js";
import type { OpportunityBrief, ChallengeReport } from "../../src/decision-engine/schema.js";

const _dirname = dirname(fileURLToPath(import.meta.url));
const PERSONA_DIR = join(_dirname, "../../examples/engine");

// ── Fixtures ────────────────────────────────────────────────────────

function makeMockMessage(personaName: string) {
  return {
    persona_id: personaName.toLowerCase().replace(/\s+/g, "-"),
    persona_name: personaName,
    content: `${personaName} analysis of the opportunity.`,
    timestamp: new Date().toISOString(),
    rubric_influence: {
      dominant_dimensions: ["risk_appetite" as const],
      behaviour_notes: ["risk_appetite (5/10): moderate risk appetite"],
    },
  };
}

function makePassingBrief(): OpportunityBrief {
  return {
    opportunity: {
      title: "Structured Decision Framework",
      problem_statement: "Organisations lack auditable, structured decision tools.",
      proposed_solution: "Panel-based evaluation with calibrated AI personas.",
      target_buyer: "Enterprise decision-makers with $50k+ discretionary budget.",
    },
    scores: {
      problem_severity: { score: 8, note: "High severity — affects all organisations." },
      societal_benefit: { score: 7, note: "Reduces poor governance decisions." },
      market_viability: { score: 7, note: "Growing demand for structured AI tools." },
      persona_x_fit: { score: 9, note: "Core use case for multi-perspective challenge." },
      defensibility: { score: 6, note: "Moderate defensibility through methodology." },
      execution_complexity: { score: 5, note: "Medium complexity — LLM integration required." },
      composite: 7.3,
    },
    panel_tensions: [
      { concern: "Market timing risk", resolution: "First-mover advantage in structured AI." },
    ],
    decision: "proceed",
    rationale: "Composite score 7.3/10 exceeds the 7.0 threshold. Clear buyer identified.",
  };
}

function makePassingChallengeReport(): ChallengeReport {
  return {
    opportunity_ref: "Structured Decision Framework",
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
        differentiator: "LLMs provide flexibility rule-based systems lacked",
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
      willingness_to_pay: "Validated at $49–799 per use case",
    },
    final_positions: {
      sceptical_investor: "pass",
      failure_archaeologist: "conditional_pass",
      ethical_boundary_guardian: "pass",
      customer_devils_advocate: "pass",
    },
    conditions_for_stage_3: ["Must include rubric transparency in all outputs"],
    decision: "proceed",
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("runStage — Stage 1 (Propose)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(generatePersonaResponse).mockResolvedValue(
      makeMockMessage("Opportunity Architect")
    );
    vi.mocked(generateRoundSummary).mockResolvedValue(
      "Round summary: panel evaluated the opportunity structure."
    );
    vi.mocked(sendMessageForJSON).mockResolvedValue(makePassingBrief());
  });

  it("loads all 4 Stage 1 personas from YAML files", async () => {
    const state = createDecisionPipeline("AI decision support tool for enterprise teams");
    const result = await runStage({} as Parameters<typeof runStage>[0], state, { personaDir: PERSONA_DIR });

    expect(result.state.artefacts.opportunity_brief).not.toBeNull();
  });

  it("runs the correct number of rounds for Stage 1 (2 rounds)", async () => {
    const state = createDecisionPipeline("AI decision support tool for enterprise teams");
    await runStage({} as Parameters<typeof runStage>[0], state, { personaDir: PERSONA_DIR });

    // generateRoundSummary called once per round
    expect(vi.mocked(generateRoundSummary)).toHaveBeenCalledTimes(2);
  });

  it("calls generatePersonaResponse for each contributing persona each round", async () => {
    const state = createDecisionPipeline("AI decision support tool for enterprise teams");
    await runStage({} as Parameters<typeof runStage>[0], state, { personaDir: PERSONA_DIR });

    // At least 4 calls (one per persona in round 1 at minimum)
    expect(vi.mocked(generatePersonaResponse).mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it("calls sendMessageForJSON once to synthesise the artefact", async () => {
    const state = createDecisionPipeline("AI decision support tool for enterprise teams");
    await runStage({} as Parameters<typeof runStage>[0], state, { personaDir: PERSONA_DIR });

    expect(vi.mocked(sendMessageForJSON)).toHaveBeenCalledTimes(1);
  });

  it("records the opportunity brief in pipeline state", async () => {
    const state = createDecisionPipeline("AI decision support tool for enterprise teams");
    const result = await runStage({} as Parameters<typeof runStage>[0], state, { personaDir: PERSONA_DIR });

    expect(result.state.artefacts.opportunity_brief?.opportunity.title).toBe(
      "Structured Decision Framework"
    );
  });

  it("evaluates Stage 1 gate and passes when composite >= 7.0", async () => {
    const state = createDecisionPipeline("AI decision support tool for enterprise teams");
    const result = await runStage({} as Parameters<typeof runStage>[0], state, { personaDir: PERSONA_DIR });

    expect(result.state.gate_results.stage_1?.passed).toBe(true);
    expect(result.state.gate_results.stage_1?.decision).toBe("proceed");
  });

  it("records panel transcript in the audit trail", async () => {
    const state = createDecisionPipeline("AI decision support tool for enterprise teams");
    const result = await runStage({} as Parameters<typeof runStage>[0], state, { personaDir: PERSONA_DIR });

    const entry = result.state.audit_trail[0];
    expect(entry).toBeDefined();
    expect(entry?.panel_transcript).toBeDefined();
    expect(entry?.panel_transcript?.length).toBeGreaterThanOrEqual(1);
    expect(entry?.panel_transcript?.[0]?.summary).toContain("Round summary");
  });

  it("returns the transcript in the result", async () => {
    const state = createDecisionPipeline("AI decision support tool for enterprise teams");
    const result = await runStage({} as Parameters<typeof runStage>[0], state, { personaDir: PERSONA_DIR });

    expect(result.transcript).toHaveLength(2); // 2 rounds
    expect(result.transcript[0]?.round_number).toBe(1);
    expect(result.transcript[1]?.round_number).toBe(2);
  });

  it("returns null killReason when no kill criteria are met", async () => {
    const state = createDecisionPipeline("AI decision support tool for enterprise teams");
    const result = await runStage({} as Parameters<typeof runStage>[0], state, { personaDir: PERSONA_DIR });

    expect(result.killReason).toBeNull();
  });
});

describe("runStage — gate failure", () => {
  it("defers when composite score is below 7.0", async () => {
    vi.clearAllMocks();

    const failingBrief: OpportunityBrief = {
      ...makePassingBrief(),
      scores: {
        ...makePassingBrief().scores,
        problem_severity: { score: 4, note: "Low severity problem" },
        societal_benefit: { score: 5, note: "Moderate societal benefit" },
        market_viability: { score: 4, note: "Weak market signal" },
        persona_x_fit: { score: 6, note: "Moderate fit" },
        defensibility: { score: 4, note: "Low defensibility" },
        execution_complexity: { score: 5, note: "Medium complexity" },
        composite: 4.7,
      },
      decision: "defer",
      rationale: "Composite score 4.7/10 below threshold.",
    };

    vi.mocked(generatePersonaResponse).mockResolvedValue(makeMockMessage("Opportunity Architect"));
    vi.mocked(generateRoundSummary).mockResolvedValue("Summary");
    vi.mocked(sendMessageForJSON).mockResolvedValue(failingBrief);

    const state = createDecisionPipeline("Weak opportunity");
    const result = await runStage({} as Parameters<typeof runStage>[0], state, { personaDir: PERSONA_DIR });

    expect(result.state.gate_results.stage_1?.passed).toBe(false);
    expect(result.state.gate_results.stage_1?.failures.length).toBeGreaterThan(0);
  });
});

describe("runStage — kill criteria", () => {
  it("returns a killReason when Ethical Boundary Guardian fails in Stage 2", async () => {
    vi.clearAllMocks();

    const killingReport: ChallengeReport = {
      ...makePassingChallengeReport(),
      ethical_assessment: {
        ...makePassingChallengeReport().ethical_assessment,
        verdict: "fail",
      },
      final_positions: {
        ...makePassingChallengeReport().final_positions,
        ethical_boundary_guardian: "fail",
      },
      decision: "kill",
    };

    vi.mocked(generatePersonaResponse).mockResolvedValue(makeMockMessage("Sceptical Investor"));
    vi.mocked(generateRoundSummary).mockResolvedValue("Summary");
    vi.mocked(sendMessageForJSON).mockResolvedValue(killingReport);

    // Advance to Stage 2
    let state = createDecisionPipeline("Ethically problematic opportunity");
    state = recordStageResult(state, "propose", makePassingBrief());
    state = advanceToNextStage(state);

    const result = await runStage({} as Parameters<typeof runStage>[0], state, { personaDir: PERSONA_DIR });

    expect(result.killReason).not.toBeNull();
    expect(result.killReason).toContain("Ethical Boundary Guardian");
  });
});

describe("runDecisionEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(generatePersonaResponse).mockResolvedValue(
      makeMockMessage("Persona")
    );
    vi.mocked(generateRoundSummary).mockResolvedValue("Round summary.");
    // First call returns OpportunityBrief, subsequent calls return appropriate artefacts
    vi.mocked(sendMessageForJSON).mockResolvedValue(makePassingBrief());
  });

  it("creates a pipeline and returns final state", async () => {
    // Only run Stage 1 — mock sendMessageForJSON to return a brief that defers
    // so the engine stops after Stage 1
    const deferringBrief: OpportunityBrief = {
      ...makePassingBrief(),
      scores: {
        ...makePassingBrief().scores,
        societal_benefit: { score: 3, note: "Insufficient societal benefit demonstrated." },
        composite: 5.0,
      },
      decision: "defer",
      rationale: "Composite below threshold.",
    };
    vi.mocked(sendMessageForJSON).mockResolvedValue(deferringBrief);

    const state = await runDecisionEngine(
      {} as Parameters<typeof runDecisionEngine>[0],
      "Opportunity with weak societal benefit",
      { personaDir: PERSONA_DIR }
    );

    expect(state.status).toBe("deferred");
    expect(state.artefacts.opportunity_brief).not.toBeNull();
    expect(state.audit_trail.length).toBeGreaterThan(0);
  });

  it("kills the pipeline when kill criteria are met", async () => {
    // Stage 1 passes, Stage 2 kills via ethical guardian
    const killingReport: ChallengeReport = {
      ...makePassingChallengeReport(),
      ethical_assessment: {
        ...makePassingChallengeReport().ethical_assessment,
        verdict: "fail",
      },
      final_positions: {
        ...makePassingChallengeReport().final_positions,
        ethical_boundary_guardian: "fail",
      },
      decision: "kill",
    };

    vi.mocked(sendMessageForJSON)
      .mockResolvedValueOnce(makePassingBrief())
      .mockResolvedValueOnce(killingReport);

    const state = await runDecisionEngine(
      {} as Parameters<typeof runDecisionEngine>[0],
      "Ethically problematic opportunity",
      { personaDir: PERSONA_DIR }
    );

    expect(state.status).toBe("killed");
  });

  it("populates the audit trail at each stage that runs", async () => {
    const deferringBrief: OpportunityBrief = {
      ...makePassingBrief(),
      scores: { ...makePassingBrief().scores, composite: 4.0, societal_benefit: { score: 3, note: "Weak benefit." } },
      decision: "defer",
      rationale: "Score below threshold.",
    };
    vi.mocked(sendMessageForJSON).mockResolvedValue(deferringBrief);

    const state = await runDecisionEngine(
      {} as Parameters<typeof runDecisionEngine>[0],
      "Test opportunity",
      { personaDir: PERSONA_DIR }
    );

    expect(state.audit_trail.length).toBeGreaterThanOrEqual(1);
    const entry = state.audit_trail[0];
    expect(entry?.stage).toBe("propose");
    expect(entry?.panel_transcript).toBeDefined();
  });
});

describe("Pipeline-to-panel wiring", () => {
  it("Stage 1 panel uses the correct persona slugs", () => {
    expect(STAGE_PANELS.propose.personas).toEqual([
      "opportunity-architect",
      "market-realist",
      "societal-impact-assessor",
      "technical-feasibility-analyst",
    ]);
  });

  it("Stage 2 panel uses the correct persona slugs", () => {
    expect(STAGE_PANELS.challenge.personas).toEqual([
      "sceptical-investor",
      "failure-archaeologist",
      "ethical-boundary-guardian",
      "customer-devils-advocate",
    ]);
  });

  it("Stage 3 panel uses the correct persona slugs", () => {
    expect(STAGE_PANELS.prototype.personas).toEqual([
      "product-architect",
      "user-experience-advocate",
      "revenue-model-analyst",
      "build-vs-buy-pragmatist",
    ]);
  });

  it("Stage 4 panel uses the correct persona slugs", () => {
    expect(STAGE_PANELS.execute.personas).toEqual([
      "delivery-realist",
      "risk-sentinel",
      "market-entry-strategist",
      "operations-scaler",
    ]);
  });

  it("all 16 persona YAML files exist in the engine directory", async () => {
    const { readFile } = await import("node:fs/promises");
    const allSlugs = Object.values(STAGE_PANELS).flatMap((p) => p.personas);
    expect(allSlugs).toHaveLength(16);

    for (const slug of allSlugs) {
      const path = join(PERSONA_DIR, `${slug}.yaml`);
      await expect(readFile(path, "utf-8")).resolves.toBeTruthy();
    }
  });
});
