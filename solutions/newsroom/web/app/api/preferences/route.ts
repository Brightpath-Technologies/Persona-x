import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/preferences { token, action } — subscriber self-service.
 * Token-based (service client), so signed-out subscribers can manage their own
 * notifications. action ∈ unsubscribe | resubscribe | email_on | email_off.
 */
export async function POST(req: Request) {
  const { token, action } = (await req.json().catch(() => ({}))) as {
    token?: string;
    action?: string;
  };
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  switch (action) {
    case "unsubscribe":
      patch.status = "unsubscribed";
      break;
    case "resubscribe":
      patch.status = "active";
      break;
    case "email_on":
      patch.email_enabled = true;
      break;
    case "email_off":
      patch.email_enabled = false;
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subscribers")
    .update(patch)
    .eq("token", token)
    .select("status, email_enabled")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not update preferences." },
      { status: 400 }
    );
  }
  return NextResponse.json(data);
}
