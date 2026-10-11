import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/** POST /api/track/view { editionId } — a published edition was read. */
export async function POST(req: Request) {
  try {
    const { editionId } = (await req.json().catch(() => ({}))) as {
      editionId?: string;
    };
    if (!editionId) return new NextResponse(null, { status: 204 });

    const supabase = createServiceClient();
    const { data: edition } = await supabase
      .from("editions")
      .select("newsroom_id, status")
      .eq("id", editionId)
      .maybeSingle<{ newsroom_id: string; status: string }>();

    // Only count views of genuinely published editions.
    if (edition && edition.status === "published") {
      await supabase.from("events").insert({
        newsroom_id: edition.newsroom_id,
        edition_id: editionId,
        type: "view",
      });
    }
  } catch {
    // best-effort
  }
  return new NextResponse(null, { status: 204 });
}
