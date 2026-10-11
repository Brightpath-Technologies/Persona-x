import type Anthropic from "@anthropic-ai/sdk";
import {
  anthropic,
  WEB_SEARCH_TOOL,
  addUsage,
  textOf,
  type Usage,
} from "./anthropic";
import type { Beat, DraftFiling, Significance } from "./types";

export interface DeskResult {
  filings: DraftFiling[];
  usage: Usage;
}

const MAX_CONTINUATIONS = 8; // bound the server-side web-search loop
const SIG_VALUES: Significance[] = ["low", "medium", "high"];

/**
 * Run one desk in two phases:
 *
 *   1. RESEARCH — search the live web with the web_search server tool and
 *      summarise the significant findings (cited prose; loop over pause_turn).
 *   2. EXTRACT  — a separate call with NO web tool that is forced to call the
 *      `file_stories` tool, returning the filings as structured tool input.
 *
 * Splitting the two avoids the failure that made desks file nothing: a single
 * "reply with only JSON" turn after web search returns cited prose full of
 * `[1]`-style citation brackets, which breaks naive JSON extraction, and the
 * array gets truncated at max_tokens. Forced tool use gives guaranteed-shaped
 * output that cannot collide with citations.
 */
export async function runDesk(beat: Beat): Promise<DeskResult> {
  const client = anthropic();
  const today = new Date().toISOString().slice(0, 10);
  let usage: Usage = { input_tokens: 0, output_tokens: 0 };

  // --- Phase 1: research -----------------------------------------------------
  const researchSystem = [
    "You are a newsroom DESK — a specialist reporter on a single beat.",
    "Search the live web with the web_search tool for SIGNIFICANT, genuinely",
    "new developments on this beat. Be thorough: run several searches.",
    `Today is ${today}. Prefer the most recent, highest-impact items.`,
    "",
    "When you have searched enough, write a concise briefing of what you found:",
    "for each item give the headline, a one-to-three sentence factual summary,",
    "the source/outlet, the URL, whether it is an official release, an honest",
    "significance rating (low/medium/high), and the publication date if known.",
    "Do not fabricate — every item must come from a real search result.",
  ].join("\n");

  const assignment = [
    `BEAT: ${beat.name}`,
    `STANDING ASSIGNMENT: ${beat.brief}`,
    `RECENCY WINDOW: last ${beat.recency_days} day(s).`,
    `SIGNIFICANCE FLOOR: ${beat.significance_floor} (include items at or above this).`,
    `Aim for up to ${beat.max_items} items. If there is genuinely nothing`,
    "significant in the window, say so plainly.",
  ].join("\n");

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: assignment },
  ];
  const researchChunks: string[] = [];

  for (let i = 0; i < MAX_CONTINUATIONS; i++) {
    const response = await client.messages.create({
      model: beat.model,
      max_tokens: 8000,
      system: researchSystem,
      tools: [WEB_SEARCH_TOOL],
      messages,
    });
    usage = addUsage(usage, response.usage);

    const text = textOf(response);
    if (text) researchChunks.push(text);

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    break; // end_turn / max_tokens — research is done
  }

  const research = researchChunks.join("\n\n").trim();
  if (!research) return { filings: [], usage };

  // --- Phase 2: structured extraction (forced tool call, no web tool) --------
  const extraction = await client.messages.create({
    model: beat.model,
    max_tokens: 4000,
    system:
      "You convert a reporter's research briefing into structured filings. " +
      "Use only what the briefing states — never invent items, sources, or " +
      "dates. Drop anything below the significance floor or outside the " +
      "recency window. Call the file_stories tool exactly once.",
    tools: [FILE_STORIES_TOOL],
    tool_choice: { type: "tool", name: "file_stories" },
    messages: [
      {
        role: "user",
        content: [
          `Beat: ${beat.name}`,
          `Today: ${today}. Recency window: last ${beat.recency_days} day(s).`,
          `Significance floor: ${beat.significance_floor}.`,
          `File at most ${beat.max_items} items.`,
          "",
          "RESEARCH BRIEFING:",
          research,
        ].join("\n"),
      },
    ],
  });
  usage = addUsage(usage, extraction.usage);

  const filings = filingsFromToolUse(extraction);
  return { filings: filings.slice(0, beat.max_items), usage };
}

/** The forced extraction tool: its input IS the structured filing list. */
const FILE_STORIES_TOOL: Anthropic.Tool = {
  name: "file_stories",
  description:
    "File the significant stories found for this beat, as structured data.",
  input_schema: {
    type: "object",
    properties: {
      stories: {
        type: "array",
        description: "The filed stories. Empty if nothing significant.",
        items: {
          type: "object",
          properties: {
            headline: { type: "string" },
            summary: {
              type: "string",
              description: "1-3 factual sentences.",
            },
            source: {
              type: ["string", "null"],
              description: "Publication / outlet name.",
            },
            url: { type: ["string", "null"] },
            official: { type: "boolean" },
            significance: { type: "string", enum: ["low", "medium", "high"] },
            published_at: {
              type: ["string", "null"],
              description: "ISO date YYYY-MM-DD, or null if undated.",
            },
          },
          required: ["headline", "summary", "official", "significance"],
        },
      },
    },
    required: ["stories"],
  },
};

/** Read + validate filings from the forced tool_use block. */
export function filingsFromToolUse(message: Anthropic.Message): DraftFiling[] {
  const block = message.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === "file_stories"
  );
  if (!block) return [];
  const input = block.input as { stories?: unknown };
  if (!Array.isArray(input.stories)) return [];
  return coerceFilings(input.stories);
}

/** Coerce arbitrary objects into validated DraftFilings, dropping bad rows. */
export function coerceFilings(arr: unknown[]): DraftFiling[] {
  const out: DraftFiling[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const headline = typeof o.headline === "string" ? o.headline.trim() : "";
    const summary = typeof o.summary === "string" ? o.summary.trim() : "";
    if (!headline || !summary) continue;

    const sig = SIG_VALUES.includes(o.significance as Significance)
      ? (o.significance as Significance)
      : "medium";

    out.push({
      headline,
      summary,
      source: typeof o.source === "string" ? o.source : null,
      url: typeof o.url === "string" ? o.url : null,
      official: o.official === true,
      significance: sig,
      published_at: normalizeDate(o.published_at),
    });
  }
  return out;
}

function normalizeDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}
