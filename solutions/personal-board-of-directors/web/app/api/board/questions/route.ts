import { NextResponse } from "next/server";
import { createClient } from "@persona-x/llm/client.js";
import { sendMessage } from "@persona-x/llm/client.js";
import { PERSONA_COUNT } from "@/lib/personas";
import { checkApiKey, apiErrorResponse } from "@/lib/api-error";

const SYSTEM_PROMPT = `You generate probing follow-up questions that help a board of ${PERSONA_COUNT} advisors give better counsel on a user's decision.

The ${PERSONA_COUNT} advisors are: a Strategist, a Mentor, a Devil's Advocate, a Visionary, a Pragmatist, an Analyst, a Coach, and an Ethicist.

Given a decision statement, produce 3-5 short, incisive questions that would surface missing context, unstated assumptions, or hidden constraints. Each question should help at least one advisor give a sharper, more tailored response.

Return ONLY valid JSON in this format:
{
  "questions": [
    { "id": "q1", "question": "...", "hint": "..." },
    { "id": "q2", "question": "...", "hint": "..." }
  ]
}

Rules:
- "hint" is a brief phrase suggesting what kind of answer is helpful (e.g. "timeline, resources, constraints")
- Questions should be specific to the decision, not generic
- Keep questions concise (one sentence each)
- Output ONLY valid JSON, no markdown or explanation`;

export async function POST(request: Request) {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  try {
    const body = await request.json();
    const decision = body.decision?.trim();

    if (!decision) {
      return NextResponse.json(
        { error: "Decision text is required" },
        { status: 400 }
      );
    }

    const client = createClient();
    const result = await sendMessage(client, {
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `The user is deciding:\n\n"${decision}"\n\nGenerate 3-5 probing questions.`,
        },
      ],
      maxTokens: 512,
      temperature: 0.6,
    });

    // Parse JSON from response
    const jsonMatch = result.content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch?.[1]?.trim() ?? result.content.trim();
    const parsed = JSON.parse(jsonStr);

    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("Failed to generate probing questions:", err);
    return apiErrorResponse(err);
  }
}
