import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import { checkApiKey } from "@/lib/api-error";
import { createClient } from "@persona-x/llm/client.js";
import { loadPersonasForPanel } from "@persona-x/runtime/loader.js";
import { createPanelSession } from "@persona-x/runtime/panel.js";
import { LLM_MODEL } from "@/lib/constants";
import type { ChallengeEvent } from "@/lib/biz-case-types";

export async function POST(request: NextRequest): Promise<Response> {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  let body: {
    personaSlug?: string;
    question?: string;
    answer?: string;
    priorAnswers?: { question: string; answer: string }[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { personaSlug, question, answer, priorAnswers = [] } = body;

  if (!personaSlug || !question || !answer) {
    return NextResponse.json(
      { error: "personaSlug, question, and answer are required" },
      { status: 400 }
    );
  }

  const personaPath = path.join(
    process.cwd(),
    "personas",
    "team",
    `${personaSlug}.yaml`
  );

  let result: Awaited<ReturnType<typeof loadPersonasForPanel>>;
  try {
    result = await loadPersonasForPanel([personaPath]);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to load persona: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  if (Object.keys(result.errors).length > 0) {
    return NextResponse.json(
      { error: `Persona not found or invalid: ${personaSlug}` },
      { status: 404 }
    );
  }

  const personas = result.personas;
  if (personas.length === 0) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  const persona = personas[0];

  const session = createPanelSession({
    topic: question,
    context: "Build vs Buy business case challenge",
    personas,
    max_rounds: 1,
    moderation: "none",
  });

  const systemPrompt = session.system_prompts.get(persona.id);
  if (!systemPrompt) {
    return NextResponse.json(
      { error: "Failed to get system prompt for persona" },
      { status: 500 }
    );
  }

  let priorSummary = "";
  if (priorAnswers.length > 0) {
    priorSummary =
      "\n\nPrior context:\n" +
      priorAnswers
        .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
        .join("\n\n") +
      "\n";
  }

  const userMessage =
    `The user is building a business case for a Build vs Buy software decision.${priorSummary}\n` +
    `Question: "${question}"\n` +
    `Their answer: "${answer}"\n\n` +
    `From your role's perspective, respond positively and constructively. Assume the direction is sound and focus on how to make it work. Offer 1–2 specific, actionable suggestions that would strengthen their approach — things they should consider, plan for, or embed in their decision to improve the outcome. Be encouraging and forward-looking. Under 150 words. Use Australian English.`;

  const client = createClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function emit(event: ChallengeEvent) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      }

      try {
        const llmStream = client.messages.stream({
          model: LLM_MODEL,
          max_tokens: 300,
          temperature: 0.7,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        });

        for await (const event of llmStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            emit({ type: "challenge_token", token: event.delta.text });
          }
        }

        emit({ type: "challenge_complete" });
      } catch (err) {
        emit({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
