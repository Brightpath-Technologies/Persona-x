import { NextRequest, NextResponse } from "next/server";
import { checkApiKey } from "@/lib/api-error";
import { createClient } from "@persona-x/llm/client.js";
import { LLM_MODEL } from "@/lib/constants";
import type { ProposeEvent } from "@/lib/biz-case-types";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a business analyst helping someone prepare answers for a Build vs Buy software evaluation interview. Given a specific interview question and prior answers for context, draft a clear, specific, first-person response they can personalise and edit.

Guidelines:
- Write in first-person as the user ("We are...", "Our main concern is...", "I believe...")
- Be concrete and specific — avoid vague generalities
- 3–5 sentences is ideal; cover the essentials without over-explaining
- Feel like a thoughtful starting point, not a polished final answer
- Use Australian English`;

export async function POST(request: NextRequest): Promise<Response> {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  let question: string;
  let priorAnswers: { question: string; answer: string }[];

  try {
    const body = await request.json() as {
      question?: unknown;
      priorAnswers?: unknown;
    };
    question = typeof body.question === "string" ? body.question.trim() : "";
    priorAnswers = Array.isArray(body.priorAnswers)
      ? (body.priorAnswers as { question: string; answer: string }[])
      : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ error: "question is required." }, { status: 400 });
  }

  const priorContext = priorAnswers.length > 0
    ? "\n\nPrior answers for context:\n" +
      priorAnswers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n") +
      "\n"
    : "";

  const userMessage =
    `The person is completing a Build vs Buy business case interview.${priorContext}\n` +
    `Current question: "${question}"\n\n` +
    `Draft a proposed first-person answer they can edit before submitting.`;

  const client = createClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function emit(event: ProposeEvent) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      }

      try {
        const llmStream = client.messages.stream({
          model: LLM_MODEL,
          max_tokens: 300,
          temperature: 0.5,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        });

        for await (const chunk of llmStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            emit({ type: "propose_token", token: chunk.delta.text });
          }
        }

        emit({ type: "propose_complete" });
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
