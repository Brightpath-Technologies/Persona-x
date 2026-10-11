import { createServiceClient } from "@/lib/supabase/server";

/** GET /api/unsubscribe?token=… — one-click unsubscribe from a newsletter. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const page = (msg: string) =>
    new Response(
      `<!doctype html><html><body style="font-family:system-ui;max-width:520px;margin:80px auto;text-align:center;color:#333"><h2>The Newsroom</h2><p>${msg}</p></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );

  if (!token) return page("Invalid unsubscribe link.");

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("subscribers")
    .update({ status: "unsubscribed" })
    .eq("token", token);

  if (error) return page("Something went wrong — please try again later.");
  return page("You've been unsubscribed. You won't receive further editions.");
}
