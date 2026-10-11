import nodemailer from "nodemailer";

// Email distribution via Zoho SMTP. Env-gated: if the Zoho credentials aren't
// set, isEmailConfigured() returns false and the send route reports that
// cleanly rather than failing. Sending is always human-triggered per edition —
// the Editor decides to distribute (the human owns the meaning-making decision).
//
// Required env (see SETUP_MANUAL_STEPS.md):
//   ZOHO_SMTP_USER  — the Zoho mailbox the newsletter sends from
//   ZOHO_SMTP_PASS  — an app-specific password (Zoho → Security → App Passwords)
//   EMAIL_FROM      — optional "Name <addr>"; defaults to ZOHO_SMTP_USER
//   ZOHO_SMTP_HOST  — optional; defaults to smtp.zoho.com

export function isEmailConfigured(): boolean {
  return Boolean(process.env.ZOHO_SMTP_USER && process.env.ZOHO_SMTP_PASS);
}

function transport() {
  // Microsoft 365 SMTP client submission: smtp.office365.com on port 587 with
  // STARTTLS. Requires "Authenticated SMTP" enabled on the sending mailbox and
  // an app password (basic auth). The ZOHO_SMTP_* env var names are retained for
  // compatibility, but the values now point at Microsoft 365.
  return nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST || "smtp.office365.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.ZOHO_SMTP_USER,
      pass: process.env.ZOHO_SMTP_PASS,
    },
  });
}

export interface SendResult {
  sent: number;
  failed: number;
  error?: string; // first failure message, surfaced to the editor
}

/** Send a single transactional email (e.g. a confirmation). */
export async function sendOne(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "Email is not configured." };
  }
  const from =
    process.env.EMAIL_FROM || (process.env.ZOHO_SMTP_USER as string);
  try {
    await transport().sendMail({ from, to, subject, html });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: smtpMessage(err) };
  }
}

/** A short, safe description of an SMTP failure for the editor. */
function smtpMessage(err: unknown): string {
  const e = err as { responseCode?: number; message?: string };
  if (e?.responseCode === 535) {
    return "SMTP auth rejected (535) — the mail provider refused the login. Check SMTP AUTH / security-defaults policy.";
  }
  return e?.message?.slice(0, 200) || "SMTP send failed.";
}

export interface Recipient {
  email: string;
  token: string; // per-subscriber handle for manage + tracking
}

export interface SendOptions {
  editionId: string;
  siteUrl: string;
}

/** Rewrite body links through the click-tracking redirect (per recipient). */
function trackLinks(
  html: string,
  editionId: string,
  token: string,
  siteUrl: string
): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_m, url: string) => {
    const tracked = `${siteUrl}/api/track/click?e=${editionId}&s=${token}&u=${encodeURIComponent(
      url
    )}`;
    return `href="${tracked}"`;
  });
}

/**
 * Send one HTML email per recipient, with a per-recipient manage link, click
 * tracking on body links, and an open-tracking pixel.
 */
export async function sendToSubscribers(
  recipients: Recipient[],
  subject: string,
  htmlBody: string,
  opts: SendOptions
): Promise<SendResult> {
  if (!isEmailConfigured()) return { sent: 0, failed: recipients.length };
  const from =
    process.env.EMAIL_FROM || (process.env.ZOHO_SMTP_USER as string);
  const tx = transport();

  let sent = 0;
  let failed = 0;
  let error: string | undefined;
  for (const r of recipients) {
    const body = trackLinks(htmlBody, opts.editionId, r.token, opts.siteUrl);
    const manageUrl = `${opts.siteUrl}/manage/${r.token}`;
    const pixel = `<img src="${opts.siteUrl}/api/track/open?e=${opts.editionId}&s=${r.token}" width="1" height="1" alt="" style="display:none">`;
    const html = `${body}<hr style="margin:32px 0;border:none;border-top:1px solid #ddd"/><p style="font:12px sans-serif;color:#888">You're receiving this because you subscribed. <a href="${manageUrl}">Manage your subscription or unsubscribe</a>.</p>${pixel}`;
    try {
      await tx.sendMail({ from, to: r.email, subject, html });
      sent++;
    } catch (err) {
      console.error(`Email to ${r.email} failed:`, err);
      failed++;
      if (!error) error = smtpMessage(err);
    }
  }
  return { sent, failed, error };
}
