import type { LLMClient } from "./client.js";
import { sendMessage } from "./client.js";
import type { PanelMessage, RubricInfluence } from "../runtime/interface.js";
import type { PanelSession } from "../runtime/panel.js";
import type { LoadedPersona } from "../runtime/interface.js";
import { RUBRIC_DIMENSIONS } from "../schema/rubric.js";
import type { RubricDimensionName } from "../schema/rubric.js";

/**
 * LLM-Powered Panel Discussions
 *
 * Generates actual persona responses during panel sessions
 * using each persona's system prompt and rubric profile.
 */

/**
 * Generate a response from a persona in a panel discussion round.
 */
export async function generatePersonaResponse(
  client: LLMClient,
  session: PanelSession,
  persona: LoadedPersona,
  roundNumber: number,
  previousMessages: PanelMessage[]
): Promise<PanelMessage> {
  const systemPrompt = session.system_prompts.get(persona.id);
  if (!systemPrompt) {
    throw new Error(`No system prompt found for persona: ${persona.id}`);
  }

  const topic = session.config.topic;
  const context = session.config.context;

  // Build conversation history for this round
  const conversationContext = previousMessages.length > 0
    ? previousMessages
        .map((m) => `${m.persona_name}: ${m.content}`)
        .join("\n\n")
    : "No previous contributions in this round.";

  const userMessage = roundNumber === 1
    ? `The panel discussion topic is: "${topic}"\nContext: ${context}\n\nThis is Round ${roundNumber}. Provide your initial perspective on this topic, shaped by your rubric profile and role. Be concise (2-4 paragraphs).`
    : `Round ${roundNumber} of the panel discussion on: "${topic}"\n\nPrevious contributions this round:\n${conversationContext}\n\nRespond to the points raised by other panellists. Build on, challenge, or qualify their positions based on your rubric profile. Be concise (1-3 paragraphs).`;

  const response = await sendMessage(client, {
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    maxTokens: 1024,
    temperature: 0.7,
    cacheSystem: true,
  });

  const rubricInfluence = identifyRubricInfluence(persona);

  return {
    persona_id: persona.id,
    persona_name: persona.file.metadata.name,
    content: response.content,
    timestamp: new Date().toISOString(),
    rubric_influence: rubricInfluence,
  };
}

/**
 * Generate a round summary synthesising all contributions.
 */
export async function generateRoundSummary(
  client: LLMClient,
  topic: string,
  messages: PanelMessage[]
): Promise<string> {
  const contributions = messages
    .map((m) => `${m.persona_name}: ${m.content}`)
    .join("\n\n");

  const response = await sendMessage(client, {
    system: "You are a neutral panel moderator summarising a discussion round. Be concise and factual. Use Australian English spelling.",
    messages: [
      {
        role: "user",
        content: `Summarise this panel discussion round on "${topic}" in 2-3 sentences. Highlight key agreements, disagreements, and unresolved tensions.\n\n${contributions}`,
      },
    ],
    maxTokens: 512,
    temperature: 0.3,
  });

  return response.content;
}

/**
 * Identify which rubric dimensions most influenced a persona's contribution.
 * Selects the top 2-3 most extreme (highest or lowest) dimensions.
 */
function identifyRubricInfluence(persona: LoadedPersona): RubricInfluence {
  const rubric = persona.file.rubric;
  const scored: { dimension: RubricDimensionName; score: number; note: string }[] = [];

  for (const dim of RUBRIC_DIMENSIONS) {
    scored.push({
      dimension: dim,
      score: rubric[dim].score,
      note: rubric[dim].note,
    });
  }

  // Sort by distance from midpoint (5) — most extreme scores dominate
  scored.sort((a, b) => Math.abs(b.score - 5) - Math.abs(a.score - 5));

  const dominant = scored.slice(0, 3);

  return {
    dominant_dimensions: dominant.map((d) => d.dimension),
    behaviour_notes: dominant.map(
      (d) => `${d.dimension} (${d.score}/10): ${d.note}`
    ),
  };
}
