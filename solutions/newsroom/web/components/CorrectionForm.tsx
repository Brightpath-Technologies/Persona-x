"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Append a dated correction to a published edition (own and fix errors). */
export default function CorrectionForm({ editionId }: { editionId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/editions/${editionId}/correct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      setText("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Issue a correction…"
        className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
      />
      <button
        disabled={busy}
        className="rounded border border-ink-600 px-2.5 py-1 text-xs text-paper-200 hover:border-amber-500/60 hover:text-amber-300 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Add correction"}
      </button>
    </form>
  );
}
