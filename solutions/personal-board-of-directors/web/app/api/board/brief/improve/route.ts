import { NextResponse } from "next/server";
import { checkApiKey } from "@/lib/api-error";
import { createClient, sendMessage } from "@persona-x/llm/client.js";
import { parseBoardBrief } from "@/lib/board-brief";
import type { BoardBrief } from "@/lib/types";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the Board Brief synthesiser for a Personal Board of Directors advisory service.
Your job is to rephrase an existing Board Brief for improved clarity and language quality, while preserving the JSON structure, confidence values, and all factual content.

Rules:
- Preserve the exact JSON structure
- Do NOT change recommendation.confidence (high / moderate / low)
- Do NOT change consensus.strength (strong / moderate / weak)
- Improve sentence clarity, specificity, and professional tone
- Use Australian English spelling throughout
- Output ONLY valid JSON, no markdown or explanation

The JSON structure to preserve:
{
  "consensus": {
    "areas": ["string"],
    "strength": "strong" | "moderate" | "weak"
  },
  "tensions": [
    {
      "between": ["Persona Name 1", "Persona Name 2"],
      "issue": "string",
      "implication": "string"
    }
  ],
  "blindSpots": ["string"],
  "recommendation": {
    "summary": "string",
    "confidence": "high" | "moderate" | "low",
    "conditions": ["string"]
  }
}`;

export async function POST(request: Request): Promise<NextResponse> {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  let brief: BoardBrief;
  let decision: string;
  try {
    const body = await request.json() as { brief?: unknown; decision?: unknown };
    brief = body.brief as BoardBrief;
    decision = typeof body.decision === "string" ? body.decision : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!brief || typeof brief !== "object") {
    return NextResponse.json({ error: "brief is required." }, { status: 400 });
  }

  try {
    const client = createClient();
    const result = await sendMessage(client, {
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Decision context: "${decision}"\n\nExisting Board Brief to improve:\n\n${JSON.stringify(brief, null, 2)}\n\nRephrase for improved clarity and language quality. Output valid JSON only.`,
        },
      ],
      maxTokens: 2048,
      temperature: 0.3,
    });

    const improvedBrief = parseBoardBrief(result.content);
    return NextResponse.json({ brief: improvedBrief });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
