import type Anthropic from "@anthropic-ai/sdk";
import { sendMessage } from "@persona-x/llm/client.js";
import type { TeamBrief, PersonaResponse } from "./team-types";

const SYSTEM_PROMPT = `You are the Team Brief synthesiser for a Software Team Advisor service.
Your job is to analyse the individual perspectives from a selected set of software team personas and produce a structured synthesis.

You must output valid JSON matching this exact structure:
{
  "alignment": {
    "areas": ["string — areas where the team broadly agrees"],
    "strength": "strong" | "moderate" | "weak"
  },
  "critical_risks": [
    {
      "risk": "string — the risk",
      "raised_by": "string — which team member raised it",
      "implication": "string — what this means for the project"
    }
  ],
  "build_priorities": ["string — what to tackle first, in order"],
  "unknowns": ["string — open questions that need investigation before the team can proceed confidently"],
  "verdict": {
    "recommendation": "go" | "conditional_go" | "no_go",
    "summary": "string — synthesised recommendation in 2-3 sentences",
    "conditions": ["string — conditions that must be met before proceeding (empty if go)"]
  }
}

Rules:
- Be specific and actionable — reference the actual project, not generic advice
- Critical risks should be prioritised by severity — list the most dangerous first
- Build priorities should reflect the team's collective judgement, not just one perspective
- Unknowns are not the same as risks — they are gaps in knowledge, not known problems
- The verdict must reflect genuine consensus or clearly note where the team is divided
- Use Australian English spelling throughout
- Output ONLY valid JSON, no markdown or explanation`;

/**
 * Generate a Team Brief from the collected persona responses.
 */
export async function generateTeamBrief(
  client: Anthropic,
  projectBrief: string,
  responses: PersonaResponse[]
): Promise<TeamBrief> {
  const responseSummary = responses
    .map((r) => `### ${r.personaName}\n${r.content}`)
    .join("\n\n");

  const userPrompt = `The team is evaluating the following project:

"${projectBrief}"

The following team members have provided their perspectives:

${responseSummary}

Synthesise these perspectives into a Team Brief. Output valid JSON only.`;

  const result = await sendMessage(client, {
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 2048,
    temperature: 0.3,
  });

  return parseTeamBrief(result.content);
}

export function parseTeamBrief(content: string): TeamBrief {
  const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = jsonMatch?.[1]?.trim() ?? content.trim();

  const parsed = JSON.parse(jsonStr);

  return {
    alignment: {
      areas: Array.isArray(parsed.alignment?.areas)
        ? parsed.alignment.areas.map(String)
        : [],
      strength: ["strong", "moderate", "weak"].includes(parsed.alignment?.strength)
        ? parsed.alignment.strength
        : "moderate",
    },
    critical_risks: Array.isArray(parsed.critical_risks)
      ? parsed.critical_risks.map((r: Record<string, unknown>) => ({
          risk: String(r.risk ?? ""),
          raised_by: String(r.raised_by ?? ""),
          implication: String(r.implication ?? ""),
        }))
      : [],
    build_priorities: Array.isArray(parsed.build_priorities)
      ? parsed.build_priorities.map(String)
      : [],
    unknowns: Array.isArray(parsed.unknowns)
      ? parsed.unknowns.map(String)
      : [],
    verdict: {
      recommendation: ["go", "conditional_go", "no_go"].includes(
        parsed.verdict?.recommendation
      )
        ? parsed.verdict.recommendation
        : "conditional_go",
      summary: String(parsed.verdict?.summary ?? ""),
      conditions: Array.isArray(parsed.verdict?.conditions)
        ? parsed.verdict.conditions.map(String)
        : [],
    },
  };
}
