"use client";

import { useBizCaseContext } from "@/lib/biz-case-context";
import { TEAM_PERSONA_CATALOGUE } from "@/lib/team-personas";
import { ROLE_BADGE_COLORS, DEFAULT_BADGE_COLOR } from "@/lib/constants";
import { PERSONA_CHALLENGE_TOPIC } from "@/lib/biz-case-questions";

export function PersonaPicker() {
  const { selectedPersonaIds, togglePersona, startInterview } =
    useBizCaseContext();

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-serif text-board-text mb-1">
        Choose Your Challengers
      </h2>
      <p className="text-sm text-board-text-secondary mb-6">
        Select team members to push back on your thinking as you build the case.
        Each challenges a specific part of the decision. All are optional — skip
        to run the interview solo.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {TEAM_PERSONA_CATALOGUE.map((persona) => {
          const isSelected = selectedPersonaIds.includes(persona.id);
          const badgeColor =
            ROLE_BADGE_COLORS[persona.contributionType] ?? DEFAULT_BADGE_COLOR;
          const challengeTopic = PERSONA_CHALLENGE_TOPIC[persona.id];

          return (
            <div
              key={persona.id}
              role="button"
              tabIndex={0}
              onClick={() => togglePersona(persona.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  togglePersona(persona.id);
                }
              }}
              aria-pressed={isSelected}
              className={[
                "text-left rounded-xl border px-4 py-4 transition-all cursor-pointer",
                isSelected
                  ? "border-board-accent bg-board-accent/5 shadow-sm"
                  : "border-board-border bg-board-surface hover:border-board-accent/40 hover:bg-board-surface",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    isSelected
                      ? "border-board-accent bg-board-accent"
                      : "border-board-border bg-board-bg",
                  ].join(" ")}
                  aria-hidden
                >
                  {isSelected && (
                    <svg
                      className="h-3 w-3 text-board-accent-contrast"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-board-text">
                      {persona.name}
                    </span>
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${badgeColor}`}
                    >
                      {persona.contributionType}
                    </span>
                  </div>
                  <p className="text-xs text-board-text-secondary leading-snug">
                    {persona.tagline}
                  </p>
                  {challengeTopic && (
                    <p className="mt-1.5 text-[11px] text-board-accent font-medium">
                      Challenges: {challengeTopic}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 -mx-6 bg-board-bg/95 backdrop-blur-sm border-t border-board-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-board-text-secondary">
            {selectedPersonaIds.length === 0 ? (
              <span className="text-board-text-tertiary">
                No challengers selected — solo mode
              </span>
            ) : (
              <>
                <span className="font-semibold text-board-text">
                  {selectedPersonaIds.length}
                </span>{" "}
                {selectedPersonaIds.length === 1 ? "challenger" : "challengers"}{" "}
                selected
              </>
            )}
          </p>
          <button
            onClick={startInterview}
            className="rounded-xl bg-board-accent px-5 py-2.5 text-sm font-semibold text-board-accent-contrast transition-opacity hover:opacity-90 whitespace-nowrap"
          >
            Start Interview →
          </button>
        </div>
      </div>
    </div>
  );
}
