import { NextRequest, NextResponse } from "next/server";
import { checkApiKey } from "@/lib/api-error";
import { runTeamSession } from "@/lib/team-stream";
import type {
  PersonaStanceMap,
  CompetitiveAdvantageVerdict,
  PersonaResponse,
} from "@/lib/team-types";

export async function POST(request: NextRequest): Promise<Response> {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  let body: {
    projectBrief?: string;
    selectedPersonaIds?: string[];
    founderOnly?: boolean;
    personaStances?: PersonaStanceMap;
    competitiveAdvantage?: CompetitiveAdvantageVerdict;
    founderResponse?: { personaId: string; personaName: string; content: string };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const projectBrief = body.projectBrief?.trim();
  if (!projectBrief) {
    return NextResponse.json(
      { error: "Project brief is required" },
      { status: 400 }
    );
  }

  if (projectBrief.length > 5000) {
    return NextResponse.json(
      { error: "Project brief must be under 5000 characters" },
      { status: 400 }
    );
  }

  const { founderOnly, personaStances, competitiveAdvantage, founderResponse } = body;

  let selectedSlugs: string[];

  if (founderOnly === true) {
    selectedSlugs = ["founder"];
  } else {
    const selectedPersonaIds = body.selectedPersonaIds;
    if (!Array.isArray(selectedPersonaIds) || selectedPersonaIds.length < 1) {
      return NextResponse.json(
        { error: "At least 1 team member must be selected" },
        { status: 400 }
      );
    }
    selectedSlugs = selectedPersonaIds;
  }

  const initialPriorResponses: PersonaResponse[] = founderResponse
    ? [
        {
          personaId: founderResponse.personaId,
          personaName: founderResponse.personaName,
          content: founderResponse.content,
          isComplete: true,
        },
      ]
    : [];

  const stream = runTeamSession({
    projectBrief,
    selectedSlugs,
    founderOnly: founderOnly ?? false,
    personaStances: personaStances ?? {},
    competitiveAdvantage,
    initialPriorResponses,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
