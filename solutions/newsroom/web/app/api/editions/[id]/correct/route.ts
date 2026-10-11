import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import type { Correction, Edition } from "@/lib/types";

/**
 * POST /api/editions/:id/correct { text } — append a dated correction.
 * Owning and fixing errors after publication (Vaughn Tan: responsibility stays
 * with the human). Corrections are shown on the public article.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { text } = (await req.json().catch(() => ({}))) as { text?: string };
    const correction = (text ?? "").trim();
    if (!correction) {
      return NextResponse.json(
        { error: "Correction text is required" },
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

    const { data: current } = await supabase
      .from("editions")
      .select("corrections")
      .eq("id", id)
      .single<Pick<Edition, "corrections">>();

    const existing = Array.isArray(current?.corrections)
      ? current!.corrections
      : [];
    const next: Correction[] = [
      ...existing,
      { at: new Date().toISOString(), text: correction },
    ];

    const { error } = await supabase
      .from("editions")
      .update({ corrections: next })
      .eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: "Could not save correction" },
        { status: 500 }
      );
    }
    return NextResponse.json({ corrections: next });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
