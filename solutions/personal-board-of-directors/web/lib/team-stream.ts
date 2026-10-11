import path from "path";
import { createClient, sendMessage } from "@persona-x/llm/client.js";
import { loadPersonasForPanel } from "@persona-x/runtime/loader.js";
import { createPanelSession, determineSpeakingOrder } from "@persona-x/runtime/panel.js";
import { RUBRIC_DIMENSIONS } from "@persona-x/schema/rubric.js";
import type { RubricDimensionName } from "@persona-x/schema/rubric.js";
import type { LoadedPersona } from "@persona-x/runtime/interface.js";
import { generateTeamBrief } from "./team-brief";
import { LLM_MODEL } from "./constants";
import type {
  TeamSessionEvent,
  PersonaResponse,
  PersonaStance,
  PersonaStanceMap,
  CompetitiveAdvantageVerdict,
} from "./team-types";

const TEAM_PERSONA_DIR = path.join(process.cwd(), "personas", "team");

async function loadTeamPersonas(slugs: string[]): Promise<LoadedPersona[]> {
  const filePaths = slugs.map((slug) =>
    path.join(TEAM_PERSONA_DIR, `${slug}.yaml`)
  );
  const result = await loadPersonasForPanel(filePaths);
  if (Object.keys(result.errors).length > 0) {
    throw new Error(
      `Failed to load team personas: ${JSON.stringify(result.errors)}`
    );
  }
  return result.personas;
}

function identifyRubricInfluence(persona: LoadedPersona): RubricDimensionName[] {
  const rubric = persona.file.rubric;
  const scored = RUBRIC_DIMENSIONS.map((dim) => ({
    dim,
    distance: Math.abs(rubric[dim].score - 5),
  }));
  scored.sort((a, b) => b.distance - a.distance);
  return scored.slice(0, 3).map((s) => s.dim);
}

function buildPersonaUserMessage(
  projectBrief: string,
  persona: LoadedPersona,
  priorResponses: PersonaResponse[],
  stance: PersonaStance = "balanced",
  competitiveAdvantage?: CompetitiveAdvantageVerdict
): string {
  const influence = identifyRubricInfluence(persona);
  const influenceNote = influence
    .map((dim) => {
      const score = persona.file.rubric[dim].score;
      const label = dim.replace(/_/g, " ");
      return `- ${label}: ${score}/10`;
    })
    .join("\n");

  let stanceDirective = "";
  if (stance === "constructive") {
    stanceDirective =
      "Stance directive: Frame your entire response around how this project can succeed. Lead with paths forward, not problems.\n\n";
  } else if (stance === "critical") {
    stanceDirective =
      "Stance directive: Apply rigorous scrutiny. Prioritise surfacing risks and weaknesses that have not been challenged.\n\n";
  }

  let caFraming = "";
  if (competitiveAdvantage === "yes") {
    caFraming =
      "The Founder has identified a clear competitive advantage. Your role is to provide practical guidance on how to build this effectively.\n\n";
  }

  let message = `A software development team is reviewing the following project:

"${projectBrief}"

Your role: ${persona.file.metadata.name}
Your strongest rubric influences for this review:
${influenceNote}

${caFraming}${stanceDirective}Provide your perspective as ${persona.file.metadata.name}. Be specific, concrete, and actionable. Structure your response with:
1. Your initial take on this project from your role's perspective
2. Key concerns or risks you see from your vantage point
3. Your specific recommendations for the team
4. One thing the team should address that they probably have not considered yet

Keep your response focused and under 400 words. Use Australian English spelling.`;

  if (priorResponses.length > 0) {
    const priorSummary = priorResponses
      .map((r) => `${r.personaName}: ${r.content.substring(0, 200)}...`)
      .join("\n\n");
    message += `\n\nOther team members have already given their views:\n${priorSummary}\n\nBuild on or respectfully challenge their perspectives where relevant. Do not repeat what has already been said.`;
  }

  return message;
}

async function extractCompetitiveAdvantageVerdict(
  client: ReturnType<typeof createClient>,
  founderContent: string
): Promise<CompetitiveAdvantageVerdict> {
  try {
    const result = await sendMessage(client, {
      system:
        "You are analysing a Founder's project review. Based solely on their response, determine whether they believe the project has a clear competitive advantage. Reply with exactly one word: yes, no, or unsure. Output nothing else.",
      messages: [
        {
          role: "user",
          content: `Founder's response:\n\n${founderContent}\n\nDoes the Founder believe this project has a clear competitive advantage? Reply with one word: yes, no, or unsure.`,
        },
      ],
      maxTokens: 5,
      temperature: 0,
    });

    const word = result.content.trim().toLowerCase();
    if (word === "yes" || word === "no" || word === "unsure") {
      return word;
    }
    return "unsure";
  } catch {
    return "unsure";
  }
}

export interface TeamSessionOptions {
  projectBrief: string;
  selectedSlugs: string[];
  founderOnly?: boolean;
  personaStances?: PersonaStanceMap;
  competitiveAdvantage?: CompetitiveAdvantageVerdict;
  initialPriorResponses?: PersonaResponse[];
}

/**
 * Run a team consultation session, returning a ReadableStream of SSE events.
 *
 * When founderOnly is true: streams only the Founder persona, extracts the
 * competitive advantage verdict, emits competitive_advantage_verdict and
 * founder_phase_complete, then closes.
 *
 * When founderOnly is false: streams all selected personas (prepending any
 * initialPriorResponses), generates the Team Brief, and emits session_complete.
 */
export function runTeamSession(
  options: TeamSessionOptions
): ReadableStream<Uint8Array> {
  const {
    projectBrief,
    selectedSlugs,
    founderOnly = false,
    personaStances = {},
    competitiveAdvantage,
    initialPriorResponses = [],
  } = options;

  const encoder = new TextEncoder();
  let activeStream: { abort(): void } | null = null;
  let cancelled = false;

  return new ReadableStream({
    async start(controller) {
      function emit(event: TeamSessionEvent) {
        if (cancelled) return;
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      try {
        const client = createClient();
        const personas = await loadTeamPersonas(selectedSlugs);
        const ordered = determineSpeakingOrder(personas);

        const session = createPanelSession({
          topic: projectBrief,
          context: "Software Team Advisor — single-round project review",
          personas: ordered,
          max_rounds: 1,
          moderation: "none",
        });

        emit({ type: "session_start", personaCount: ordered.length });

        const responses: PersonaResponse[] = [...initialPriorResponses];

        for (const persona of ordered) {
          if (cancelled) break;

          const systemPrompt = session.system_prompts.get(persona.id);
          if (!systemPrompt) continue;

          emit({
            type: "persona_start",
            personaId: persona.id,
            personaName: persona.file.metadata.name,
            role: persona.file.panel_role.contribution_type,
          });

          const stance: PersonaStance = personaStances[persona.id] ?? "balanced";
          const userMessage = buildPersonaUserMessage(
            projectBrief,
            persona,
            responses,
            stance,
            founderOnly ? undefined : competitiveAdvantage
          );
          let fullContent = "";

          try {
            const stream = client.messages.stream({
              model: LLM_MODEL,
              max_tokens: 1024,
              temperature: 0.7,
              system: systemPrompt,
              messages: [{ role: "user", content: userMessage }],
            });
            activeStream = stream;

            for await (const event of stream) {
              if (cancelled) break;
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                const token = event.delta.text;
                fullContent += token;
                emit({ type: "persona_token", personaId: persona.id, token });
              }
            }

            activeStream = null;
          } catch (err) {
            activeStream = null;
            if (cancelled) break;
            fullContent = `[Error generating response: ${err instanceof Error ? err.message : String(err)}]`;
            emit({ type: "persona_token", personaId: persona.id, token: fullContent });
          }

          responses.push({
            personaId: persona.id,
            personaName: persona.file.metadata.name,
            content: fullContent,
            isComplete: true,
          });

          emit({ type: "persona_complete", personaId: persona.id });
        }

        if (cancelled) {
          controller.close();
          return;
        }

        // Phase 1: founder-only — extract verdict and signal gate
        if (founderOnly) {
          const founderResponse = responses.find((r) => r.personaId === "founder");
          const verdict = founderResponse
            ? await extractCompetitiveAdvantageVerdict(client, founderResponse.content)
            : "unsure";

          emit({ type: "competitive_advantage_verdict", verdict });
          emit({ type: "founder_phase_complete" });
          controller.close();
          return;
        }

        // Phase 2 (or single-phase fallback): generate brief and complete
        emit({ type: "brief_start" });

        try {
          const brief = await generateTeamBrief(client, projectBrief, responses);
          emit({ type: "brief_complete", brief });
        } catch (err) {
          emit({
            type: "error",
            message: `Failed to generate Team Brief: ${err instanceof Error ? err.message : String(err)}`,
          });
        }

        emit({ type: "session_complete" });
        controller.close();
      } catch (err) {
        if (cancelled) {
          controller.close();
          return;
        }
        emit({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
        controller.close();
      }
    },
    cancel() {
      cancelled = true;
      activeStream?.abort();
      activeStream = null;
    },
  });
}
