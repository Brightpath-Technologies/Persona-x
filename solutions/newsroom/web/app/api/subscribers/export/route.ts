import { createClient } from "@/lib/supabase/server";
import type { Subscriber } from "@/lib/types";

/** GET /api/subscribers/export?n=<newsroomId> — owner CSV of subscribers. */
export async function GET(req: Request) {
  const newsroomId = new URL(req.url).searchParams.get("n");
  if (!newsroomId) return new Response("Missing newsroom", { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  // RLS scopes this to newsrooms the user owns.
  const { data: subs } = await supabase
    .from("subscribers")
    .select("*")
    .eq("newsroom_id", newsroomId)
    .order("created_at", { ascending: true })
    .returns<Subscriber[]>();

  const rows = [
    ["email", "status", "email_enabled", "subscribed_at"],
    ...(subs ?? []).map((s) => [
      s.email,
      s.status,
      String(s.email_enabled),
      s.created_at,
    ]),
  ];
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers.csv"`,
    },
  });
}
