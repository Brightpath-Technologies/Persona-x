"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  endpoint: string;
  body?: Record<string, unknown>;
  idle: string;
  busy: string;
  className?: string;
  /**
   * Optional success-toast template. Must be a plain string (Server Components
   * cannot pass functions to this Client Component). Use {key} placeholders that
   * are filled from the JSON response, e.g. "Filed {filed} of {found}.".
   */
  doneTemplate?: string;
}

function formatTemplate(tpl: string, data: unknown): string {
  return tpl.replace(/\{([\w.]+)\}/g, (_, path: string) => {
    let cur: unknown = data;
    for (const key of path.split(".")) {
      if (
        cur &&
        typeof cur === "object" &&
        key in (cur as Record<string, unknown>)
      ) {
        cur = (cur as Record<string, unknown>)[key];
      } else {
        cur = undefined;
        break;
      }
    }
    return cur === undefined || cur === null ? "" : String(cur);
  });
}

/**
 * A button that POSTs to one of the long-running engine routes (run desk, run
 * edition, review, publish), shows progress, then refreshes the page data.
 */
export default function RunButton({
  endpoint,
  body,
  idle,
  busy,
  className,
  doneTemplate,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setState("busy");
    setMsg(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error ?? "Something went wrong.");
      } else if (doneTemplate) {
        setMsg(formatTemplate(doneTemplate, data));
      }
      router.refresh();
    } catch {
      setMsg("Network error.");
    } finally {
      setState("idle");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={go}
        disabled={state === "busy"}
        className={
          className ??
          "rounded-sm bg-navy px-3.5 py-1.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-navy-soft disabled:opacity-50"
        }
      >
        {state === "busy" ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-current" />
            {busy}
          </span>
        ) : (
          idle
        )}
      </button>
      {msg && <span className="text-xs text-paper-300">{msg}</span>}
    </span>
  );
}
