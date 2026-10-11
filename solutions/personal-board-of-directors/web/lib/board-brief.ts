import type Anthropic from "@anthropic-ai/sdk";
import { sendMessage } from "@persona-x/llm/client.js";
import type { BoardBrief, PersonaResponse } from "./types";

function buildBriefSystemPrompt(personaCount: number): string {
  return `You are the Board Brief synthesiser for a Personal Board of Directors advisory service.
Your job is to analyse the individual perspectives of ${personaCount} AI advisor personas and produce a structured synthesis.

You must output valid JSON matching this exact structure:
{
  "consensus": {
    "areas": ["string — areas where multiple personas agree"],
    "strength": "strong" | "moderate" | "weak"
  },
  "tensions": [
    {
      "between": ["Persona Name 1", "Persona Name 2"],
      "issue": "string — what they disagree about",
      "implication": "string — what this means for the decision"
    }
  ],
  "blindSpots": ["string — things the user's framing missed"],
  "recommendation": {
    "summary": "string — synthesised recommendation",
    "confidence": "high" | "moderate" | "low",
    "conditions": ["string — conditions under which this holds"]
  }
}

Rules:
- Be specific and actionable, not generic
- Tensions are valuable — highlight them, do not hide them
- Identify at least one blind spot
- The recommendation must be weighted by persona relevance to the decision type
- Low-confidence recommendations should be labelled honestly
- Some advisors may have received follow-up challenges. Their refined positions should carry more weight than initial takes on those points.
- Output ONLY valid JSON, no markdown or explanation`;
}

/**
 * Generate a Board Brief from the collected persona responses.
 */
export async function generateBoardBrief(
  client: Anthropic,
  decision: string,
  responses: PersonaResponse[]
): Promise<BoardBrief> {
  const responseSummary = responses
    .map((r) => {
      let section = `### ${r.personaName}\n${r.content}`;
      if (r.challenges && r.challenges.length > 0) {
        section += "\n\n#### Follow-up Discussion";
        for (const exchange of r.challenges) {
          section += `\n**User**: ${exchange.challengeText}`;
          section += `\n**${r.personaName}**: ${exchange.replyContent}`;
        }
      }
      return section;
    })
    .join("\n\n");

  const userPrompt = `The user presented this decision to their Personal Board of Directors:

"${decision}"

The following personas provided their individual perspectives:

${responseSummary}

Synthesise these perspectives into a Board Brief. Output valid JSON only.`;

  const result = await sendMessage(client, {
    system: buildBriefSystemPrompt(responses.length),
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 2048,
    temperature: 0.3,
  });

  return parseBoardBrief(result.content);
}

export function parseBoardBrief(content: string): BoardBrief {
  // Extract JSON from possible markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = jsonMatch?.[1]?.trim() ?? content.trim();

  const parsed = JSON.parse(jsonStr);

  // Validate structure with sensible defaults
  return {
    consensus: {
      areas: Array.isArray(parsed.consensus?.areas) ? parsed.consensus.areas : [],
      strength: ["strong", "moderate", "weak"].includes(parsed.consensus?.strength)
        ? parsed.consensus.strength
        : "moderate",
    },
    tensions: Array.isArray(parsed.tensions)
      ? parsed.tensions.map((t: Record<string, unknown>) => ({
          between: Array.isArray(t.between) ? [String(t.between[0]), String(t.between[1])] as [string, string] : ["Unknown", "Unknown"] as [string, string],
          issue: String(t.issue ?? ""),
          implication: String(t.implication ?? ""),
        }))
      : [],
    blindSpots: Array.isArray(parsed.blindSpots)
      ? parsed.blindSpots.map(String)
      : [],
    recommendation: {
      summary: String(parsed.recommendation?.summary ?? ""),
      confidence: ["high", "moderate", "low"].includes(parsed.recommendation?.confidence)
        ? parsed.recommendation.confidence
        : "moderate",
      conditions: Array.isArray(parsed.recommendation?.conditions)
        ? parsed.recommendation.conditions.map(String)
        : [],
    },
  };
}
