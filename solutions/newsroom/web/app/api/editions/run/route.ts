import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { assembleEdition, editionTitleFor } from "@/lib/wire-editor";
import { slugify } from "@/lib/slug";
import type { Filing } from "@/lib/types";

/** POST { newsroomId } — assemble all un-filed wire stories into a draft edition. */
export async function POST(req: Request) {
  try {
    const { newsroomId } = (await req.json()) as { newsroomId?: string };
    if (!newsroomId) {
      return NextResponse.json(
        { error: "newsroomId is required" },
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

    // Pull everything still on the wire (not yet in an edition, not spiked).
    const { data: filings } = await supabase
      .from("filings")
      .select("*")
      .eq("newsroom_id", newsroomId)
      .in("status", ["new", "filed"])
      .is("edition_id", null)
      .returns<Filing[]>();

    const wire = filings ?? [];
    const title = editionTitleFor();
    const body = assembleEdition(title, wire);
    const slug = `${slugify(title)}-${Date.now().toString(36)}`;

    const { data: edition, error } = await supabase
      .from("editions")
      .insert({
        newsroom_id: newsroomId,
        title,
        slug,
        status: "draft",
        body,
      })
      .select("*")
      .single();
    if (error || !edition) {
      return NextResponse.json(
        { error: "Could not create edition" },
        { status: 500 }
      );
    }

    if (wire.length > 0) {
      await supabase
        .from("filings")
        .update({ status: "filed", edition_id: edition.id })
        .in(
          "id",
          wire.map((f) => f.id)
        );
    }

    return NextResponse.json({ edition, items: wire.length });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
