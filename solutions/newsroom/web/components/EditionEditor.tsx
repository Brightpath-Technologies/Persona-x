"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Markdown from "@/components/Markdown";

interface Props {
  editionId: string;
  title: string;
  body: string;
  canEdit: boolean;
}

/**
 * The edition page. In view mode it renders the assembled markdown. When the
 * editor opens edit mode (drafts only) they can sub-edit the whole page —
 * retitle, rewrite headlines, cut/reorder stories, add a lead — with a live
 * preview, then save.
 */
export default function EditionEditor({
  editionId,
  title,
  body,
  canEdit,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftBody, setDraftBody] = useState(body);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/editions/${editionId}/edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draftTitle, body: draftBody }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data?.error ?? "Could not save.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div>
        {canEdit && (
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => {
                setDraftTitle(title);
                setDraftBody(body);
                setEditing(true);
              }}
              className="rounded-md border border-line px-3 py-1.5 text-xs text-navy hover:bg-paper-100"
            >
              Edit page
            </button>
          </div>
        )}
        {body ? (
          <Markdown source={body} />
        ) : (
          <p className="text-sm text-paper-300">This edition is empty.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-brass-400">
          Editing the page
        </span>
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setPreview((p) => !p)}
            className="rounded border border-line px-2 py-1 text-navy hover:bg-paper-100"
          >
            {preview ? "Write" : "Preview"}
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="rounded border border-brass-600 bg-brass-600/10 px-2 py-1 font-medium text-brass-400 hover:bg-brass-600/20 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={busy}
            className="rounded border border-line px-2 py-1 text-grey hover:text-navy disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>

      <input
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        placeholder="Edition title"
        className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
      />

      {preview ? (
        <div className="min-h-[300px] rounded-md border border-line bg-white p-4">
          <Markdown source={draftBody} />
        </div>
      ) : (
        <textarea
          value={draftBody}
          onChange={(e) => setDraftBody(e.target.value)}
          rows={22}
          spellCheck
          className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-[13px] leading-relaxed"
          placeholder="Markdown — ## for headlines, write a lead at the top, cut or reorder stories…"
        />
      )}

      <p className="text-[11px] text-paper-500">
        Markdown: <code># Lead headline</code>, <code>## Story headline</code>,
        <code>**bold**</code>, <code>[text](https://…)</code>. Reorder or cut by
        editing the text. Published editions are locked — use corrections.
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
