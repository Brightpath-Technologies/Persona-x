"use client";

import { useBoardContext } from "@/lib/board-context";

export function DecisionInput() {
  const { decision, setDecision, generateProbingQuestions, setStep } =
    useBoardContext();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = decision.trim();
    if (!trimmed) return;
    setStep("probing_questions");
    generateProbingQuestions(trimmed);
  }

  return (
    <div className="animate-fade-in">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-[16px] border border-board-border bg-board-surface px-6 py-7">
          <h2 id="decision-label" className="text-2xl font-serif text-board-text mb-1">
            What decision are you facing?
          </h2>
          <p id="decision-hint" className="text-sm text-board-text-secondary mb-5">
            Describe the situation, your options, and what matters most to you.
          </p>
          <textarea
            id="decision"
            aria-labelledby="decision-label"
            aria-describedby="decision-hint"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            placeholder="I'm considering whether to leave my current role for a startup opportunity. The startup offers equity but a 30% pay cut, and I have a family to support..."
            rows={6}
            maxLength={5000}
            className="w-full rounded-[8px] border border-board-border bg-board-bg px-4 py-3 text-sm text-board-text placeholder:text-board-text-tertiary focus:border-board-accent/50 focus:outline-none focus:ring-1 focus:ring-board-accent/30 resize-none"
          />
          <div className="mt-1 text-right text-xs text-board-text-tertiary">
            {decision.length}/5000
          </div>
        </div>
        <button
          type="submit"
          disabled={!decision.trim()}
          className="w-full rounded-[12px] bg-board-accent px-6 py-3.5 text-sm font-semibold text-board-accent-contrast transition-colors hover:bg-board-accent/90 disabled:opacity-50 disabled:bg-board-surface-raised disabled:text-board-text-secondary disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
