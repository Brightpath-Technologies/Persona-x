import { createServiceClient } from "@/lib/supabase/server";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function pixel() {
  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}

/** GET /api/track/open?e=<editionId>&s=<subscriberToken> — email open pixel. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const editionId = searchParams.get("e");
    const token = searchParams.get("s");
    if (!editionId) return pixel();

    const supabase = createServiceClient();
    const { data: edition } = await supabase
      .from("editions")
      .select("newsroom_id")
      .eq("id", editionId)
      .maybeSingle<{ newsroom_id: string }>();
    if (!edition) return pixel();

    let subscriberId: string | null = null;
    if (token) {
      const { data: sub } = await supabase
        .from("subscribers")
        .select("id")
        .eq("token", token)
        .maybeSingle<{ id: string }>();
      subscriberId = sub?.id ?? null;
    }

    await supabase.from("events").insert({
      newsroom_id: edition.newsroom_id,
      edition_id: editionId,
      subscriber_id: subscriberId,
      type: "open",
    });
  } catch {
    // never break email rendering on a tracking error
  }
  return pixel();
}
