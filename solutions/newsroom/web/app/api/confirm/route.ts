import { createServiceClient } from "@/lib/supabase/server";

/** GET /api/confirm?token=… — completes double opt-in for a subscriber. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const page = (msg: string) =>
    new Response(
      `<!doctype html><html><body style="font-family:system-ui;max-width:520px;margin:80px auto;text-align:center;color:#333"><h2>The Newsroom</h2><p>${msg}</p></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );

  if (!token) return page("Invalid confirmation link.");

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subscribers")
    .update({ confirmed_at: new Date().toISOString(), status: "active" })
    .eq("token", token)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return page("This confirmation link is invalid or has expired.");
  }
  return page(
    "You're confirmed — thank you. New editions will arrive in your inbox. You can change your preferences anytime from the link in any email."
  );
}
