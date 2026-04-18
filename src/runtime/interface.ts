import type { PersonaFile } from "../schema/persona.js";
import type { RubricDimensionName } from "../schema/rubric.js";

/**
 * Panel Runtime Interface
 *
 * Defines the contract between a persona file and the system that uses it.
 * This is what panel/orchestration systems implement to consume persona files.
 */

/** A persona loaded and ready for use in a panel */
export interface LoadedPersona {
  file: PersonaFile;
  id: string; // Unique identifier within a panel session
  active: boolean;
}

/** A message in a panel discussion */
export interface PanelMessage {
  persona_id: string;
  persona_name: string;
  content: string;
  timestamp: string;
  rubric_influence: RubricInfluence;
}

/** How the rubric shaped this particular response */
export interface RubricInfluence {
  dominant_dimensions: RubricDimensionName[];
  behaviour_notes: string[];
}

/** Configuration for a panel session */
export interface PanelConfig {
  topic: string;
  context: string;
  personas: LoadedPersona[];
  max_rounds: number;
  moderation: "none" | "light" | "strict";
}

/** The result of a panel discussion round */
export interface PanelRound {
  round_number: number;
  messages: PanelMessage[];
  summary: string;
}

/**
 * Generate a system prompt fragment for a persona.
 * This is what gets injected into the LLM context when the persona responds.
 */
export function generatePersonaSystemPrompt(persona: PersonaFile): string {
  const lines: string[] = [];

  lines.push(`You are ${persona.metadata.name}.`);
  lines.push("");

  // Purpose
  lines.push(`## Your Role`);
  lines.push(persona.purpose.description);
  lines.push("");

  // Panel contribution
  lines.push(`## Your Functional Contribution`);
  lines.push(`Contribution type: ${persona.panel_role.contribution_type}`);
  lines.push(persona.panel_role.expected_value);
  lines.push("");
  lines.push("Failure modes you exist to surface:");
  for (const mode of persona.panel_role.failure_modes_surfaced) {
    lines.push(`- ${mode}`);
  }
  lines.push("");

  // Rubric-driven behaviour instructions
  lines.push(`## Your Judgement Profile`);
  const rubric = persona.rubric;
  lines.push(
    `Risk Appetite: ${rubric.risk_appetite.score}/10 — ${rubric.risk_appetite.note}`,
  );
  lines.push(
    `Evidence Threshold: ${rubric.evidence_threshold.score}/10 — ${rubric.evidence_threshold.note}`,
  );
  lines.push(
    `Tolerance for Ambiguity: ${rubric.tolerance_for_ambiguity.score}/10 — ${rubric.tolerance_for_ambiguity.note}`,
  );
  lines.push(
    `Intervention Frequency: ${rubric.intervention_frequency.score}/10 — ${rubric.intervention_frequency.note}`,
  );
  lines.push(
    `Escalation Bias: ${rubric.escalation_bias.score}/10 — ${rubric.escalation_bias.note}`,
  );
  lines.push(
    `Delivery vs Rigour: ${rubric.delivery_vs_rigour_bias.score}/10 — ${rubric.delivery_vs_rigour_bias.note}`,
  );
  lines.push("");

  // Reasoning tendencies
  lines.push(`## How You Reason`);
  lines.push("Default assumptions:");
  for (const assumption of persona.reasoning.default_assumptions) {
    lines.push(`- ${assumption}`);
  }
  lines.push("");
  lines.push("You notice first:");
  for (const item of persona.reasoning.notices_first) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("You systematically question:");
  for (const item of persona.reasoning.systematically_questions) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push(`Under pressure: ${persona.reasoning.under_pressure}`);
  lines.push("");

  // Interaction style
  lines.push(`## How You Interact`);
  lines.push(`Primary mode: ${persona.interaction.primary_mode}`);
  lines.push(`Challenge strength: ${persona.interaction.challenge_strength}`);
  lines.push(`When input is poor: ${persona.interaction.handles_poor_input}`);
  lines.push("");
  lines.push("You remain silent when:");
  for (const item of persona.interaction.silent_when) {
    lines.push(`- ${item}`);
  }
  lines.push("");

  // Boundaries
  lines.push(`## Boundaries`);
  lines.push("Will not engage on:");
  for (const item of persona.boundaries.will_not_engage) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("Will not claim:");
  for (const item of persona.boundaries.will_not_claim) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("Defers by design to:");
  for (const item of persona.boundaries.defers_by_design) {
    lines.push(`- ${item}`);
  }

  return lines.join("\n");
}

/**
 * Determine which personas should be invoked for a given topic.
 * Uses invocation cues to filter.
 */
export function selectPersonasForTopic(
  _topic: string,
  personas: LoadedPersona[],
): LoadedPersona[] {
  // In a full implementation, this would use NLP to match topic against
  // invocation cues. For the prototype, we return all active personas.
  return personas.filter((p) => p.active);
}
