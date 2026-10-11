"use client";

import { useTeamContext } from "@/lib/team-context";
import {
  TEAM_PERSONA_CATALOGUE,
  estimateCost,
} from "@/lib/team-personas";
import { ROLE_BADGE_COLORS, DEFAULT_BADGE_COLOR } from "@/lib/constants";
import type { PersonaStance } from "@/lib/team-types";

const STANCE_OPTIONS: { value: PersonaStance; label: string }[] = [
  { value: "constructive", label: "Constructive" },
  { value: "balanced", label: "Balanced" },
  { value: "critical", label: "Critical" },
];

const SPECIALISTS = TEAM_PERSONA_CATALOGUE.filter((p) => p.id !== "founder");

export function PersonaSelector() {
  const { selectedPersonaIds, togglePersona, setStep, personaStances, setPersonaStance, startFounderSession } =
    useTeamContext();

  const count = selectedPersonaIds.length;
  const cost = estimateCost(count);
  const canContinue = count >= 2;

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => setStep("project_input")}
        className="mb-4 text-sm text-board-text-tertiary hover:text-board-text-secondary transition-colors"
      >
        ← Edit project brief
      </button>
      <h2 className="text-2xl font-serif text-board-text mb-1">
        Assemble Your Software Team
      </h2>
      <p className="text-sm text-board-text-secondary mb-6">
        Select the specialists whose perspectives you want on your project. Each brings a distinct role-based lens. Minimum 2 required.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {SPECIALISTS.map((persona) => {
          const isSelected = selectedPersonaIds.includes(persona.id);
          const badgeColor =
            ROLE_BADGE_COLORS[persona.contributionType] ?? DEFAULT_BADGE_COLOR;
          const activeStance: PersonaStance = personaStances[persona.id] ?? "constructive";

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

                  {isSelected && (
                    <div
                      className="mt-3 flex rounded-lg border border-board-border overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {STANCE_OPTIONS.map((opt) => {
                        const isActive = activeStance === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setPersonaStance(persona.id, opt.value)}
                            className={[
                              "flex-1 py-1 text-[10px] font-medium transition-colors",
                              isActive
                                ? "bg-board-accent text-board-accent-contrast"
                                : "bg-board-surface text-board-text-secondary hover:bg-board-border",
                            ].join(" ")}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Locked Founder card */}
      <div className="mb-6">
        <div className="rounded-xl border border-board-border bg-board-surface opacity-50 cursor-default px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-board-border bg-board-bg" aria-hidden />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-board-text">Founder</span>
                <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${ROLE_BADGE_COLORS["integrator"] ?? DEFAULT_BADGE_COLOR}`}>
                  integrator
                </span>
                <span className="rounded-full border border-board-border px-1.5 py-0.5 text-[10px] font-medium text-board-text-tertiary">
                  joins later
                </span>
              </div>
              <p className="text-xs text-board-text-secondary leading-snug">
                Joins after the business case is built to chart the path forward.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 -mx-6 bg-board-bg/95 backdrop-blur-sm border-t border-board-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-board-text-secondary">
            {count === 0 ? (
              <span className="text-board-text-tertiary">No team members selected</span>
            ) : (
              <>
                <span className="font-semibold text-board-text">{count}</span>{" "}
                {count === 1 ? "member" : "members"} selected
                {" · "}
                <span className="text-board-text-tertiary">
                  ~${cost.toFixed(2)} estimated
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => startFounderSession()}
            disabled={!canContinue}
            className="rounded-xl bg-board-accent px-5 py-2.5 text-sm font-semibold text-board-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Consult the Team →
          </button>
        </div>
      </div>
    </div>
  );
}
