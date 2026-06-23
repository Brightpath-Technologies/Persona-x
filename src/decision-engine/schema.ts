import { z } from "zod";

/**
 * Decision Engine Schema
 *
 * Defines the structured artefacts produced by each stage of the
 * Propose → Challenge → Prototype → Execute pipeline.
 *
 * These are distinct from persona schemas — they measure opportunities,
 * not personas.
 */

// ── Evaluation Dimensions ──────────────────────────────────────────

export const EVALUATION_DIMENSIONS = [
  "problem_severity",
  "societal_benefit",
  "market_viability",
  "persona_x_fit",
  "defensibility",
  "execution_complexity",
] as const;

export type EvaluationDimension = (typeof EVALUATION_DIMENSIONS)[number];

export const EVALUATION_WEIGHTS: Record<EvaluationDimension, number> = {
  problem_severity: 0.2,
  societal_benefit: 0.2,
  market_viability: 0.2,
  persona_x_fit: 0.2,
  defensibility: 0.1,
  execution_complexity: 0.1,
};

export const EvaluationScoreSchema = z.object({
  score: z.number().int().min(1).max(10),
  note: z.string().min(10).describe("Interpretive note explaining the score"),
});

export type EvaluationScore = z.infer<typeof EvaluationScoreSchema>;

// ── Stage Definitions ──────────────────────────────────────────────

export const DECISION_STAGES = [
  "propose",
  "challenge",
  "prototype",
  "execute",
] as const;

export type DecisionStage = (typeof DECISION_STAGES)[number];

export const StageDecisionSchema = z.enum(["proceed", "defer", "kill"]);
export type StageDecision = z.infer<typeof StageDecisionSchema>;

export const StageVerdictSchema = z.enum(["pass", "conditional_pass", "fail"]);
export type StageVerdict = z.infer<typeof StageVerdictSchema>;

// ── Stage 1: Opportunity Brief ─────────────────────────────────────

export const PanelTensionSchema = z.object({
  concern: z.string(),
  resolution: z.string(),
});

export const OpportunityBriefSchema = z.object({
  opportunity: z.object({
    title: z.string(),
    problem_statement: z.string(),
    proposed_solution: z.string(),
    target_buyer: z.string(),
  }),
  scores: z.object({
    problem_severity: EvaluationScoreSchema,
    societal_benefit: EvaluationScoreSchema,
    market_viability: EvaluationScoreSchema,
    persona_x_fit: EvaluationScoreSchema,
    defensibility: EvaluationScoreSchema,
    execution_complexity: EvaluationScoreSchema,
    composite: z.number(),
  }),
  panel_tensions: z.array(PanelTensionSchema),
  decision: StageDecisionSchema,
  rationale: z.string(),
});

export type OpportunityBrief = z.infer<typeof OpportunityBriefSchema>;

// ── Stage 2: Challenge Report ──────────────────────────────────────

export const RiskSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export const RiskStatusSchema = z.enum(["mitigated", "accepted", "unresolved"]);

export const IdentifiedRiskSchema = z.object({
  risk: z.string(),
  severity: RiskSeveritySchema,
  raised_by: z.string(),
  mitigation: z.string(),
  status: RiskStatusSchema,
});

export const HistoricalParallelSchema = z.object({
  precedent: z.string(),
  relevance: z.string(),
  differentiator: z.string(),
});

export const EthicalAssessmentSchema = z.object({
  harm_vectors: z.array(z.string()),
  affected_populations: z.array(z.string()),
  safeguards_required: z.array(z.string()),
  verdict: StageVerdictSchema,
});

export const CustomerRealityCheckSchema = z.object({
  value_clarity: z.string(),
  friction_points: z.array(z.string()),
  willingness_to_pay: z.string(),
});

export const ChallengeReportSchema = z.object({
  opportunity_ref: z.string(),
  risks_identified: z.array(IdentifiedRiskSchema),
  historical_parallels: z.array(HistoricalParallelSchema),
  ethical_assessment: EthicalAssessmentSchema,
  customer_reality_check: CustomerRealityCheckSchema,
  final_positions: z.object({
    sceptical_investor: StageVerdictSchema,
    failure_archaeologist: StageVerdictSchema,
    ethical_boundary_guardian: StageVerdictSchema,
    customer_devils_advocate: StageVerdictSchema,
  }),
  conditions_for_stage_3: z.array(z.string()),
  decision: StageDecisionSchema,
});

export type ChallengeReport = z.infer<typeof ChallengeReportSchema>;

// ── Stage 3: Prototype Specification ───────────────────────────────

export const PersonaRequirementSchema = z.object({
  name: z.string(),
  role: z.string(),
  rubric_summary: z.string(),
  designable: z.boolean(),
  design_effort: z.enum(["low", "medium", "high"]),
});

export const UserJourneyStepSchema = z.object({
  step: z.number().int().min(1),
  action: z.string(),
  system_response: z.string(),
  time_to_value: z.string(),
});

export const RevenueModelSchema = z.object({
  pricing_structure: z.string(),
  entry_price: z.string(),
  target_ltv: z.string(),
  unit_economics: z.object({
    cost_per_delivery: z.string(),
    margin: z.string(),
  }),
});

export const BuildPlanSchema = z.object({
  build: z.array(z.string()),
  buy_or_compose: z.array(z.string()),
  estimated_effort: z.string(),
  estimated_cost: z.string(),
});

export const SuccessCriterionSchema = z.object({
  metric: z.string(),
  target: z.string(),
  timeframe: z.string(),
});

export const PrototypeSpecSchema = z.object({
  opportunity_ref: z.string(),
  version: z.string(),
  scope: z.object({
    included: z.array(z.string()),
    explicitly_excluded: z.array(z.string()),
    rationale: z.string(),
  }),
  personas_required: z.array(PersonaRequirementSchema),
  user_journey: z.object({
    steps: z.array(UserJourneyStepSchema),
  }),
  revenue_model: RevenueModelSchema,
  build_plan: BuildPlanSchema,
  success_criteria: z.array(SuccessCriterionSchema),
});

export type PrototypeSpec = z.infer<typeof PrototypeSpecSchema>;

// ── Stage 4: Delivery Plan ─────────────────────────────────────────

export const TaskSchema = z.object({
  task: z.string(),
  effort: z.string(),
  dependency: z.string(),
  definition_of_done: z.string(),
});

export const WorkstreamSchema = z.object({
  name: z.string(),
  owner: z.string(),
  tasks: z.array(TaskSchema),
});

export const LaunchPlanSchema = z.object({
  target_segment: z.string(),
  acquisition_channels: z.array(z.string()),
  first_30_day_target: z.string(),
  messaging: z.string(),
});

export const OperationalReadinessSchema = z.object({
  capacity: z.string(),
  scaling_trigger: z.string(),
  manual_processes: z.array(z.string()),
  automation_plan: z.string(),
});

export const ReadinessVerdictSchema = z.enum([
  "ready",
  "conditional",
  "not_ready",
]);

export const GoNoGoSchema = z.object({
  delivery_realist: ReadinessVerdictSchema,
  risk_sentinel: ReadinessVerdictSchema,
  market_entry_strategist: ReadinessVerdictSchema,
  operations_scaler: ReadinessVerdictSchema,
  conditions: z.array(z.string()),
  recommendation: z.enum(["go", "conditional_go", "no_go"]),
});

export const DeliveryPlanSchema = z.object({
  opportunity_ref: z.string(),
  target_launch_date: z.string(),
  workstreams: z.array(WorkstreamSchema),
  risk_register: z.array(IdentifiedRiskSchema),
  launch_plan: LaunchPlanSchema,
  operational_readiness: OperationalReadinessSchema,
  go_no_go: GoNoGoSchema,
});

export type DeliveryPlan = z.infer<typeof DeliveryPlanSchema>;

// ── Composite Score Calculation ────────────────────────────────────

export function calculateCompositeScore(
  scores: Record<EvaluationDimension, EvaluationScore>,
): number {
  let composite = 0;
  for (const dim of EVALUATION_DIMENSIONS) {
    composite += scores[dim].score * EVALUATION_WEIGHTS[dim];
  }
  return Math.round(composite * 10) / 10;
}

// ── Gate Checks ────────────────────────────────────────────────────

export interface GateResult {
  passed: boolean;
  failures: string[];
  decision: StageDecision;
}

export function checkStage1Gate(brief: OpportunityBrief): GateResult {
  const failures: string[] = [];

  if (brief.scores.composite < 7.0) {
    failures.push(`Composite score ${brief.scores.composite} < 7.0 threshold`);
  }
  if (brief.scores.societal_benefit.score < 5) {
    failures.push(
      `Societal benefit ${brief.scores.societal_benefit.score}/10 < 5 — extractive solutions are not permitted`,
    );
  }
  if (brief.scores.persona_x_fit.score < 6) {
    failures.push(
      `Persona-x fit ${brief.scores.persona_x_fit.score}/10 < 6 — problem does not need multi-perspective challenge`,
    );
  }

  for (const dim of EVALUATION_DIMENSIONS) {
    if (brief.scores[dim].score <= 2) {
      failures.push(
        `${dim} scored ${brief.scores[dim].score}/10 — requires explicit justification`,
      );
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    decision: failures.length === 0 ? "proceed" : "defer",
  };
}

export function checkStage2Gate(report: ChallengeReport): GateResult {
  const failures: string[] = [];

  const unresolvedCritical = report.risks_identified.filter(
    (r) => r.severity === "critical" && r.status === "unresolved",
  );
  if (unresolvedCritical.length > 0) {
    failures.push(`${unresolvedCritical.length} unmitigated critical risk(s)`);
  }

  if (report.final_positions.ethical_boundary_guardian === "fail") {
    failures.push(
      "Ethical Boundary Guardian declared fail — non-negotiable kill",
    );
  }

  if (report.final_positions.sceptical_investor === "fail") {
    failures.push(
      "Sceptical Investor declared fail — financial model not viable",
    );
  }

  return {
    passed: failures.length === 0,
    failures,
    decision:
      failures.length === 0
        ? "proceed"
        : report.final_positions.ethical_boundary_guardian === "fail"
          ? "kill"
          : "defer",
  };
}
