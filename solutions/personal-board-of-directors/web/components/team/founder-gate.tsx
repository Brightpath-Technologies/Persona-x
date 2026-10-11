"use client";

import { useState } from "react";
import { useTeamContext } from "@/lib/team-context";
import type { CompetitiveAdvantageVerdict } from "@/lib/team-types";

const VERDICT_OPTIONS: {
  value: CompetitiveAdvantageVerdict;
  label: string;
  description: string;
  activeClass: string;
}[] = [
  {
    value: "yes",
    label: "Yes — clear competitive advantage",
    description: "The Founder sees a genuine, defensible edge.",
    activeClass:
      "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  {
    value: "unsure",
    label: "Unsure",
    description: "The advantage exists but needs validation.",
    activeClass:
      "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  {
    value: "no",
    label: "No — lacks differentiation",
    description: "The Founder sees no clear moat or unique position.",
    activeClass:
      "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400",
  },
];

export function FounderGate() {
  const {
    founderResponse,
    competitiveAdvantage,
    confirmCompetitiveAdvantage,
    startRemainingSession,
  } = useTeamContext();

  const [selected, setSelected] = useState<CompetitiveAdvantageVerdict>(
    competitiveAdvantage ?? "unsure"
  );

  function handleContinue() {
    confirmCompetitiveAdvantage(selected);
    startRemainingSession();
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-serif text-board-text mb-1">
          Founder's Assessment
        </h2>
        <p className="text-sm text-board-text-secondary">
          Review what the Founder said, then confirm or adjust the competitive
          advantage verdict before the rest of the team weighs in.
        </p>
      </div>

      {/* Founder's response card */}
      {founderResponse && (
        <div className="rounded-xl border border-board-border bg-board-surface px-5 py-4">
          <p className="text-xs font-semibold text-board-text-tertiary uppercase tracking-wide mb-3">
            {founderResponse.personaName}
          </p>
          <p className="text-sm text-board-text leading-relaxed whitespace-pre-wrap">
            {founderResponse.content}
          </p>
        </div>
      )}

      {/* Detected verdict */}
      <div>
        <p className="text-xs font-medium text-board-text-tertiary mb-2">
          Detected verdict — confirm or override:
        </p>
        <div className="space-y-2">
          {VERDICT_OPTIONS.map((opt) => {
            const isActive = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={[
                  "w-full text-left rounded-xl border px-4 py-3 transition-all",
                  isActive
                    ? opt.activeClass
                    : "border-board-border bg-board-surface text-board-text hover:border-board-accent/40",
                ].join(" ")}
              >
                <span className="block text-sm font-semibold">{opt.label}</span>
                <span className="block text-xs mt-0.5 opacity-75">
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleContinue}
        className="w-full rounded-xl bg-board-accent px-6 py-3 text-sm font-semibold text-board-accent-contrast transition-opacity hover:opacity-90"
      >
        Continue with Team →
      </button>
    </div>
  );
}
