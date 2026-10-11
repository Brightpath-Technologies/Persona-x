import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { runDesk } from "@/lib/desk-engine";
import { assembleEdition, editionTitleFor } from "@/lib/wire-editor";
import { slugify } from "@/lib/slug";
import type { Beat, Filing, Newsroom } from "@/lib/types";

export const maxDuration = 300;

/**
 * Scheduled auto-editions. Vercel Cron hits this on the print cycle (Morning /
 * Afternoon / Final). For every newsroom, every active desk researches its beat
 * and files to the wire; then a DRAFT edition is assembled and left for the
 * Editor-in-Chief to sign off. Nothing is published automatically.
 *
 * Authenticated by the CRON_SECRET header (Vercel sends it as a Bearer token).
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: newsrooms } = await supabase
    .from("newsrooms")
    .select("*")
    .returns<Newsroom[]>();

  const summary: { newsroom: string; filed: number; edition: string }[] = [];

  const nowMs = Date.now();

  for (const room of newsrooms ?? []) {
    // Active, non-archived beats with a cadence set, that are DUE for a re-check.
    const { data: allBeats } = await supabase
      .from("beats")
      .select("*")
      .eq("newsroom_id", room.id)
      .eq("active", true)
      .is("archived_at", null)
      .returns<Beat[]>();

    const dueBeats = (allBeats ?? []).filter((b) => {
      if (!b.cadence_hours || b.cadence_hours <= 0) return false; // manual only
      if (!b.last_run_at) return true; // never run → due now
      const elapsedH = (nowMs - new Date(b.last_run_at).getTime()) / 3_600_000;
      return elapsedH >= b.cadence_hours;
    });

    let filed = 0;
    for (const beat of dueBeats) {
      try {
        const { filings, usage } = await runDesk(beat);
        if (filings.length > 0) {
          const rows = filings.map((f) => ({
            newsroom_id: room.id,
            beat_id: beat.id,
            beat_name: beat.name,
            headline: f.headline,
            summary: f.summary,
            source: f.source,
            url: f.url,
            official: f.official,
            significance: f.significance,
            published_at: f.published_at,
            verification: f.url ? "unverified" : "flagged",
          }));
          const { data: inserted, error: insertErr } = await supabase
            .from("filings")
            .upsert(rows, {
              onConflict: "newsroom_id,url",
              ignoreDuplicates: true,
            })
            .select("id");
          if (insertErr) {
            console.error(
              `Filing insert failed for ${beat.name} in ${room.name}:`,
              insertErr
            );
          }
          filed += inserted?.length ?? 0;
        }
        await supabase.from("desk_runs").insert({
          newsroom_id: room.id,
          beat_id: beat.id,
          model: beat.model,
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
          filed_count: filings.length,
        });
        await supabase
          .from("beats")
          .update({ last_run_at: new Date(nowMs).toISOString() })
          .eq("id", beat.id);
      } catch (err) {
        console.error(`Desk ${beat.name} failed in ${room.name}:`, err);
      }
    }

    // Only assemble a draft edition when this tick produced fresh filings —
    // avoids creating an empty edition on every cron firing.
    if (filed === 0) {
      summary.push({ newsroom: room.name, filed: 0, edition: "—" });
      continue;
    }

    const { data: wire } = await supabase
      .from("filings")
      .select("*")
      .eq("newsroom_id", room.id)
      .in("status", ["new", "filed"])
      .is("edition_id", null)
      .returns<Filing[]>();

    const items = wire ?? [];
    const title = editionTitleFor();
    const body = assembleEdition(title, items);
    const slug = `${slugify(title)}-${Date.now().toString(36)}`;

    const { data: edition } = await supabase
      .from("editions")
      .insert({ newsroom_id: room.id, title, slug, status: "draft", body })
      .select("id")
      .single();

    if (edition && items.length > 0) {
      await supabase
        .from("filings")
        .update({ status: "filed", edition_id: edition.id })
        .in(
          "id",
          items.map((f) => f.id)
        );
    }

    summary.push({ newsroom: room.name, filed, edition: title });
  }

  return NextResponse.json({ ran: summary.length, summary });
}
