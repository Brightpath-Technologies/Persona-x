import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkApiKey, apiErrorResponse } from "@/lib/api-error";
import { runDesk } from "@/lib/desk-engine";
import type { Beat } from "@/lib/types";

export const maxDuration = 300; // desks search the live web; allow time

/** POST { beatId } — research a beat and file its stories onto the wire. */
export async function POST(req: Request) {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  try {
    const { beatId } = (await req.json()) as { beatId?: string };
    if (!beatId) {
      return NextResponse.json({ error: "beatId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // RLS ensures the beat belongs to a newsroom the user owns.
    const { data: beat, error: beatErr } = await supabase
      .from("beats")
      .select("*")
      .eq("id", beatId)
      .single<Beat>();
    if (beatErr || !beat) {
      return NextResponse.json({ error: "Beat not found" }, { status: 404 });
    }

    const { filings, usage } = await runDesk(beat);

    // Insert filings, ignoring URL duplicates already on the wire.
    let filed = 0;
    if (filings.length > 0) {
      const rows = filings.map((f) => ({
        newsroom_id: beat.newsroom_id,
        beat_id: beat.id,
        beat_name: beat.name,
        headline: f.headline,
        summary: f.summary,
        source: f.source,
        url: f.url,
        official: f.official,
        significance: f.significance,
        published_at: f.published_at,
        // can't source-check a story with no URL — flag it for the editor
        verification: f.url ? "unverified" : "flagged",
      }));
      const { data: inserted, error: insertErr } = await supabase
        .from("filings")
        .upsert(rows, { onConflict: "newsroom_id,url", ignoreDuplicates: true })
        .select("id");
      if (insertErr) {
        // Surface insert failures instead of silently filing nothing.
        console.error("Filing insert failed:", insertErr);
        return NextResponse.json(
          { error: `Could not file stories: ${insertErr.message}` },
          { status: 500 }
        );
      }
      filed = inserted?.length ?? 0;
    }

    await supabase.from("desk_runs").insert({
      newsroom_id: beat.newsroom_id,
      beat_id: beat.id,
      model: beat.model,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      filed_count: filed,
    });
    await supabase
      .from("beats")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", beat.id);

    return NextResponse.json({
      filed,
      found: filings.length,
      usage,
      model: beat.model,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
