"use client";

import { useTeamContext } from "@/lib/team-context";

export function TeamLoading() {
  const {
    responses,
    selectedPersonaIds,
    activePersonaId,
    sessionPhase,
  } = useTeamContext();

  const completedCount = responses.filter((r) => r.isComplete).length;
  const totalCount =
    sessionPhase === "founder" ? 1 : Math.max(selectedPersonaIds.length - 1, 1);

  const heading =
    sessionPhase === "founder"
      ? "Consulting the Founder…"
      : "Convening your team…";

  const activeName = activePersonaId
    ? responses.find((r) => r.personaId === activePersonaId)?.personaName
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-in flex flex-col items-center justify-center py-24"
    >
      <div className="relative mb-6">
        <div className="h-3 w-3 rounded-full bg-board-accent animate-pulse" />
        <div className="absolute inset-0 h-3 w-3 rounded-full bg-board-accent animate-ping opacity-30" />
      </div>

      <h2 className="text-2xl font-serif text-board-text">{heading}</h2>

      {activeName ? (
        <p className="text-sm text-board-text-secondary mt-2">
          {activeName} is reviewing the project
        </p>
      ) : (
        <p className="text-sm text-board-text-tertiary mt-2">
          Preparing responses…
        </p>
      )}

      {totalCount > 0 && (
        <div className="mt-6 w-full max-w-xs">
          <div className="flex justify-between text-xs text-board-text-tertiary mb-1.5">
            <span>{completedCount} of {totalCount} complete</span>
            <span>{Math.round((completedCount / totalCount) * 100)}%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-board-border overflow-hidden">
            <div
              className="h-full rounded-full bg-board-accent transition-all duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
