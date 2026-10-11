"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Publishing requires the Editor to state, in their own words, why the edition
 * is fit to publish — the Vaughn Tan rule made structural. The rationale is
 * recorded and shown as provenance.
 */
export default function PublishPanel({
  editionId,
  unverified = 0,
  flagged = 0,
}: {
  editionId: string;
  unverified?: number;
  flagged?: number;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    if (!note.trim()) {
      setError("State why this edition is fit to publish.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/editions/${editionId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editorNote: note.trim() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data?.error ?? "Could not publish.");
    else router.refresh();
  }

  const needsAttention = unverified + flagged;

  return (
    <div className="space-y-2">
      {needsAttention > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[11px] text-amber-300">
          {unverified > 0 && `${unverified} unverified`}
          {unverified > 0 && flagged > 0 && " · "}
          {flagged > 0 && `${flagged} flagged`} stor
          {needsAttention === 1 ? "y" : "ies"}. Verify them, or note in your
          rationale why you&apos;re publishing anyway.
        </div>
      )}
      <label className="block text-xs text-paper-300">
        Sign-off rationale{" "}
        <span className="text-paper-500">— required before publishing</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Why is this fit to publish? What did you verify? What AI judgement, if any, are you explicitly accepting?"
          className="mt-1 w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
        />
      </label>
      <button
        onClick={publish}
        disabled={busy}
        className="w-full rounded-md border border-brass-600 bg-brass-600/10 px-3 py-2 text-sm font-medium text-brass-400 hover:bg-brass-600/20 disabled:opacity-50"
      >
        {busy ? "Publishing…" : "Sign off & publish"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
