import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * POST /api/editions/:id/state { action } — defer | cancel | resume.
 * - defer:  hold the edition for later (status → deferred); filings stay attached.
 * - resume: bring a deferred edition back into the queue (status → draft).
 * - cancel: kill the edition (status → cancelled) AND release its filings back
 *   to the wire so the stories aren't lost.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = (await req.json().catch(() => ({}))) as {
      action?: string;
    };
    if (!["defer", "cancel", "resume"].includes(action ?? "")) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // Confirm the edition belongs to a newsroom the caller owns. RLS already
    // scopes every write to the owner, so this is defence in depth — but it also
    // means we 404 honestly instead of reporting success on a no-op write.
    const { data: owned } = await supabase
      .from("editions")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!owned) {
      return NextResponse.json({ error: "Edition not found" }, { status: 404 });
    }

    const status =
      action === "defer" ? "deferred" : action === "cancel" ? "cancelled" : "draft";

    const { error } = await supabase
      .from("editions")
      .update({ status })
      .eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: "Could not update edition" },
        { status: 500 }
      );
    }

    let released = 0;
    if (action === "cancel") {
      // Return this edition's stories to the wire (don't lose them).
      const { data } = await supabase
        .from("filings")
        .update({ status: "new", edition_id: null })
        .eq("edition_id", id)
        .select("id");
      released = data?.length ?? 0;
    }

    return NextResponse.json({ status, released });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
