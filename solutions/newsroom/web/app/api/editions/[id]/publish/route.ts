import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * POST /api/editions/:id/publish — the Editor-in-Chief signs off.
 *
 * The Vaughn Tan rule, made structural: a human must state, explicitly, why the
 * edition is fit to publish before it goes live. The judgement is owned and
 * recorded (editor_note) — never delegated to the AI.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { editorNote } = (await req.json().catch(() => ({}))) as {
      editorNote?: string;
    };
    const note = (editorNote ?? "").trim();
    if (!note) {
      return NextResponse.json(
        {
          error:
            "A sign-off rationale is required — state why this edition is fit to publish.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { data: edition, error } = await supabase
      .from("editions")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        signed_off_by: user.id,
        editor_note: note,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !edition) {
      return NextResponse.json(
        { error: "Could not publish edition" },
        { status: 500 }
      );
    }

    return NextResponse.json({ edition });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
