import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendOne } from "@/lib/email";
import type { Newsroom } from "@/lib/types";

/**
 * POST /api/subscribe { slug, email } — public, double opt-in.
 * Creates a PENDING subscriber and emails a confirmation link; the subscriber
 * receives editions only after confirming. Idempotent re-subscribe re-sends the
 * confirmation if still pending.
 */
export async function POST(req: Request) {
  const { slug, email } = (await req.json().catch(() => ({}))) as {
    slug?: string;
    email?: string;
  };
  const addr = (email ?? "").trim().toLowerCase();
  if (!slug || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: room } = await supabase
    .from("newsrooms")
    .select("id, name, slug, is_public")
    .eq("slug", slug)
    .single<Pick<Newsroom, "id" | "name" | "slug"> & { is_public: boolean }>();
  if (!room || !room.is_public) {
    return NextResponse.json(
      { error: "This newsroom is not accepting subscribers." },
      { status: 404 }
    );
  }

  // Find or create the subscriber (keep an existing confirmation).
  const { data: existing } = await supabase
    .from("subscribers")
    .select("token, confirmed_at, status")
    .eq("newsroom_id", room.id)
    .eq("email", addr)
    .maybeSingle<{ token: string; confirmed_at: string | null; status: string }>();

  let token = existing?.token;
  if (existing) {
    if (existing.confirmed_at && existing.status === "active") {
      return NextResponse.json({ ok: true, alreadyConfirmed: true });
    }
    // pending or previously unsubscribed → reactivate as pending, re-confirm
    await supabase
      .from("subscribers")
      .update({ status: "active", confirmed_at: null })
      .eq("newsroom_id", room.id)
      .eq("email", addr);
  } else {
    const { data: created } = await supabase
      .from("subscribers")
      .insert({ newsroom_id: room.id, email: addr, status: "active" })
      .select("token")
      .single<{ token: string }>();
    token = created?.token;
  }
  if (!token) {
    return NextResponse.json(
      { error: "Could not subscribe. Please try again." },
      { status: 500 }
    );
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const confirmUrl = `${site}/api/confirm?token=${token}`;
  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#222">
      <h2 style="font-weight:400">Confirm your subscription</h2>
      <p>Please confirm you want to receive editions of <strong>${escapeHtml(
        room.name
      )}</strong>.</p>
      <p><a href="${confirmUrl}" style="display:inline-block;background:#1f3a5f;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Confirm subscription</a></p>
      <p style="font:12px sans-serif;color:#888">If you didn't request this, ignore this email — no subscription is created until you confirm. See our <a href="${site}/privacy">privacy notice</a>.</p>
    </div>`;

  const result = await sendOne(addr, `Confirm your ${room.name} subscription`, html);
  if (!result.ok) {
    // Subscriber stays pending; the editor can resend/confirm from the dashboard.
    return NextResponse.json({
      ok: true,
      confirmationSent: false,
      note: "You're on the list, but we couldn't send the confirmation email right now. We'll be in touch.",
    });
  }
  return NextResponse.json({ ok: true, confirmationSent: true });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
