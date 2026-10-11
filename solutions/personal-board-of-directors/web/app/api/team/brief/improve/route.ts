import { NextResponse } from "next/server";
import { checkApiKey } from "@/lib/api-error";
import { createClient, sendMessage } from "@persona-x/llm/client.js";
import { parseTeamBrief } from "@/lib/team-brief";
import type { TeamBrief } from "@/lib/team-types";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the Team Brief synthesiser for a Software Team Advisor service.
Your job is to rephrase an existing Team Brief for improved clarity and language quality, while preserving the JSON structure, verdict values, and all factual content.

Rules:
- Preserve the exact JSON structure
- Do NOT change verdict.recommendation (go / conditional_go / no_go)
- Do NOT change alignment.strength (strong / moderate / weak)
- Improve sentence clarity, specificity, and professional tone
- Use Australian English spelling throughout
- Output ONLY valid JSON, no markdown or explanation

The JSON structure to preserve:
{
  "alignment": {
    "areas": ["string"],
    "strength": "strong" | "moderate" | "weak"
  },
  "critical_risks": [
    {
      "risk": "string",
      "raised_by": "string",
      "implication": "string"
    }
  ],
  "build_priorities": ["string"],
  "unknowns": ["string"],
  "verdict": {
    "recommendation": "go" | "conditional_go" | "no_go",
    "summary": "string",
    "conditions": ["string"]
  }
}`;

export async function POST(request: Request): Promise<NextResponse> {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  let brief: TeamBrief;
  let projectBrief: string;
  try {
    const body = await request.json() as { brief?: unknown; projectBrief?: unknown };
    brief = body.brief as TeamBrief;
    projectBrief = typeof body.projectBrief === "string" ? body.projectBrief : "";
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
          content: `Project context: "${projectBrief}"\n\nExisting Team Brief to improve:\n\n${JSON.stringify(brief, null, 2)}\n\nRephrase for improved clarity and language quality. Output valid JSON only.`,
        },
      ],
      maxTokens: 2048,
      temperature: 0.3,
    });

    const improvedBrief = parseTeamBrief(result.content);
    return NextResponse.json({ brief: improvedBrief });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
