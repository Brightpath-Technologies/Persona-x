import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { checkApiKey } from "@/lib/api-error";
import { createClient } from "@persona-x/llm/client.js";
import { loadPersonasForPanel } from "@persona-x/runtime/loader.js";
import { createPanelSession } from "@persona-x/runtime/panel.js";
import { LLM_MODEL } from "@/lib/constants";
import type { TeamBrief, TeamSessionEvent, ProjectResources } from "@/lib/team-types";

export const maxDuration = 120;

function emitEvent(controller: ReadableStreamDefaultController, event: TeamSessionEvent): void {
  controller.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  let projectBrief: string;
  let resources: ProjectResources;
  let teamBrief: TeamBrief;
  let specialistResponses: { personaName: string; content: string }[];

  try {
    const body = await request.json() as {
      projectBrief?: unknown;
      resources?: unknown;
      teamBrief?: unknown;
      specialistResponses?: unknown;
    };
    projectBrief = typeof body.projectBrief === "string" ? body.projectBrief.trim() : "";
    resources = (typeof body.resources === "object" && body.resources !== null
      ? body.resources
      : { budget: "", team: "", specialties: "", existingTools: "" }) as ProjectResources;
    teamBrief = body.teamBrief as TeamBrief;
    specialistResponses = Array.isArray(body.specialistResponses)
      ? (body.specialistResponses as { personaName: string; content: string }[])
      : [];
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!projectBrief) {
    return NextResponse.json({ error: "projectBrief is required." }, { status: 400 });
  }
  if (!teamBrief) {
    return NextResponse.json({ error: "teamBrief is required." }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Load Founder persona
        const founderPath = path.join(process.cwd(), "personas", "team", "founder.yaml");
        const loaded = await loadPersonasForPanel([founderPath]);
        if (Object.keys(loaded.errors).length > 0) {
          throw new Error(`Failed to load founder persona: ${JSON.stringify(loaded.errors)}`);
        }

        const session = createPanelSession({
          topic: projectBrief,
          context: "Software Team Advisor",
          personas: loaded.personas,
          max_rounds: 1,
          moderation: "none",
        });

        const systemPrompt = session.system_prompts.get("founder") ?? "";

        // Build resource block for non-empty fields
        const resourceLines: string[] = [];
        if (resources.budget?.trim()) resourceLines.push(`Budget: ${resources.budget.trim()}`);
        if (resources.team?.trim()) resourceLines.push(`Team: ${resources.team.trim()}`);
        if (resources.specialties?.trim()) resourceLines.push(`Specialties: ${resources.specialties.trim()}`);
        if (resources.existingTools?.trim()) resourceLines.push(`Existing tools: ${resources.existingTools.trim()}`);
        const resourceBlock = resourceLines.length > 0
          ? `\n\n${resourceLines.join("\n")}`
          : "";

        // Build conditions block
        const conditions = teamBrief.verdict.conditions.length > 0
          ? `\nConditions: ${teamBrief.verdict.conditions.join("; ")}`
          : "";

        // Build specialist responses block
        const responsesBlock = specialistResponses
          .map((r) => `### ${r.personaName}\n${r.content}`)
          .join("\n\n");

        const userMessage = [
          `The specialist team has completed their analysis of the following project.`,
          ``,
          `Project: "${projectBrief}"${resourceBlock}`,
          ``,
          `Specialist verdict: ${teamBrief.verdict.recommendation} — ${teamBrief.verdict.summary}${conditions}`,
          `Build priorities: ${teamBrief.build_priorities.join("; ")}`,
          `Critical risks: ${teamBrief.critical_risks.map((r) => r.risk).join("; ")}`,
          ``,
          `Specialist responses:`,
          responsesBlock,
          ``,
          `Your role here is visionary. You have reviewed the specialist analysis. Respond as the Founder:`,
          `- Chart the path forward — what does success look like and how do we get there?`,
          `- Be supportive of the direction the specialists have identified`,
          `- Identify the biggest opportunity this project represents`,
          `- Give the team confidence and a clear sense of direction`,
          `- Be decisive and inspiring — not critical`,
          `- Under 300 words. Use Australian English.`,
        ].join("\n");

        const client = createClient();
        const messageStream = client.messages.stream({
          model: LLM_MODEL,
          max_tokens: 600,
          temperature: 0.6,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        });

        for await (const chunk of messageStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            emitEvent(controller, {
              type: "persona_token",
              personaId: "founder",
              token: chunk.delta.text,
            });
          }
        }

        emitEvent(controller, { type: "session_complete" });
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        emitEvent(controller, { type: "error", message });
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
