import type { LLMClient } from "./client.js";
import { sendMessageForJSON } from "./client.js";
import type {
  PipelineState,
  PopulationSection,
} from "../engine/population/pipeline.js";
import type {
  PersonaPurpose,
  PersonaBio,
  PanelRole,
  ReasoningTendencies,
  InteractionStyle,
  Boundaries,
  InvocationCues,
  CommunicationStyle,
} from "../schema/persona.js";
import {
  PersonaPurposeSchema,
  PersonaBioSchema,
  PanelRoleSchema,
  ReasoningTendenciesSchema,
  InteractionStyleSchema,
  BoundariesSchema,
  InvocationCuesSchema,
  CommunicationStyleSchema,
} from "../schema/persona.js";
import type { RubricProfile } from "../schema/rubric.js";
import {
  RubricProfileSchema,
  RUBRIC_DIMENSION_LABELS,
} from "../schema/rubric.js";

/**
 * LLM-Powered Population
 *
 * Uses the configured LLM provider to generate persona file sections
 * from discovery signals. Each section is validated against
 * its Zod schema before being accepted.
 */

const POPULATION_SYSTEM = `You are the Persona-x population engine. You generate structured persona file sections from discovery signals.

Rules:
- Use Australian English spelling (behaviour, organisation, licence, humour, colour)
- Generate functional descriptions, not character descriptions
- Focus on judgement, reasoning, and decision-making patterns
- All array fields must have at least one item
- Be specific and actionable — avoid vague or generic statements
- Respond ONLY with the JSON object for the requested section

Do not include any text outside the JSON object.`;

/**
 * Generate a persona section using LLM, validated against the appropriate schema.
 */
export async function generateSection(
  client: LLMClient,
  section: PopulationSection,
  state: PipelineState,
  userInput?: string,
): Promise<unknown> {
  switch (section) {
    case "purpose":
      return generatePurpose(client, state, userInput);
    case "panel_role":
      return generatePanelRole(client, state, userInput);
    case "rubric":
      return generateRubric(client, state, userInput);
    case "reasoning":
      return generateReasoning(client, state);
    case "interaction":
      return generateInteraction(client, state);
    case "boundaries":
      return generateBoundaries(client, state, userInput);
    case "optional":
      return generateOptionalSections(client, state);
    default:
      throw new Error(`Unknown section: ${section}`);
  }
}

async function generatePurpose(
  client: LLMClient,
  state: PipelineState,
  userInput?: string,
): Promise<PersonaPurpose> {
  const signalSummary = formatSignalSummary(state);

  return sendMessageForJSON<PersonaPurpose>(
    client,
    {
      system: POPULATION_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Generate the "purpose" section of a persona file.

${userInput ? `User's description: "${userInput}"` : ""}
Discovery context: ${state.discovery.persona_purpose ?? "Not yet established"}
${signalSummary}

The purpose section must have:
- description: 1-2 sentences on what this persona does in a panel
- invoke_when: array of situations where this persona should be activated (min 1)
- do_not_invoke_when: array of situations where this persona should NOT be activated (min 1)

Respond with a JSON object matching this structure.`,
        },
      ],
      maxTokens: 1024,
      temperature: 0.5,
    },
    (data) => PersonaPurposeSchema.parse(data),
  );
}

async function generatePanelRole(
  client: LLMClient,
  state: PipelineState,
  userInput?: string,
): Promise<PanelRole> {
  const signalSummary = formatSignalSummary(state);
  const purposeContext = state.partial_persona.purpose
    ? `Established purpose: "${state.partial_persona.purpose.description}"`
    : "";

  return sendMessageForJSON<PanelRole>(
    client,
    {
      system: POPULATION_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Generate the "panel_role" section of a persona file.

${purposeContext}
${userInput ? `User's input: "${userInput}"` : ""}
${signalSummary}

The panel_role section must have:
- contribution_type: one of "challenger", "integrator", "sense-checker", "specialist", "facilitator"
- expected_value: what this persona contributes to a panel (1-2 sentences)
- failure_modes_surfaced: array of failure modes this persona exists to catch (min 1)

Respond with a JSON object matching this structure.`,
        },
      ],
      maxTokens: 1024,
      temperature: 0.5,
    },
    (data) => PanelRoleSchema.parse(data),
  );
}

async function generateRubric(
  client: LLMClient,
  state: PipelineState,
  userInput?: string,
): Promise<RubricProfile> {
  const signalSummary = formatSignalSummary(state);
  const purposeContext = state.partial_persona.purpose
    ? `Purpose: "${state.partial_persona.purpose.description}"`
    : "";
  const roleContext = state.partial_persona.panel_role
    ? `Panel role: ${state.partial_persona.panel_role.contribution_type} — ${state.partial_persona.panel_role.expected_value}`
    : "";

  const dimensionDescriptions = Object.entries(RUBRIC_DIMENSION_LABELS)
    .map(([key, label]) => `- ${key}: ${label} (1-10 scale)`)
    .join("\n");

  return sendMessageForJSON<RubricProfile>(
    client,
    {
      system: POPULATION_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Generate the "rubric" section — the six-dimension judgement profile.

${purposeContext}
${roleContext}
${userInput ? `User's input: "${userInput}"` : ""}
${signalSummary}

The six dimensions (all required):
${dimensionDescriptions}

Each dimension must have:
- score: integer 1-10
- note: interpretive note (minimum 10 characters) explaining how this score manifests in behaviour, not why it's good or bad

Guidelines:
- Scores should be coherent with the persona's purpose and role
- Notes should be specific and behavioural, not abstract
- A challenger persona typically has lower risk_appetite and higher evidence_threshold
- An integrator typically has higher tolerance_for_ambiguity and intervention_frequency
- Avoid all dimensions clustering at 5 — create a distinctive profile shape

Respond with a JSON object with all six dimensions.`,
        },
      ],
      maxTokens: 2048,
      temperature: 0.5,
    },
    (data) => RubricProfileSchema.parse(data),
  );
}

async function generateReasoning(
  client: LLMClient,
  state: PipelineState,
): Promise<ReasoningTendencies> {
  const signalSummary = formatSignalSummary(state);
  const priorContext = formatPriorSections(state);

  return sendMessageForJSON<ReasoningTendencies>(
    client,
    {
      system: POPULATION_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Generate the "reasoning" section — how this persona thinks and decides.

${priorContext}
${signalSummary}

The reasoning section must have:
- default_assumptions: array of things this persona assumes unless told otherwise (min 1)
- notices_first: array of things this persona pays attention to first in any situation (min 1)
- systematically_questions: array of things this persona always challenges (min 1)
- under_pressure: how this persona behaves when time or conflict escalates (1-2 sentences)

These must be consistent with the rubric scores. A persona with high evidence_threshold should systematically question unsupported claims. A persona with low risk_appetite should default-assume things could go wrong.

Respond with a JSON object matching this structure.`,
        },
      ],
      maxTokens: 1024,
      temperature: 0.5,
    },
    (data) => ReasoningTendenciesSchema.parse(data),
  );
}

async function generateInteraction(
  client: LLMClient,
  state: PipelineState,
): Promise<InteractionStyle> {
  const signalSummary = formatSignalSummary(state);
  const priorContext = formatPriorSections(state);

  return sendMessageForJSON<InteractionStyle>(
    client,
    {
      system: POPULATION_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Generate the "interaction" section — how this persona engages in a panel.

${priorContext}
${signalSummary}

The interaction section must have:
- primary_mode: "questions" | "assertions" | "mixed"
- challenge_strength: "gentle" | "moderate" | "strong" | "confrontational"
- silent_when: array of situations where this persona stays quiet (min 1)
- handles_poor_input: how the persona responds to vague or low-quality input (1-2 sentences)

These must be consistent with the rubric and reasoning sections.

Respond with a JSON object matching this structure.`,
        },
      ],
      maxTokens: 1024,
      temperature: 0.5,
    },
    (data) => InteractionStyleSchema.parse(data),
  );
}

async function generateBoundaries(
  client: LLMClient,
  state: PipelineState,
  userInput?: string,
): Promise<Boundaries> {
  const signalSummary = formatSignalSummary(state);
  const priorContext = formatPriorSections(state);

  return sendMessageForJSON<Boundaries>(
    client,
    {
      system: POPULATION_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Generate the "boundaries" section — what this persona will not do.

${priorContext}
${userInput ? `User's input on boundaries: "${userInput}"` : ""}
${signalSummary}

The boundaries section must have:
- will_not_engage: topics or activities this persona refuses to participate in (min 1)
- will_not_claim: assertions this persona will never make (min 1)
- defers_by_design: areas where this persona explicitly defers to others (min 1)

Boundaries must be specific and functional. "Will not give legal advice" is good. "Will not be mean" is not a boundary — it's a behaviour constraint.

Respond with a JSON object matching this structure.`,
        },
      ],
      maxTokens: 1024,
      temperature: 0.5,
    },
    (data) => BoundariesSchema.parse(data),
  );
}

async function generateOptionalSections(
  client: LLMClient,
  state: PipelineState,
): Promise<{
  communication?: CommunicationStyle;
  invocation?: InvocationCues;
  bio?: PersonaBio;
}> {
  const priorContext = formatPriorSections(state);

  const result = await sendMessageForJSON<{
    communication: CommunicationStyle;
    invocation: InvocationCues;
    bio: PersonaBio;
  }>(
    client,
    {
      system: POPULATION_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Generate the optional sections: communication, invocation cues, and bio.

${priorContext}

Generate all three as a single JSON object:

{
  "communication": {
    "clarity_vs_brevity": "clarity" or "brevity",
    "structure_preference": "description of how they structure responses",
    "tone_markers": ["marker1", "marker2"] (min 1)
  },
  "invocation": {
    "include_when": ["situation where persona should be invoked"] (min 1),
    "exclude_when": ["situation where persona should NOT be invoked"] (min 1)
  },
  "bio": {
    "background": "1-3 sentences on the professional background this persona draws from",
    "perspective_origin": "1-2 sentences on how this background shapes their perspective"
  }
}

These must be consistent with all prior sections.`,
        },
      ],
      maxTokens: 2048,
      temperature: 0.5,
    },
    (data) => {
      const obj = data as Record<string, unknown>;
      return {
        communication: CommunicationStyleSchema.parse(obj.communication),
        invocation: InvocationCuesSchema.parse(obj.invocation),
        bio: PersonaBioSchema.parse(obj.bio),
      };
    },
  );

  return result;
}

function formatSignalSummary(state: PipelineState): string {
  if (state.discovery.signals.length === 0) {
    return "Discovery signals: none gathered yet.";
  }

  const lines = ["Discovery signals:"];
  for (const signal of state.discovery.signals) {
    lines.push(`  - ${signal.signal} (${signal.confidence}): ${signal.value}`);
  }
  return lines.join("\n");
}

function formatPriorSections(state: PipelineState): string {
  const lines: string[] = [];
  const p = state.partial_persona;

  if (p.purpose) {
    lines.push(`Purpose: ${p.purpose.description}`);
  }
  if (p.panel_role) {
    lines.push(
      `Panel role: ${p.panel_role.contribution_type} — ${p.panel_role.expected_value}`,
    );
  }
  if (p.rubric) {
    lines.push("Rubric scores:");
    for (const [dim, data] of Object.entries(p.rubric)) {
      const score = data as { score: number; note: string };
      lines.push(`  ${dim}: ${score.score}/10 — ${score.note}`);
    }
  }
  if (p.reasoning) {
    lines.push(`Under pressure: ${p.reasoning.under_pressure}`);
  }
  if (p.interaction) {
    lines.push(
      `Interaction mode: ${p.interaction.primary_mode}, challenge: ${p.interaction.challenge_strength}`,
    );
  }

  return lines.length > 0 ? lines.join("\n") : "No prior sections populated.";
}
