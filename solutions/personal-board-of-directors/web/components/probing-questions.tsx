"use client";

import { useBoardContext } from "@/lib/board-context";

export function ProbingQuestions() {
  const {
    probingQuestions,
    probingAnswers,
    setProbingAnswer,
    questionsLoading,
    enrichedDecision,
    startSession,
    setStep,
  } = useBoardContext();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("consulting_board");
    startSession(enrichedDecision);
  }

  function handleBack() {
    setStep("decision_input");
  }

  // Loading skeleton
  if (questionsLoading) {
    return (
      <div className="animate-fade-in space-y-4">
        <p className="text-xs uppercase tracking-widest text-board-text-tertiary font-sans">
          Refine Your Decision
        </p>
        <h2 className="text-2xl font-serif text-board-accent">
          Preparing questions...
        </h2>
        <div className="space-y-4 mt-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[16px] border border-board-border bg-board-surface px-6 py-7"
            >
              <div className="h-4 w-3/4 rounded bg-board-surface-raised animate-pulse" />
              <div className="mt-4 h-20 rounded bg-board-surface-raised animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If no questions were generated, auto-proceed
  if (probingQuestions.length === 0 && !questionsLoading) {
    return (
      <div className="animate-fade-in text-center py-12">
        <p className="text-sm text-board-text-secondary">
          No additional questions needed.
        </p>
        <button
          onClick={handleSubmit}
          className="mt-4 rounded-[12px] bg-board-accent px-8 py-3 text-sm font-semibold text-board-accent-contrast transition-colors hover:bg-board-accent/90"
        >
          Convene the Board
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <p className="text-xs uppercase tracking-widest text-board-text-tertiary font-sans">
        Refine Your Decision
      </p>
      <h2 className="text-2xl font-serif text-board-accent mt-1">
        Before the Board convenes...
      </h2>
      <p className="text-sm text-board-text-secondary mt-2 mb-6">
        Answer as many as you like to give your advisors richer context.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {probingQuestions.map((q) => (
          <div
            key={q.id}
            className="rounded-[16px] border border-board-border bg-board-surface px-6 py-5 card-hover"
          >
            <label
              htmlFor={q.id}
              className="block text-sm font-medium text-board-text mb-2"
            >
              {q.question}
            </label>
            {q.hint && (
              <p className="text-xs text-board-text-tertiary mb-3">
                {q.hint}
              </p>
            )}
            <textarea
              id={q.id}
              value={probingAnswers[q.id] ?? ""}
              onChange={(e) => setProbingAnswer(q.id, e.target.value)}
              rows={3}
              className="w-full rounded-[8px] border border-board-border bg-board-bg px-4 py-3 text-sm text-board-text placeholder:text-board-text-tertiary focus:border-board-accent/50 focus:outline-none focus:ring-1 focus:ring-board-accent/30 resize-none"
              placeholder="Optional — skip if not relevant"
            />
          </div>
        ))}

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-board-text-secondary hover:text-board-text transition-colors"
          >
            <span aria-hidden="true">&larr;</span> Edit decision
          </button>
          <button
            type="submit"
            className="rounded-[12px] bg-board-accent px-8 py-3 text-sm font-semibold text-board-accent-contrast transition-colors hover:bg-board-accent/90"
          >
            Convene the Board
          </button>
        </div>
      </form>
    </div>
  );
}
