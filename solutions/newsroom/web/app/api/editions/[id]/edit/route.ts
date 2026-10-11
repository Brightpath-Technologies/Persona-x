import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import type { Edition } from "@/lib/types";

/**
 * POST /api/editions/:id/edit { title, body } — sub-edit the edition: rewrite
 * headlines, cut/reorder stories, add a lead. Drafts only; a published edition
 * is locked (use corrections instead) so the printed record can't be silently
 * rewritten.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, body } = (await req.json().catch(() => ({}))) as {
      title?: string;
      body?: string;
    };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // Ownership + lock check (RLS-scoped fetch).
    const { data: edition } = await supabase
      .from("editions")
      .select("id, status")
      .eq("id", id)
      .maybeSingle<Pick<Edition, "id" | "status">>();
    if (!edition) {
      return NextResponse.json({ error: "Edition not found" }, { status: 404 });
    }
    if (edition.status === "published") {
      return NextResponse.json(
        { error: "Published editions can't be edited — issue a correction." },
        { status: 400 }
      );
    }

    const patch: Record<string, unknown> = {};
    if (typeof title === "string" && title.trim()) patch.title = title.trim();
    if (typeof body === "string") patch.body = body;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
    }

    const { error } = await supabase
      .from("editions")
      .update(patch)
      .eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: "Could not save edits" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
