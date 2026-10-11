import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { safeHttpUrl } from "@/lib/url";

/**
 * GET /api/track/click?e=<editionId>&s=<token>&u=<url> — logs a click then
 * redirects to the original (validated http(s)) URL.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const editionId = searchParams.get("e");
  const token = searchParams.get("s");
  const dest = safeHttpUrl(searchParams.get("u") ?? "");

  const fallback = process.env.NEXT_PUBLIC_SITE_URL || "/";
  if (!dest) return NextResponse.redirect(fallback);

  try {
    if (editionId) {
      const supabase = createServiceClient();
      const { data: edition } = await supabase
        .from("editions")
        .select("newsroom_id")
        .eq("id", editionId)
        .maybeSingle<{ newsroom_id: string }>();
      if (edition) {
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
          type: "click",
          url: dest,
        });
      }
    }
  } catch {
    // redirect regardless of tracking outcome
  }
  return NextResponse.redirect(dest);
}
