import { NextResponse } from "next/server";
import { checkApiKey } from "@/lib/api-error";
import { createClient } from "@persona-x/llm/client.js";
import { LLM_MODEL } from "@/lib/constants";
import type { GenerateEvent } from "@/lib/biz-case-types";

export const maxDuration = 300;

const SYSTEM_PROMPT = `You are a senior business analyst and editor. You will receive a Build vs Buy business case narrative and improve it for clarity, flow, and impact.

Rules:
- Preserve the overall structure and section headings (## headings)
- Preserve all factual content, numbers, and decisions from the original
- Improve sentence clarity, transitions, and professional tone
- Make the language more concise and impactful
- Use Australian English spelling throughout
- Aim for 500–700 words
- Output plain text with ## headings only — no markdown formatting, no code blocks`;

function sseEvent(data: GenerateEvent): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request): Promise<Response> {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  let narrative: string;
  try {
    const body = await request.json() as { narrative?: unknown };
    narrative = typeof body.narrative === "string" ? body.narrative.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!narrative) {
    return NextResponse.json({ error: "narrative is required." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = createClient();
        const streamResponse = await client.messages.stream({
          model: LLM_MODEL,
          max_tokens: 1500,
          temperature: 0.4,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Please improve the following business case narrative:\n\n${narrative}`,
            },
          ],
        });

        for await (const event of streamResponse) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const token = event.delta.text;
            controller.enqueue(
              encoder.encode(sseEvent({ type: "narrative_token", token }))
            );
          }
        }

        controller.enqueue(
          encoder.encode(sseEvent({ type: "narrative_complete" }))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(sseEvent({ type: "error", message }))
        );
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
