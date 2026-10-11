import type {
  DecisionStage,
  OpportunityBrief,
  ChallengeReport,
  PrototypeSpec,
  DeliveryPlan,
  GateResult,
} from "./schema.js";
import {
  DECISION_STAGES,
  checkStage1Gate,
  checkStage2Gate,
} from "./schema.js";

/**
 * Decision Engine Pipeline
 *
 * Implements the 4-stage Propose → Challenge → Prototype → Execute
 * state machine defined in docs/DECISION-ENGINE.md.
 *
 * Each stage:
 * - Takes input from the previous stage
 * - Runs a panel of purpose-built personas
 * - Produces a structured artefact
 * - Passes through a quantified gate
 */

export interface DecisionPipelineState {
  current_stage: DecisionStage;
  stage_index: number;
  opportunity_input: string;
  artefacts: {
    opportunity_brief: OpportunityBrief | null;
    challenge_report: ChallengeReport | null;
    prototype_spec: PrototypeSpec | null;
    delivery_plan: DeliveryPlan | null;
  };
  gate_results: {
    stage_1: GateResult | null;
    stage_2: GateResult | null;
    stage_3: GateResult | null;
    stage_4: GateResult | null;
  };
  status: "active" | "passed" | "deferred" | "killed";
  audit_trail: AuditEntry[];
}

export interface TranscriptMessage {
  persona_name: string;
  content: string;
  timestamp: string;
}

export interface TranscriptRound {
  round_number: number;
  messages: TranscriptMessage[];
  summary: string;
}

export interface AuditEntry {
  stage: DecisionStage;
  timestamp: string;
  action: string;
  detail: string;
  panel_transcript?: TranscriptRound[];
}

/**
 * Panel configuration for each stage.
 */
export const STAGE_PANELS: Record<DecisionStage, StagePanel> = {
  propose: {
    name: "Opportunity Structuring Panel",
    personas: [
      "opportunity-architect",
      "market-realist",
      "societal-impact-assessor",
      "technical-feasibility-analyst",
    ],
    rounds: 2,
    output_type: "opportunity_brief",
  },
  challenge: {
    name: "Adversarial Challenge Panel",
    personas: [
      "sceptical-investor",
      "failure-archaeologist",
      "ethical-boundary-guardian",
      "customer-devils-advocate",
    ],
    rounds: 3,
    output_type: "challenge_report",
  },
  prototype: {
    name: "Prototype Design Panel",
    personas: [
      "product-architect",
      "user-experience-advocate",
      "revenue-model-analyst",
      "build-vs-buy-pragmatist",
    ],
    rounds: 2,
    output_type: "prototype_spec",
  },
  execute: {
    name: "Execution Readiness Panel",
    personas: [
      "delivery-realist",
      "risk-sentinel",
      "market-entry-strategist",
      "operations-scaler",
    ],
    rounds: 3,
    output_type: "delivery_plan",
  },
};

export interface StagePanel {
  name: string;
  personas: string[];
  rounds: number;
  output_type: string;
}

/**
 * Create a new decision pipeline for evaluating an opportunity.
 */
export function createDecisionPipeline(
  opportunityInput: string
): DecisionPipelineState {
  return {
    current_stage: "propose",
    stage_index: 0,
    opportunity_input: opportunityInput,
    artefacts: {
      opportunity_brief: null,
      challenge_report: null,
      prototype_spec: null,
      delivery_plan: null,
    },
    gate_results: {
      stage_1: null,
      stage_2: null,
      stage_3: null,
      stage_4: null,
    },
    status: "active",
    audit_trail: [],
  };
}

/**
 * Get the current stage panel configuration.
 */
export function getCurrentStagePanel(
  state: DecisionPipelineState
): StagePanel {
  return STAGE_PANELS[state.current_stage];
}

/**
 * Record a stage artefact and evaluate the gate.
 * Optionally attach a panel transcript to the audit entry.
 */
export function recordStageResult(
  state: DecisionPipelineState,
  stage: DecisionStage,
  artefact: OpportunityBrief | ChallengeReport | PrototypeSpec | DeliveryPlan,
  transcript?: TranscriptRound[]
): DecisionPipelineState {
  const updated = { ...state };
  updated.artefacts = { ...state.artefacts };
  updated.gate_results = { ...state.gate_results };
  updated.audit_trail = [...state.audit_trail];

  switch (stage) {
    case "propose": {
      const brief = artefact as OpportunityBrief;
      updated.artefacts.opportunity_brief = brief;
      const gate = checkStage1Gate(brief);
      updated.gate_results.stage_1 = gate;
      updated.audit_trail.push({
        stage,
        timestamp: new Date().toISOString(),
        action: gate.passed ? "gate_passed" : "gate_failed",
        detail: gate.passed
          ? `Composite score: ${brief.scores.composite}. Proceeding to Challenge.`
          : `Gate failures: ${gate.failures.join("; ")}`,
        ...(transcript ? { panel_transcript: transcript } : {}),
      });
      break;
    }
    case "challenge": {
      const report = artefact as ChallengeReport;
      updated.artefacts.challenge_report = report;
      const gate = checkStage2Gate(report);
      updated.gate_results.stage_2 = gate;
      updated.audit_trail.push({
        stage,
        timestamp: new Date().toISOString(),
        action: gate.passed ? "gate_passed" : "gate_failed",
        detail: gate.passed
          ? "All challenges addressed. Proceeding to Prototype."
          : `Gate failures: ${gate.failures.join("; ")}`,
        ...(transcript ? { panel_transcript: transcript } : {}),
      });
      break;
    }
    case "prototype": {
      updated.artefacts.prototype_spec = artefact as PrototypeSpec;
      // Stage 3 gate is simpler — just record it
      updated.gate_results.stage_3 = {
        passed: true,
        failures: [],
        decision: "proceed",
      };
      updated.audit_trail.push({
        stage,
        timestamp: new Date().toISOString(),
        action: "gate_passed",
        detail: "Prototype specification complete. Proceeding to Execute.",
        ...(transcript ? { panel_transcript: transcript } : {}),
      });
      break;
    }
    case "execute": {
      updated.artefacts.delivery_plan = artefact as DeliveryPlan;
      const plan = artefact as DeliveryPlan;
      const hasUnready = [
        plan.go_no_go.delivery_realist,
        plan.go_no_go.risk_sentinel,
        plan.go_no_go.market_entry_strategist,
        plan.go_no_go.operations_scaler,
      ].includes("not_ready");
      updated.gate_results.stage_4 = {
        passed: !hasUnready,
        failures: hasUnready ? ["One or more personas declared not_ready"] : [],
        decision: hasUnready ? "defer" : "proceed",
      };
      updated.audit_trail.push({
        stage,
        timestamp: new Date().toISOString(),
        action: hasUnready ? "gate_failed" : "gate_passed",
        detail: `Go/No-Go recommendation: ${plan.go_no_go.recommendation}`,
        ...(transcript ? { panel_transcript: transcript } : {}),
      });
      break;
    }
  }

  return updated;
}

/**
 * Advance to the next stage after a successful gate.
 */
export function advanceToNextStage(
  state: DecisionPipelineState
): DecisionPipelineState {
  const gateKey = `stage_${state.stage_index + 1}` as keyof typeof state.gate_results;
  const gate = state.gate_results[gateKey];

  if (!gate?.passed) {
    return {
      ...state,
      status: gate?.decision === "kill" ? "killed" : "deferred",
    };
  }

  const nextIndex = state.stage_index + 1;
  if (nextIndex >= DECISION_STAGES.length) {
    return { ...state, status: "passed" };
  }

  const nextStage = DECISION_STAGES[nextIndex];
  if (!nextStage) {
    return { ...state, status: "passed" };
  }

  return {
    ...state,
    current_stage: nextStage,
    stage_index: nextIndex,
  };
}

/**
 * Check if the pipeline is complete (all stages done or terminated early).
 */
export function isPipelineDone(state: DecisionPipelineState): boolean {
  return state.status !== "active";
}

/**
 * Generate a human-readable audit trail of the pipeline execution.
 */
export function formatAuditTrail(state: DecisionPipelineState): string {
  const lines: string[] = [
    "# Decision Engine Audit Trail",
    "",
    `Opportunity: ${state.opportunity_input.substring(0, 100)}`,
    `Status: ${state.status}`,
    `Current stage: ${state.current_stage}`,
    "",
  ];

  for (const entry of state.audit_trail) {
    lines.push(`## Stage: ${entry.stage}`);
    lines.push(`- Action: ${entry.action}`);
    lines.push(`- Detail: ${entry.detail}`);
    lines.push(`- Timestamp: ${entry.timestamp}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Check kill criteria that apply at any stage.
 */
export function checkKillCriteria(state: DecisionPipelineState): string | null {
  // Kill if ethical guardian fails at any stage
  if (state.artefacts.challenge_report?.final_positions.ethical_boundary_guardian === "fail") {
    return "Ethical Boundary Guardian declared fail — opportunity killed";
  }

  // Kill if societal benefit <= 2
  if (state.artefacts.opportunity_brief?.scores.societal_benefit.score !== undefined &&
      state.artefacts.opportunity_brief.scores.societal_benefit.score <= 2) {
    return "Societal benefit score <= 2 — extractive solutions are not permitted";
  }

  // Kill if Persona-x fit <= 3
  if (state.artefacts.opportunity_brief?.scores.persona_x_fit.score !== undefined &&
      state.artefacts.opportunity_brief.scores.persona_x_fit.score <= 3) {
    return "Persona-x fit score <= 3 — problem does not need multi-perspective challenge";
  }

  return null;
}
