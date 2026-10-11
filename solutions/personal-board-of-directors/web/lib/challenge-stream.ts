import { createClient } from "@persona-x/llm/client.js";
import { createPanelSession, determineSpeakingOrder } from "@persona-x/runtime/panel.js";
import { loadBoardPersonas } from "./personas";
import { LLM_MODEL } from "./constants";
import type { ChallengeExchange } from "./types";

interface ChallengeStreamParams {
  personaId: string;
  decision: string;
  initialResponse: string;
  priorChallenges: ChallengeExchange[];
  challengeText: string;
}

export type ChallengeStreamEvent =
  | { type: "challenge_reply_token"; token: string }
  | { type: "challenge_reply_complete" }
  | { type: "error"; message: string };

/**
 * Run a challenge reply stream for a single persona.
 * Returns a ReadableStream of SSE events.
 */
export function runChallengeStream(params: ChallengeStreamParams): ReadableStream<Uint8Array> {
  const { personaId, decision, initialResponse, priorChallenges, challengeText } = params;
  const encoder = new TextEncoder();

  let activeStream: { abort(): void } | null = null;

  return new ReadableStream({
    async start(controller) {
      function emit(event: ChallengeStreamEvent) {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      try {
        const client = createClient();
        const personas = await loadBoardPersonas();
        const ordered = determineSpeakingOrder(personas);

        const session = createPanelSession({
          topic: decision,
          context: "Personal Board of Directors — single-round advisory session",
          personas: ordered,
          max_rounds: 1,
          moderation: "none",
        });

        const persona = ordered.find((p) => p.id === personaId);
        if (!persona) {
          emit({ type: "error", message: `Persona ${personaId} not found` });
          controller.close();
          return;
        }

        const systemPrompt = session.system_prompts.get(persona.id);
        if (!systemPrompt) {
          emit({ type: "error", message: `No system prompt for persona ${personaId}` });
          controller.close();
          return;
        }

        // Build conversation history
        const messages: Array<{ role: "user" | "assistant"; content: string }> = [
          {
            role: "user",
            content: `A user has presented the following decision to their Personal Board of Directors:\n\n"${decision}"\n\nProvide your perspective as ${persona.file.metadata.name}. Be specific, concrete, and actionable.`,
          },
          {
            role: "assistant",
            content: initialResponse,
          },
        ];

        // Add prior challenge exchanges
        for (const exchange of priorChallenges) {
          messages.push({ role: "user", content: exchange.challengeText });
          messages.push({ role: "assistant", content: exchange.replyContent });
        }

        // Add current challenge
        messages.push({ role: "user", content: challengeText });

        const stream = client.messages.stream({
          model: LLM_MODEL,
          max_tokens: 1024,
          temperature: 0.7,
          system: systemPrompt,
          messages,
        });
        activeStream = stream;

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            emit({ type: "challenge_reply_token", token: event.delta.text });
          }
        }

        activeStream = null;
        emit({ type: "challenge_reply_complete" });
        controller.close();
      } catch (err) {
        activeStream = null;
        if ((err as Error).name === "APIUserAbortError") {
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
      activeStream?.abort();
      activeStream = null;
    },
  });
}
