import { createClient } from "@persona-x/llm/client.js";
import { createPanelSession, determineSpeakingOrder } from "@persona-x/runtime/panel.js";
import { RUBRIC_DIMENSIONS } from "@persona-x/schema/rubric.js";
import type { RubricDimensionName } from "@persona-x/schema/rubric.js";
import type { LoadedPersona } from "@persona-x/runtime/interface.js";
import { loadBoardPersonas } from "./personas";
import { generateBoardBrief } from "./board-brief";
import { LLM_MODEL } from "./constants";
import type { BoardSessionEvent, PersonaResponse } from "./types";

/**
 * Identify the rubric dimensions that most influence this persona's response.
 * Re-implemented locally since identifyRubricInfluence is private in panel-llm.ts.
 * Returns the top 3 dimensions by distance from midpoint (5).
 */
function identifyRubricInfluence(persona: LoadedPersona): RubricDimensionName[] {
  const rubric = persona.file.rubric;
  const scored = RUBRIC_DIMENSIONS.map((dim) => ({
    dim,
    distance: Math.abs(rubric[dim].score - 5),
  }));
  scored.sort((a, b) => b.distance - a.distance);
  return scored.slice(0, 3).map((s) => s.dim);
}

/**
 * Build the user message for each persona, including rubric influence context.
 */
function buildPersonaUserMessage(
  decision: string,
  persona: LoadedPersona,
  priorResponses: PersonaResponse[]
): string {
  const influence = identifyRubricInfluence(persona);
  const influenceNote = influence
    .map((dim) => {
      const score = persona.file.rubric[dim].score;
      const label = dim.replace(/_/g, " ");
      return `- ${label}: ${score}/10`;
    })
    .join("\n");

  let message = `A user has presented the following decision to their Personal Board of Directors:

"${decision}"

Your strongest rubric influences for this response:
${influenceNote}

Provide your perspective as ${persona.file.metadata.name}. Be specific, concrete, and actionable. Structure your response with:
1. Your initial reaction and analysis
2. Key concerns or opportunities from your perspective
3. Your specific recommendation
4. One thing the user should consider that they probably have not

Keep your response focused and under 400 words.`;

  if (priorResponses.length > 0) {
    const priorSummary = priorResponses
      .map((r) => `${r.personaName}: ${r.content.substring(0, 200)}...`)
      .join("\n\n");
    message += `\n\nPrior Board members have already spoken:\n${priorSummary}\n\nBuild on or respectfully challenge their perspectives where relevant. Do not repeat what has already been said.`;
  }

  return message;
}

/**
 * Run a complete board session, returning a ReadableStream of SSE events.
 * If an advocate persona is provided, it is appended after the static board personas.
 */
export function runBoardSession(
  decision: string,
  advocatePersona?: LoadedPersona
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let activeStream: { abort(): void } | null = null;
  let cancelled = false;

  return new ReadableStream({
    async start(controller) {
      function emit(event: BoardSessionEvent) {
        if (cancelled) return;
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      try {
        const client = createClient();
        const personas = await loadBoardPersonas();
        const allPersonas = advocatePersona
          ? [...personas, advocatePersona]
          : personas;
        const ordered = determineSpeakingOrder(allPersonas);

        const session = createPanelSession({
          topic: decision,
          context: "Personal Board of Directors — single-round advisory session",
          personas: ordered,
          max_rounds: 1,
          moderation: "none",
        });

        emit({ type: "session_start", personaCount: ordered.length });

        const responses: PersonaResponse[] = [];

        // Stream each persona's response sequentially
        for (const persona of ordered) {
          if (cancelled) break;

          const systemPrompt = session.system_prompts.get(persona.id);
          if (!systemPrompt) continue;

          emit({
            type: "persona_start",
            personaId: persona.id,
            personaName: persona.file.metadata.name,
            role: persona.file.panel_role.contribution_type,
          });

          const userMessage = buildPersonaUserMessage(decision, persona, responses);
          let fullContent = "";

          try {
            // Use streaming via Anthropic SDK directly for per-token delivery
            const stream = client.messages.stream({
              model: LLM_MODEL,
              max_tokens: 1024,
              temperature: 0.7,
              system: systemPrompt,
              messages: [{ role: "user", content: userMessage }],
            });
            activeStream = stream;

            for await (const event of stream) {
              if (cancelled) break;
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                const token = event.delta.text;
                fullContent += token;
                emit({ type: "persona_token", personaId: persona.id, token });
              }
            }

            activeStream = null;
          } catch (err) {
            activeStream = null;
            if (cancelled) break;
            fullContent = `[Error generating response: ${err instanceof Error ? err.message : String(err)}]`;
            emit({ type: "persona_token", personaId: persona.id, token: fullContent });
          }

          responses.push({
            personaId: persona.id,
            personaName: persona.file.metadata.name,
            content: fullContent,
            isComplete: true,
            challenges: [],
          });

          emit({ type: "persona_complete", personaId: persona.id });
        }

        if (cancelled) {
          controller.close();
          return;
        }

        // Generate Board Brief
        emit({ type: "brief_start" });

        try {
          const brief = await generateBoardBrief(client, decision, responses);
          emit({ type: "brief_complete", brief });
        } catch (err) {
          emit({
            type: "error",
            message: `Failed to generate Board Brief: ${err instanceof Error ? err.message : String(err)}`,
          });
        }

        emit({ type: "session_complete" });
        controller.close();
      } catch (err) {
        if (cancelled) {
          controller.close();
          return;
        }
        emit({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
        controller.close();
      }
    },
    cancel() {
      cancelled = true;
      activeStream?.abort();
      activeStream = null;
    },
  });
}
