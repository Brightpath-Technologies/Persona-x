import type {
  LoadedPersona,
  PanelConfig,
  PanelMessage,
  PanelRound,
} from "./interface.js";
import { generatePersonaSystemPrompt } from "./interface.js";
import type { LLMClient } from "../llm/client.js";
import {
  generatePersonaResponse,
  generateRoundSummary,
} from "../llm/panel-llm.js";

/**
 * Panel Simulator
 *
 * A lightweight panel runtime that drives persona files through
 * a multi-agent discussion. Responses are produced by the configured
 * LLM provider; round and session orchestration lives here.
 *
 * For the prototype, this provides:
 * - Persona selection based on topic
 * - System prompt generation per persona
 * - Round-robin discussion structure
 * - Turn ordering based on intervention frequency
 */

export interface PanelSession {
  config: PanelConfig;
  rounds: PanelRound[];
  current_round: number;
  system_prompts: Map<string, string>;
}

/**
 * Initialise a new panel session.
 */
export function createPanelSession(config: PanelConfig): PanelSession {
  // Generate system prompts for each persona
  const systemPrompts = new Map<string, string>();
  for (const persona of config.personas) {
    systemPrompts.set(persona.id, generatePersonaSystemPrompt(persona.file));
  }

  return {
    config,
    rounds: [],
    current_round: 0,
    system_prompts: systemPrompts,
  };
}

/**
 * Determine the speaking order for a round.
 * Personas with higher intervention frequency speak earlier.
 * This reflects the rubric's intervention_frequency dimension.
 */
export function determineSpeakingOrder(
  personas: LoadedPersona[],
): LoadedPersona[] {
  return [...personas].sort((a, b) => {
    const aFreq = a.file.rubric.intervention_frequency.score;
    const bFreq = b.file.rubric.intervention_frequency.score;
    return bFreq - aFreq; // Higher intervention frequency speaks first
  });
}

/**
 * Check if a persona should contribute to this round based on their
 * intervention frequency and the round context.
 *
 * Low intervention-frequency personas may skip rounds where nothing
 * material is at stake.
 */
export function shouldPersonaContribute(
  persona: LoadedPersona,
  roundNumber: number,
  _totalRounds: number,
): boolean {
  const freq = persona.file.rubric.intervention_frequency.score;

  // High intervention (8-10): always contribute
  if (freq >= 8) return true;

  // Medium intervention (4-7): contribute most rounds
  if (freq >= 4) return roundNumber === 1 || roundNumber % 2 === 0;

  // Low intervention (1-3): contribute on first round and final rounds
  return roundNumber === 1;
}

/**
 * Get the system prompt for a specific persona in this panel.
 */
export function getPersonaPrompt(
  session: PanelSession,
  personaId: string,
): string | undefined {
  return session.system_prompts.get(personaId);
}

/**
 * Execute one round of the panel discussion.
 *
 * Iterates personas in speaking order, calls the LLM for each persona that
 * should contribute this round, then generates a synthesising round summary.
 * Mutates the session in place and returns the completed round.
 */
export async function runPanelRound(
  client: LLMClient,
  session: PanelSession,
  roundNumber: number,
): Promise<PanelRound> {
  const order = determineSpeakingOrder(session.config.personas);
  const messages: PanelMessage[] = [];

  for (const persona of order) {
    if (!persona.active) continue;
    if (
      !shouldPersonaContribute(persona, roundNumber, session.config.max_rounds)
    ) {
      continue;
    }

    const message = await generatePersonaResponse(
      client,
      session,
      persona,
      roundNumber,
      messages,
    );
    messages.push(message);
  }

  const summary =
    messages.length > 0
      ? await generateRoundSummary(client, session.config.topic, messages)
      : "No contributions this round.";

  const round: PanelRound = {
    round_number: roundNumber,
    messages,
    summary,
  };

  session.rounds.push(round);
  session.current_round = roundNumber;
  return round;
}

/**
 * Run the full panel until max_rounds is reached or every persona has
 * gone silent for a round. Returns the completed session.
 */
export async function runPanel(
  client: LLMClient,
  session: PanelSession,
): Promise<PanelSession> {
  for (let round = 1; round <= session.config.max_rounds; round++) {
    const result = await runPanelRound(client, session, round);
    if (result.messages.length === 0) break;
  }
  return session;
}

/**
 * Format the panel discussion for human-readable output.
 */
export function formatPanelDiscussion(session: PanelSession): string {
  const lines: string[] = [];

  lines.push(`# Panel Discussion: ${session.config.topic}`);
  lines.push("");
  lines.push(`Context: ${session.config.context}`);
  lines.push(
    `Personas: ${session.config.personas.map((p) => p.file.metadata.name).join(", ")}`,
  );
  lines.push("");

  for (const round of session.rounds) {
    lines.push(`## Round ${round.round_number}`);
    lines.push("");
    for (const msg of round.messages) {
      lines.push(`### ${msg.persona_name}`);
      lines.push(msg.content);
      lines.push("");
    }
    if (round.summary) {
      lines.push(`**Round summary**: ${round.summary}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
