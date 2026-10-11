"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setState("error");
    } else {
      setState("sent");
    }
  }

  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <Image
        src="/assets/brightpath-animated.gif"
        alt="BrightPath Technology"
        width={1000}
        height={292}
        unoptimized
        priority
        className="mx-auto mb-10 h-auto w-[260px]"
      />
      <h2 className="font-display text-2xl font-light text-paper-50">
        Editor sign-in
      </h2>
      <p className="mt-2 text-sm text-grey">
        We&apos;ll email you a one-time link to the editor&apos;s desk.
      </p>

      {state === "sent" ? (
        <p className="mt-6 rounded-md border border-navy/30 bg-navy/5 p-4 text-sm text-navy">
          Check your inbox — a sign-in link is on its way to{" "}
          <span className="font-medium">{email}</span>.
        </p>
      ) : (
        <form onSubmit={sendLink} className="mt-7 space-y-3 text-left">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-sm border border-line bg-white px-3 py-2.5 text-sm text-paper-50 outline-none focus:border-navy"
          />
          <button
            disabled={state === "sending"}
            className="w-full rounded-sm bg-navy px-3 py-2.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-navy-soft disabled:opacity-50"
          >
            {state === "sending" ? "Sending…" : "Email me a link"}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      )}
    </div>
  );
}
