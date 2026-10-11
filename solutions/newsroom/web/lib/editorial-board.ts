import { anthropic, addUsage, type Usage } from "./anthropic";
import { loadEditorialBoard } from "./personas";
import { DEFAULT_MODEL } from "./pricing";
import type { BoardReview, BoardVerdict } from "./types";

// The editorial board reviews a draft edition before it can be published.
// Each member is a persona-x persona; they challenge the wire for accuracy,
// significance, and risk. The board's job is the human-in-the-loop quality gate.

const VERDICTS = ["publish", "hold", "revise"] as const;

export interface BoardResult {
  review: BoardReview;
  usage: Usage;
}

export async function reviewEdition(
  editionBody: string,
  reviewedAt: string
): Promise<BoardResult> {
  const client = anthropic();
  const board = await loadEditorialBoard();
  let usage: Usage = { input_tokens: 0, output_tokens: 0 };

  const verdicts: BoardVerdict[] = [];

  for (const member of board) {
    const system = [
      `You are "${member.name}", a member of a newsroom's editorial board.`,
      `Your contribution type is "${member.contribution}" and your challenge`,
      `strength is "${member.challengeStrength}".`,
      member.expectedValue ? `Your role: ${member.expectedValue}` : "",
      member.systematicallyQuestions.length
        ? `You systematically ask: ${member.systematicallyQuestions.join("; ")}`
        : "",
      "",
      "Review the DRAFT edition below from your perspective only. Judge whether",
      "it is fit to publish: are the stories significant, accurately framed, and",
      "free of unmitigated risk? Stay in your lane — defer outside it.",
      "",
      "Reply with ONLY a JSON object (no prose, no fences):",
      `{ "verdict": "publish"|"hold"|"revise", "rationale": string, "flags": string[] }`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: editionBody }],
    });
    usage = addUsage(usage, response.usage);

    verdicts.push(parseVerdict(member.name, member.contribution, response));
  }

  return {
    review: {
      reviewed_at: reviewedAt,
      verdicts,
      consensus: consensusOf(verdicts),
    },
    usage,
  };
}

function parseVerdict(
  persona: string,
  contribution: string,
  response: { content: { type: string }[] }
): BoardVerdict {
  const text = (response.content as { type: string; text?: string }[])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n");

  const fallback: BoardVerdict = {
    persona,
    contribution,
    verdict: "hold",
    rationale: "Could not parse this member's verdict.",
    flags: [],
  };

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return fallback;

  try {
    const o = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const verdict = VERDICTS.includes(o.verdict as (typeof VERDICTS)[number])
      ? (o.verdict as BoardVerdict["verdict"])
      : "hold";
    return {
      persona,
      contribution,
      verdict,
      rationale: typeof o.rationale === "string" ? o.rationale : "",
      flags: Array.isArray(o.flags) ? (o.flags as unknown[]).map(String) : [],
    };
  } catch {
    return fallback;
  }
}

/** Conservative consensus: any "hold" holds; else any "revise" revises. */
function consensusOf(verdicts: BoardVerdict[]): BoardReview["consensus"] {
  if (verdicts.some((v) => v.verdict === "hold")) return "hold";
  if (verdicts.some((v) => v.verdict === "revise")) return "revise";
  return "publish";
}
