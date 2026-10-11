import { NextResponse } from "next/server";
import { checkApiKey } from "@/lib/api-error";
import { createClient, sendMessage } from "@persona-x/llm/client.js";
import { TEAM_PERSONA_CATALOGUE } from "@/lib/team-personas";
import type { PersonaStance, PersonaStanceMap, ProjectResources } from "@/lib/team-types";

export const maxDuration = 30;

const VALID_STANCES: PersonaStance[] = ["constructive", "balanced", "critical"];

const SYSTEM_PROMPT = `You are an expert software project advisor. Given a project brief, select the most relevant team members from the available catalogue and assign each a recommended stance.

Available team members:
- frontend-developer: Frontend Developer — Client-side architecture, component design, and browser performance.
- backend-developer: Backend Developer — API design, data modelling, and server-side reliability.
- software-engineer: Software Engineer — System architecture, code quality, and long-term maintainability.
- ui-ux-specialist: UI/UX Specialist — User flows, interaction design, and accessibility standards.
- brand-manager: Brand Manager — Brand identity, tone of voice, and market positioning.
- ip-manager: IP Manager — Open-source licences, trademarks, and intellectual property risk.
- cybersecurity-specialist: Cybersecurity Specialist — Threat modelling, security controls, and data protection.
- contracting-specialist: Contracting Specialist — Vendor agreements, terms of service, and contractual obligations.
- risk-assessment-specialist: Risk Assessment Specialist — Project risks, dependency exposure, and mitigation planning.

Select 3–6 team members who are most relevant to the project. Assign each a stance: "constructive", "balanced", or "critical".

Output ONLY valid JSON in this exact format:
{
  "selectedPersonaIds": ["id1", "id2", "id3"],
  "stances": {
    "id1": "balanced",
    "id2": "critical",
    "id3": "constructive"
  }
}`;

const VALID_IDS = new Set(
  TEAM_PERSONA_CATALOGUE.filter((p) => p.id !== "founder").map((p) => p.id)
);

export async function POST(request: Request): Promise<NextResponse> {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  let projectBrief: string;
  let resources: ProjectResources | undefined;
  try {
    const body = await request.json() as { projectBrief?: unknown; resources?: unknown };
    projectBrief = typeof body.projectBrief === "string" ? body.projectBrief.trim() : "";
    resources = typeof body.resources === "object" && body.resources !== null
      ? body.resources as ProjectResources
      : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!projectBrief) {
    return NextResponse.json({ error: "projectBrief is required." }, { status: 400 });
  }

  // Build combined brief with non-empty resource fields
  const resourceLines: string[] = [];
  if (resources?.budget?.trim()) resourceLines.push(`Budget: ${resources.budget.trim()}`);
  if (resources?.team?.trim()) resourceLines.push(`Team: ${resources.team.trim()}`);
  if (resources?.specialties?.trim()) resourceLines.push(`Specialties: ${resources.specialties.trim()}`);
  if (resources?.existingTools?.trim()) resourceLines.push(`Existing tools: ${resources.existingTools.trim()}`);
  const combinedBrief = resourceLines.length > 0
    ? `${projectBrief}\n\n--- Available Resources ---\n${resourceLines.join("\n")}`
    : projectBrief;

  try {
    const client = createClient();
    const result = await sendMessage(client, {
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Project brief:\n\n"${combinedBrief}"\n\nSelect the most relevant team members and their recommended stances. Output valid JSON only.`,
        },
      ],
      maxTokens: 512,
      temperature: 0.2,
    });

    // Parse and validate the response
    const jsonMatch = result.content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch?.[1]?.trim() ?? result.content.trim();

    let parsed: { selectedPersonaIds?: unknown; stances?: unknown };
    try {
      parsed = JSON.parse(jsonStr) as { selectedPersonaIds?: unknown; stances?: unknown };
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response." }, { status: 500 });
    }

    // Validate and filter persona IDs — founder is always excluded
    const rawIds = Array.isArray(parsed.selectedPersonaIds) ? parsed.selectedPersonaIds : [];
    const selectedPersonaIds = rawIds
      .map(String)
      .filter((id) => VALID_IDS.has(id) && id !== "founder");

    // Validate stances, defaulting invalid ones to "balanced"
    const rawStances = typeof parsed.stances === "object" && parsed.stances !== null
      ? parsed.stances as Record<string, unknown>
      : {};
    const stances: PersonaStanceMap = {};
    for (const id of selectedPersonaIds) {
      const stance = rawStances[id];
      stances[id] = VALID_STANCES.includes(stance as PersonaStance)
        ? (stance as PersonaStance)
        : "constructive";
    }

    return NextResponse.json({ selectedPersonaIds, stances });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
