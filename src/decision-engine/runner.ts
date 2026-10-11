import type Anthropic from "@anthropic-ai/sdk";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sendMessageForJSON } from "../llm/client.js";
import {
  generatePersonaResponse,
  generateRoundSummary,
} from "../llm/panel-llm.js";
import type { PanelMessage, PanelRound } from "../runtime/interface.js";
import { loadPersonasForPanel } from "../runtime/loader.js";
import type { PanelSession } from "../runtime/panel.js";
import {
  createPanelSession,
  determineSpeakingOrder,
  shouldPersonaContribute,
} from "../runtime/panel.js";
import {
  ChallengeReportSchema,
  DeliveryPlanSchema,
  OpportunityBriefSchema,
  PrototypeSpecSchema,
  calculateCompositeScore,
} from "./schema.js";
import type {
  ChallengeReport,
  DeliveryPlan,
  OpportunityBrief,
  PrototypeSpec,
} from "./schema.js";
import {
  STAGE_PANELS,
  advanceToNextStage,
  checkKillCriteria,
  createDecisionPipeline,
  isPipelineDone,
  recordStageResult,
} from "./pipeline.js";
import type { DecisionPipelineState, TranscriptRound } from "./pipeline.js";

const _dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Default directory for engine persona YAML files.
 * Resolved relative to this module's location in dist/.
 */
export const DEFAULT_PERSONA_DIR = join(_dirname, "../../examples/engine");

export interface RunnerOptions {
  /** Override the directory containing engine persona YAML files. */
  personaDir?: string;
}

export interface StageRunResult {
  state: DecisionPipelineState;
  transcript: TranscriptRound[];
  killReason: string | null;
  session: PanelSession;
}

/**
 * Run a single stage of the Decision Engine.
 *
 * Loads the stage's persona YAML files, conducts the multi-round panel
 * discussion, synthesises the structured artefact from the transcript,
 * records the result in the pipeline state, and evaluates kill criteria.
 */
export async function runStage(
  client: Anthropic,
  state: DecisionPipelineState,
  options?: RunnerOptions
): Promise<StageRunResult> {
  const personaDir = options?.personaDir ?? DEFAULT_PERSONA_DIR;
  const stagePanel = STAGE_PANELS[state.current_stage];

  // 1. Load persona YAML files for this stage
  const filePaths = stagePanel.personas.map(
    (slug) => join(personaDir, `${slug}.yaml`)
  );
  const { personas, errors } = await loadPersonasForPanel(filePaths);

  if (personas.length === 0) {
    throw new Error(
      `Failed to load personas for stage "${state.current_stage}": ${JSON.stringify(errors)}`
    );
  }

  // 2. Create panel session
  const topic = buildStageTopic(state);
  const context = buildStageContext(state);
  const session = createPanelSession({
    topic,
    context,
    personas,
    max_rounds: stagePanel.rounds,
    moderation: "light",
  });

  // 3. Run discussion rounds
  const transcript: TranscriptRound[] = [];

  for (let roundNum = 1; roundNum <= stagePanel.rounds; roundNum++) {
    const speakingOrder = determineSpeakingOrder(personas);
    const contributing = speakingOrder.filter((p) =>
      shouldPersonaContribute(p, roundNum, stagePanel.rounds)
    );

    const roundMessages: PanelMessage[] = [];

    for (const persona of contributing) {
      const message = await generatePersonaResponse(
        client,
        session,
        persona,
        roundNum,
        roundMessages
      );
      roundMessages.push(message);
    }

    const summary = await generateRoundSummary(client, topic, roundMessages);

    const round: PanelRound = {
      round_number: roundNum,
      messages: roundMessages,
      summary,
    };

    session.rounds.push(round);
    session.current_round = roundNum;

    transcript.push({
      round_number: roundNum,
      messages: roundMessages.map((m) => ({
        persona_name: m.persona_name,
        content: m.content,
        timestamp: m.timestamp,
      })),
      summary,
    });
  }

  // 4. Synthesise the structured stage artefact from the transcript
  const artefact = await synthesiseArtefact(client, state, transcript);

  // 5. Record the result in pipeline state, attaching the transcript
  const updated = recordStageResult(
    state,
    state.current_stage,
    artefact,
    transcript
  );

  // 6. Evaluate cross-stage kill criteria
  const killReason = checkKillCriteria(updated);

  return { state: updated, transcript, killReason, session };
}

/**
 * Run the full Decision Engine pipeline from Stage 1 through to completion.
 *
 * Iterates stages until the pipeline is done (passed, deferred, or killed).
 * Returns the final pipeline state including all artefacts and the audit trail.
 */
export async function runDecisionEngine(
  client: Anthropic,
  opportunityInput: string,
  options?: RunnerOptions
): Promise<DecisionPipelineState> {
  let state = createDecisionPipeline(opportunityInput);

  while (!isPipelineDone(state)) {
    const result = await runStage(client, state, options);
    state = result.state;

    if (result.killReason) {
      state = {
        ...state,
        status: "killed",
        audit_trail: [
          ...state.audit_trail,
          {
            stage: state.current_stage,
            timestamp: new Date().toISOString(),
            action: "killed",
            detail: result.killReason,
          },
        ],
      };
      break;
    }

    state = advanceToNextStage(state);
  }

  return state;
}

// ── Stage context builders ──────────────────────────────────────────

function buildStageTopic(state: DecisionPipelineState): string {
  const input = state.opportunity_input.substring(0, 100);
  switch (state.current_stage) {
    case "propose":
      return `Opportunity evaluation: ${input}`;
    case "challenge":
      return `Adversarial challenge: ${state.artefacts.opportunity_brief?.opportunity.title ?? "opportunity"}`;
    case "prototype":
      return `Prototype design: ${state.artefacts.opportunity_brief?.opportunity.title ?? "opportunity"}`;
    case "execute":
      return `Execution readiness: ${state.artefacts.opportunity_brief?.opportunity.title ?? "opportunity"}`;
  }
}

function buildStageContext(state: DecisionPipelineState): string {
  switch (state.current_stage) {
    case "propose":
      return `Evaluate this raw opportunity and structure it into a scored Opportunity Brief.\n\nOpportunity: ${state.opportunity_input}`;
    case "challenge": {
      const brief = state.artefacts.opportunity_brief;
      return [
        "Adversarially challenge this Opportunity Brief that passed Stage 1.",
        "",
        `Title: ${brief?.opportunity.title ?? ""}`,
        `Problem: ${brief?.opportunity.problem_statement ?? ""}`,
        `Solution: ${brief?.opportunity.proposed_solution ?? ""}`,
        `Buyer: ${brief?.opportunity.target_buyer ?? ""}`,
        `Composite Score: ${brief?.scores.composite ?? 0}/10`,
      ].join("\n");
    }
    case "prototype": {
      const brief = state.artefacts.opportunity_brief;
      return [
        "Design the minimum viable prototype for this validated opportunity.",
        "",
        `Opportunity: ${brief?.opportunity.title ?? ""}`,
        `Proposed solution: ${brief?.opportunity.proposed_solution ?? ""}`,
      ].join("\n");
    }
    case "execute": {
      const brief = state.artefacts.opportunity_brief;
      return [
        "Plan delivery and assess launch readiness for this opportunity.",
        "",
        `Opportunity: ${brief?.opportunity.title ?? ""}`,
        `Proposed solution: ${brief?.opportunity.proposed_solution ?? ""}`,
      ].join("\n");
    }
  }
}

// ── Artefact synthesis ──────────────────────────────────────────────

async function synthesiseArtefact(
  client: Anthropic,
  state: DecisionPipelineState,
  transcript: TranscriptRound[]
): Promise<OpportunityBrief | ChallengeReport | PrototypeSpec | DeliveryPlan> {
  const transcriptText = formatTranscriptForSynthesis(transcript);
  switch (state.current_stage) {
    case "propose":
      return synthesiseOpportunityBrief(
        client,
        state.opportunity_input,
        transcriptText
      );
    case "challenge":
      return synthesiseChallengeReport(client, state, transcriptText);
    case "prototype":
      return synthesisePrototypeSpec(client, state, transcriptText);
    case "execute":
      return synthesiseDeliveryPlan(client, state, transcriptText);
  }
}

function formatTranscriptForSynthesis(transcript: TranscriptRound[]): string {
  return transcript
    .map((r) => {
      const messages = r.messages
        .map((m) => `${m.persona_name}: ${m.content}`)
        .join("\n\n");
      return `--- Round ${r.round_number} ---\n${messages}\n\nRound summary: ${r.summary}`;
    })
    .join("\n\n");
}

async function synthesiseOpportunityBrief(
  client: Anthropic,
  opportunityInput: string,
  transcriptText: string
): Promise<OpportunityBrief> {
  const system =
    "You are synthesising a panel discussion into a structured Opportunity Brief for the Persona-x Decision Engine. Use Australian English spelling throughout. Respond ONLY with valid JSON — no preamble, no explanation.";

  const userMessage = `Opportunity input:
${opportunityInput}

Panel discussion transcript:
${transcriptText}

Produce a JSON object with this exact structure:
{
  "opportunity": {
    "title": "Short descriptive title",
    "problem_statement": "Who has this problem, why it matters, what happens if unsolved",
    "proposed_solution": "How Persona-x addresses this",
    "target_buyer": "Specific buyer profile with budget authority"
  },
  "scores": {
    "problem_severity": { "score": integer 1-10, "note": "at least 10 characters explaining this score" },
    "societal_benefit": { "score": integer 1-10, "note": "at least 10 characters" },
    "market_viability": { "score": integer 1-10, "note": "at least 10 characters" },
    "persona_x_fit": { "score": integer 1-10, "note": "at least 10 characters" },
    "defensibility": { "score": integer 1-10, "note": "at least 10 characters" },
    "execution_complexity": { "score": integer 1-10, "note": "at least 10 characters" },
    "composite": number (problem_severity*0.20 + societal_benefit*0.20 + market_viability*0.20 + persona_x_fit*0.20 + defensibility*0.10 + execution_complexity*0.10)
  },
  "panel_tensions": [
    { "concern": "What a panellist challenged", "resolution": "How it was addressed or left open" }
  ],
  "decision": "proceed" or "defer" or "kill",
  "rationale": "Why this decision was reached, referencing the composite score"
}`;

  return sendMessageForJSON<OpportunityBrief>(
    client,
    {
      system,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 2048,
      temperature: 0.3,
    },
    (data) => {
      const result = OpportunityBriefSchema.safeParse(data);
      if (!result.success) {
        throw new Error(
          `Invalid OpportunityBrief from LLM: ${JSON.stringify(result.error.issues)}`
        );
      }
      // Recalculate composite to guarantee accuracy regardless of LLM rounding
      result.data.scores.composite = calculateCompositeScore(result.data.scores);
      return result.data;
    }
  );
}

async function synthesiseChallengeReport(
  client: Anthropic,
  state: DecisionPipelineState,
  transcriptText: string
): Promise<ChallengeReport> {
  const opportunityRef =
    state.artefacts.opportunity_brief?.opportunity.title ?? "opportunity";
  const system =
    "You are synthesising a panel discussion into a structured Challenge Report for the Persona-x Decision Engine. Use Australian English spelling. Respond ONLY with valid JSON.";

  const userMessage = `Opportunity reference: "${opportunityRef}"

Panel discussion transcript:
${transcriptText}

Produce a JSON object with this exact structure:
{
  "opportunity_ref": "${opportunityRef}",
  "risks_identified": [
    {
      "risk": "Description of the risk",
      "severity": "critical" or "high" or "medium" or "low",
      "raised_by": "Persona name",
      "mitigation": "Proposed mitigation",
      "status": "mitigated" or "accepted" or "unresolved"
    }
  ],
  "historical_parallels": [
    {
      "precedent": "What happened before",
      "relevance": "Why it matters here",
      "differentiator": "How this attempt is structurally different"
    }
  ],
  "ethical_assessment": {
    "harm_vectors": ["potential harm 1"],
    "affected_populations": ["affected population 1"],
    "safeguards_required": ["required safeguard 1"],
    "verdict": "pass" or "conditional_pass" or "fail"
  },
  "customer_reality_check": {
    "value_clarity": "Can the user understand the value in 30 seconds?",
    "friction_points": ["friction point 1"],
    "willingness_to_pay": "Realistic assessment of willingness to pay"
  },
  "final_positions": {
    "sceptical_investor": "pass" or "conditional_pass" or "fail",
    "failure_archaeologist": "pass" or "conditional_pass" or "fail",
    "ethical_boundary_guardian": "pass" or "conditional_pass" or "fail",
    "customer_devils_advocate": "pass" or "conditional_pass" or "fail"
  },
  "conditions_for_stage_3": ["Specific condition that must be addressed"],
  "decision": "proceed" or "defer" or "kill"
}`;

  return sendMessageForJSON<ChallengeReport>(
    client,
    {
      system,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 2048,
      temperature: 0.3,
    },
    (data) => {
      const result = ChallengeReportSchema.safeParse(data);
      if (!result.success) {
        throw new Error(
          `Invalid ChallengeReport from LLM: ${JSON.stringify(result.error.issues)}`
        );
      }
      return result.data;
    }
  );
}

async function synthesisePrototypeSpec(
  client: Anthropic,
  state: DecisionPipelineState,
  transcriptText: string
): Promise<PrototypeSpec> {
  const opportunityRef =
    state.artefacts.opportunity_brief?.opportunity.title ?? "opportunity";
  const system =
    "You are synthesising a panel discussion into a structured Prototype Specification for the Persona-x Decision Engine. Use Australian English spelling. Respond ONLY with valid JSON.";

  const userMessage = `Opportunity reference: "${opportunityRef}"

Panel discussion transcript:
${transcriptText}

Produce a JSON object with this exact structure:
{
  "opportunity_ref": "${opportunityRef}",
  "version": "0.1.0",
  "scope": {
    "included": ["Feature/capability included in v1"],
    "explicitly_excluded": ["What is NOT in v1"],
    "rationale": "Why this scope proves the value proposition"
  },
  "personas_required": [
    {
      "name": "Persona name",
      "role": "Panel role",
      "rubric_summary": "Key rubric positions summary",
      "designable": true,
      "design_effort": "low" or "medium" or "high"
    }
  ],
  "user_journey": {
    "steps": [
      {
        "step": 1,
        "action": "What the user does",
        "system_response": "What they receive",
        "time_to_value": "How quickly they see benefit"
      }
    ]
  },
  "revenue_model": {
    "pricing_structure": "Subscription / per-use / tiered",
    "entry_price": "Lowest tier price",
    "target_ltv": "Expected lifetime value per customer",
    "unit_economics": {
      "cost_per_delivery": "Cost to serve one customer interaction",
      "margin": "Expected margin at entry price"
    }
  },
  "build_plan": {
    "build": ["Component to custom build"],
    "buy_or_compose": ["Component to buy or compose"],
    "estimated_effort": "Effort estimate",
    "estimated_cost": "Cost estimate"
  },
  "success_criteria": [
    {
      "metric": "Metric name",
      "target": "Target value",
      "timeframe": "Timeframe to achieve"
    }
  ]
}`;

  return sendMessageForJSON<PrototypeSpec>(
    client,
    {
      system,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 2048,
      temperature: 0.3,
    },
    (data) => {
      const result = PrototypeSpecSchema.safeParse(data);
      if (!result.success) {
        throw new Error(
          `Invalid PrototypeSpec from LLM: ${JSON.stringify(result.error.issues)}`
        );
      }
      return result.data;
    }
  );
}

async function synthesiseDeliveryPlan(
  client: Anthropic,
  state: DecisionPipelineState,
  transcriptText: string
): Promise<DeliveryPlan> {
  const opportunityRef =
    state.artefacts.opportunity_brief?.opportunity.title ?? "opportunity";
  const system =
    "You are synthesising a panel discussion into a structured Delivery Plan for the Persona-x Decision Engine. Use Australian English spelling. Respond ONLY with valid JSON.";

  const userMessage = `Opportunity reference: "${opportunityRef}"

Panel discussion transcript:
${transcriptText}

Produce a JSON object with this exact structure:
{
  "opportunity_ref": "${opportunityRef}",
  "target_launch_date": "ISO date string e.g. 2026-06-01",
  "workstreams": [
    {
      "name": "Workstream name",
      "owner": "Owner role",
      "tasks": [
        {
          "task": "Task description",
          "effort": "Effort estimate",
          "dependency": "Dependency or none",
          "definition_of_done": "Clear completion criteria"
        }
      ]
    }
  ],
  "risk_register": [
    {
      "risk": "Risk description",
      "severity": "critical" or "high" or "medium" or "low",
      "raised_by": "Who raised it",
      "mitigation": "Mitigation plan",
      "status": "mitigated" or "accepted" or "unresolved"
    }
  ],
  "launch_plan": {
    "target_segment": "Specific first customer segment",
    "acquisition_channels": ["Channel 1"],
    "first_30_day_target": "Specific 30-day acquisition target",
    "messaging": "One-sentence launch message"
  },
  "operational_readiness": {
    "capacity": "How many customers can be served at launch",
    "scaling_trigger": "What triggers a capacity increase",
    "manual_processes": ["Manual process that cannot yet be automated"],
    "automation_plan": "Plan for automating manual processes"
  },
  "go_no_go": {
    "delivery_realist": "ready" or "conditional" or "not_ready",
    "risk_sentinel": "ready" or "conditional" or "not_ready",
    "market_entry_strategist": "ready" or "conditional" or "not_ready",
    "operations_scaler": "ready" or "conditional" or "not_ready",
    "conditions": ["Any conditions that must be met before launch"],
    "recommendation": "go" or "conditional_go" or "no_go"
  }
}`;

  return sendMessageForJSON<DeliveryPlan>(
    client,
    {
      system,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 2048,
      temperature: 0.3,
    },
    (data) => {
      const result = DeliveryPlanSchema.safeParse(data);
      if (!result.success) {
        throw new Error(
          `Invalid DeliveryPlan from LLM: ${JSON.stringify(result.error.issues)}`
        );
      }
      return result.data;
    }
  );
}
