import type { LLMClient, LLMMessage } from "./client.js";
import { sendMessage, sendMessageForJSON } from "./client.js";
import type {
  DiscoveryQuestion,
  DiscoveryState,
  ExtractedSignal,
  PrioritySignal,
} from "../engine/discovery/discovery.js";
import { PRIORITY_SIGNALS } from "../engine/discovery/discovery.js";

/**
 * LLM-Powered Discovery
 *
 * Uses the configured LLM provider to drive the discovery phase:
 * - Presents questions to the user via the LLM
 * - Extracts structured signals from user responses
 * - Determines when signal sufficiency is reached
 */

const SIGNAL_EXTRACTION_SYSTEM = `You are an expert signal extractor for the Persona-x framework.
Your job is to analyse a user's response to a discovery question and extract structured signals.

The five priority signals are:
1. discomfort_triggers — What makes this persona uncomfortable or causes them to push back
2. evidence_change_thresholds — How much evidence is needed before accepting or changing position
3. ambiguity_handling — How the persona deals with incomplete information or unclear situations
4. pressure_behaviour — How the persona behaves under time pressure or conflict
5. deferral_preferences — When and how the persona defers to others or sets boundaries

For each signal you detect, rate your confidence:
- high: The response directly and clearly addresses this signal
- medium: The response implies this signal through context or indirect statements
- low: The response only tangentially touches this signal

Respond with a JSON array of extracted signals. Each signal must have:
- signal: one of the five priority signal names
- value: a concise description of what was revealed
- confidence: "high", "medium", or "low"

Only include signals that are genuinely present. Do not fabricate signals.
If no signals are extractable, return an empty array.

Respond ONLY with the JSON array, no other text.`;

/**
 * Extract signals from a user's response to a discovery question.
 */
export async function extractSignals(
  client: LLMClient,
  question: DiscoveryQuestion,
  userResponse: string,
): Promise<ExtractedSignal[]> {
  const prompt = `Discovery question asked:
"${question.text}"
${question.options ? `Options presented: ${question.options.join(", ")}` : ""}
${question.scenario_context ? `Scenario context: ${question.scenario_context}` : ""}

User's response:
"${userResponse}"

Extract all priority signals from this response. The question targeted these signals: ${question.targets.join(", ") || "general purpose establishment"}`;

  const signals = await sendMessageForJSON<ExtractedSignal[]>(
    client,
    {
      system: SIGNAL_EXTRACTION_SYSTEM,
      messages: [{ role: "user", content: prompt }],
      maxTokens: 1024,
      temperature: 0.3,
    },
    (data) => {
      if (!Array.isArray(data)) throw new Error("Expected array of signals");
      return data.map((item: Record<string, unknown>) => ({
        signal: validateSignalName(String(item.signal)),
        value: String(item.value),
        confidence: validateConfidence(String(item.confidence)),
        source_question_id: question.id,
      }));
    },
  );

  return signals;
}

/**
 * Generate a natural language version of a discovery question
 * that feels conversational rather than formulaic.
 */
export async function generateConversationalQuestion(
  client: LLMClient,
  question: DiscoveryQuestion,
  state: DiscoveryState,
): Promise<string> {
  const context = state.persona_purpose
    ? `The persona's purpose has been established as: "${state.persona_purpose}"`
    : "We are still establishing the persona's core purpose.";

  const previousSignals =
    state.signals.length > 0
      ? `Signals gathered so far: ${state.signals.map((s) => `${s.signal}: ${s.value}`).join("; ")}`
      : "No signals gathered yet.";

  const messages: LLMMessage[] = [
    {
      role: "user",
      content: `You are guiding a user through persona creation for the Persona-x framework.

${context}
${previousSignals}

The next structured question to ask is:
Type: ${question.type}
Text: "${question.text}"
${question.options ? `Options: ${question.options.join(" | ")}` : ""}
${question.spectrum_anchors ? `Spectrum: ${question.spectrum_anchors.low} ←→ ${question.spectrum_anchors.high}` : ""}
${question.scenario_context ? `Scenario: ${question.scenario_context}` : ""}

Rephrase this as a natural, conversational question that:
- Uses Australian English spelling (behaviour, organisation, etc.)
- Is direct and decision-oriented
- Preserves the intent and signal targets
- Feels like a skilled interviewer, not a form

Respond with ONLY the question text. No preamble.`,
    },
  ];

  const response = await sendMessage(client, {
    messages,
    maxTokens: 512,
    temperature: 0.6,
  });

  return response.content.trim();
}

/**
 * Extract purpose from user's initial description.
 */
export async function extractPurpose(
  client: LLMClient,
  userDescription: string,
): Promise<{ purpose: string; context: string | null }> {
  const result = await sendMessageForJSON<{
    purpose: string;
    context: string | null;
  }>(
    client,
    {
      system: `You are the Persona-x purpose extraction engine. Given a user's description of the persona they want to create, extract:
1. purpose: A clear, concise statement of what this persona does in a panel (1-2 sentences)
2. context: Any additional context about the domain, industry, or situation (1 sentence, or null if not provided)

Use Australian English spelling. Be precise and functional — this is about judgement and reasoning, not character.

Respond with a JSON object: { "purpose": "...", "context": "..." }`,
      messages: [{ role: "user", content: userDescription }],
      maxTokens: 512,
      temperature: 0.3,
    },
    (data) => {
      const obj = data as Record<string, unknown>;
      return {
        purpose: String(obj.purpose ?? ""),
        context: obj.context ? String(obj.context) : null,
      };
    },
  );

  return result;
}

function validateSignalName(name: string): PrioritySignal {
  if (PRIORITY_SIGNALS.includes(name as PrioritySignal)) {
    return name as PrioritySignal;
  }
  // Default to the closest match or first signal
  return "discomfort_triggers";
}

function validateConfidence(confidence: string): "high" | "medium" | "low" {
  if (
    confidence === "high" ||
    confidence === "medium" ||
    confidence === "low"
  ) {
    return confidence;
  }
  return "medium";
}
