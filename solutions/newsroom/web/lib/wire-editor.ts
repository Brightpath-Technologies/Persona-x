import type { Filing, Significance } from "./types";

// The wire editor: pure functions, no model call. Collates filings into a
// ranked running order and assembles a draft edition body. Ported from the
// local newsroom-watch jq editor.

const SIG_RANK: Record<Significance, number> = { low: 1, medium: 2, high: 3 };

/**
 * Order filings the way a wire editor would: official first, then by
 * significance (high → low), with undated items ordered last, newest first
 * within a tier. Pure and deterministic.
 */
export function rankFilings(filings: Filing[]): Filing[] {
  return [...filings].sort((a, b) => {
    if (a.official !== b.official) return a.official ? -1 : 1;
    const aUndated = a.published_at == null;
    const bUndated = b.published_at == null;
    if (aUndated !== bUndated) return aUndated ? 1 : -1;
    const sig = SIG_RANK[b.significance] - SIG_RANK[a.significance];
    if (sig !== 0) return sig;
    return (b.published_at ?? "").localeCompare(a.published_at ?? "");
  });
}

/** Name the edition from the wall clock, like a print cycle. */
export function editionTitleFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Morning Edition";
  if (h < 18) return "Afternoon Edition";
  return "Final Edition";
}

const DRAFT_BANNER =
  "> **DRAFT — for human review.** Assembled by desks; nothing here reaches an " +
  "audience until the Editor-in-Chief reviews, edits, and signs off.";

/** Assemble a draft edition body (markdown), grouped by beat. */
export function assembleEdition(
  title: string,
  filings: Filing[],
  opts: { dateLong?: string } = {}
): string {
  const ranked = rankFilings(filings);
  const dateLong =
    opts.dateLong ??
    new Date().toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const lines: string[] = [
    `# ${title} (Draft)`,
    "",
    DRAFT_BANNER,
    "",
    `**${dateLong}** · ${ranked.length} item(s)`,
    "",
  ];

  if (ranked.length === 0) {
    lines.push("_No significant items this edition._");
    return lines.join("\n");
  }

  // group by beat, preserving the ranked order of each beat's first appearance
  const byBeat = new Map<string, Filing[]>();
  for (const f of ranked) {
    const list = byBeat.get(f.beat_name) ?? [];
    list.push(f);
    byBeat.set(f.beat_name, list);
  }

  for (const [beat, items] of byBeat) {
    lines.push(`## ${beat}`, "");
    for (const f of items) {
      const flag = f.official ? "[Official] " : "";
      lines.push(`### ${flag}${f.headline}`);
      const meta = [
        f.source ? `Source: ${f.source}` : null,
        `Significance: ${f.significance}`,
        `Published: ${f.published_at ?? "undated"}`,
      ]
        .filter(Boolean)
        .join(" · ");
      lines.push(`*${meta}*`, "");
      lines.push(f.summary);
      if (f.url) lines.push("", `[Read the source](${f.url})`);
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd();
}
