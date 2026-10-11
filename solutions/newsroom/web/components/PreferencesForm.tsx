"use client";

import { useState } from "react";

interface Props {
  token: string;
  initialStatus: "active" | "unsubscribed";
  initialEmail: boolean;
  rssUrl: string;
}

/** Subscriber self-service preferences (token-based, signed-out). */
export default function PreferencesForm({
  token,
  initialStatus,
  initialEmail,
  rssUrl,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [emailOn, setEmailOn] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function act(action: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data?.error ?? "Something went wrong.");
      return;
    }
    if (typeof data.status === "string") setStatus(data.status);
    if (typeof data.email_enabled === "boolean") setEmailOn(data.email_enabled);
    setMsg("Saved.");
  }

  const subscribed = status === "active";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-lg border border-line bg-white p-4">
        <div>
          <div className="font-medium text-paper-50">Email editions</div>
          <div className="text-xs text-grey">
            New editions delivered to your inbox.
          </div>
        </div>
        <button
          disabled={busy || !subscribed}
          onClick={() => act(emailOn ? "email_off" : "email_on")}
          className={`rounded-full border px-3 py-1 text-xs ${
            emailOn && subscribed
              ? "border-navy bg-navy/10 text-navy"
              : "border-line text-grey"
          } disabled:opacity-50`}
        >
          {emailOn && subscribed ? "On" : "Off"}
        </button>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-line bg-white p-4">
        <div>
          <div className="font-medium text-paper-50">RSS feed</div>
          <div className="text-xs text-grey">
            Follow in any reader — no email needed.
          </div>
        </div>
        <a
          href={rssUrl}
          className="rounded-full border border-line px-3 py-1 text-xs text-navy hover:bg-paper-100"
        >
          Copy / open
        </a>
      </div>

      <div className="rounded-lg border border-line bg-paper-100/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-paper-50">Subscription</div>
            <div className="text-xs text-grey">
              {subscribed
                ? "You're subscribed."
                : "You're unsubscribed — you won't receive editions."}
            </div>
          </div>
          <button
            disabled={busy}
            onClick={() => act(subscribed ? "unsubscribe" : "resubscribe")}
            className="rounded-md border border-line px-3 py-1.5 text-xs text-grey hover:text-navy disabled:opacity-50"
          >
            {subscribed ? "Unsubscribe" : "Re-subscribe"}
          </button>
        </div>
      </div>

      {msg && <p className="text-xs text-grey">{msg}</p>}
    </div>
  );
}
