import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkApiKey, apiErrorResponse } from "@/lib/api-error";
import { reviewEdition } from "@/lib/editorial-board";
import type { Edition } from "@/lib/types";

export const maxDuration = 300; // the board polls several persona reviews

/** POST /api/editions/:id/review — convene the editorial board on a draft. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { data: edition, error } = await supabase
      .from("editions")
      .select("*")
      .eq("id", id)
      .single<Edition>();
    if (error || !edition) {
      return NextResponse.json({ error: "Edition not found" }, { status: 404 });
    }
    if (!edition.body) {
      return NextResponse.json(
        { error: "Edition has no body to review" },
        { status: 400 }
      );
    }

    const reviewedAt = new Date().toISOString();
    const { review } = await reviewEdition(edition.body, reviewedAt);

    await supabase
      .from("editions")
      .update({ board_review: review, status: "in_review" })
      .eq("id", id);

    return NextResponse.json({ review });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
