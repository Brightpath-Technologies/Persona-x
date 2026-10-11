import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
import { checkApiKey } from "@/lib/api-error";
import { createClient } from "@persona-x/llm/client.js";
import { LLM_MODEL } from "@/lib/constants";
import type { GenerateEvent } from "@/lib/biz-case-types";

const GENERATE_SYSTEM_PROMPT = `You are a senior business analyst helping a software team document a Build vs Buy business case.
Write a clear, professional narrative document based on the user's interview answers and any adviser challenges noted.

Structure it as:
## Executive Summary
## Problem Statement
## Options Analysis
### Option A: Build
### Option B: Buy
## Recommendation
## Key Risks
## Next Steps

Use Australian English. Be specific and concrete — reference the actual details provided.
Write in a professional third-person voice. Aim for 500–700 words. Output plain text with ## headings only.`;

export async function POST(request: NextRequest): Promise<Response> {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  let body: {
    answers?: {
      question: string;
      answer: string;
      challengeContent?: string;
      challengePersonaName?: string;
    }[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json(
      { error: "answers array is required" },
      { status: 400 }
    );
  }

  const answerLines = body.answers.map((a, i) => {
    let section = `Question ${i + 1}: ${a.question}\nAnswer: ${a.answer}`;
    if (a.challengeContent && a.challengePersonaName) {
      section += `\n[${a.challengePersonaName} noted: ${a.challengeContent}]`;
    }
    return section;
  });

  const userPrompt =
    `Please write a business case based on the following interview:\n\n` +
    answerLines.join("\n\n");

  const client = createClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function emit(event: GenerateEvent) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      }

      try {
        const llmStream = client.messages.stream({
          model: LLM_MODEL,
          max_tokens: 1500,
          temperature: 0.4,
          system: GENERATE_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        });

        for await (const event of llmStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            emit({ type: "narrative_token", token: event.delta.text });
          }
        }

        emit({ type: "narrative_complete" });
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
