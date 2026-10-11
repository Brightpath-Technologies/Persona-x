import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import type { Edition } from "@/lib/types";

/** POST /api/editions/:id/archive — withdraw from public (retained, reversible). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { data: current } = await supabase
      .from("editions")
      .select("archived_at")
      .eq("id", id)
      .single<Pick<Edition, "archived_at">>();

    const archived_at = current?.archived_at ? null : new Date().toISOString();

    const { error } = await supabase
      .from("editions")
      .update({ archived_at })
      .eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: "Could not update edition" },
        { status: 500 }
      );
    }
    return NextResponse.json({ archived: archived_at !== null });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
