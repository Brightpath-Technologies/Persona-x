import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { isEmailConfigured, sendToSubscribers } from "@/lib/email";
import { renderMarkdown } from "@/components/Markdown";
import type { Edition, Subscriber } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/editions/:id/send — distribute a PUBLISHED edition to active
 * subscribers by email (Zoho SMTP). Human-triggered: the Editor decides to send.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error:
            "Email is not configured. Set ZOHO_SMTP_USER and ZOHO_SMTP_PASS to send.",
        },
        { status: 503 }
      );
    }

    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { data: edition } = await supabase
      .from("editions")
      .select("*")
      .eq("id", id)
      .single<Edition>();
    if (!edition || edition.status !== "published") {
      return NextResponse.json(
        { error: "Only published editions can be sent." },
        { status: 400 }
      );
    }

    const { data: subs } = await supabase
      .from("subscribers")
      .select("*")
      .eq("newsroom_id", edition.newsroom_id)
      .eq("status", "active")
      .eq("email_enabled", true)
      .not("confirmed_at", "is", null) // confirmed (double opt-in) only
      .returns<Subscriber[]>();

    const recipients = (subs ?? []).map((s) => ({
      email: s.email,
      token: s.token,
    }));
    if (recipients.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, subscribers: 0 });
    }

    const html = `<div style="max-width:640px;margin:0 auto;font-family:Georgia,serif">${renderMarkdown(
      edition.body ?? ""
    )}</div>`;
    const result = await sendToSubscribers(recipients, edition.title, html, {
      editionId: edition.id,
      siteUrl: siteUrl(),
    });

    // Surface a real delivery failure instead of a silent "0 sent".
    if (result.sent === 0 && result.failed > 0) {
      return NextResponse.json(
        { error: result.error ?? "Email delivery failed." },
        { status: 502 }
      );
    }

    await supabase
      .from("editions")
      .update({ last_sent_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ ...result, subscribers: recipients.length });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "";
}
