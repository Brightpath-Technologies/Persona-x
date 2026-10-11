"use client";

import { useTeamContext } from "@/lib/team-context";
import type { TeamFlowStep } from "@/lib/team-types";

const STEPS: { key: TeamFlowStep; label: string; founderOnly?: boolean }[] = [
  { key: "persona_select", label: "Select Team" },
  { key: "project_input", label: "Describe Project" },
  { key: "consulting_team", label: "Consulting" },
  { key: "founder_gate", label: "Founder Gate", founderOnly: true },
  { key: "team_review", label: "Review" },
  { key: "team_brief", label: "Team Brief" },
];


export function TeamStepIndicator() {
  const { step, currentMemberIndex, responses, selectedPersonaIds } =
    useTeamContext();

  const hasFounder = selectedPersonaIds.includes("founder");

  const visibleSteps = STEPS.filter(
    (s) => !s.founderOnly || hasFounder
  );

  // Recalculate active index within visible steps
  const visibleActiveIndex = visibleSteps.findIndex((s) => s.key === step);

  return (
    <nav aria-label="Progress" className="mb-8">
      <div role="list" className="flex items-center justify-center gap-2 mb-2">
        {visibleSteps.map((s, i) => (
          <div
            key={s.key}
            role="listitem"
            aria-current={i === visibleActiveIndex ? "step" : undefined}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < visibleActiveIndex
                ? "w-1.5 bg-board-accent"
                : i === visibleActiveIndex
                ? "w-6 bg-board-accent"
                : "w-1.5 bg-board-text-tertiary/40"
            }`}
          >
            <span className="sr-only">
              {s.label}
              {i < visibleActiveIndex
                ? " (completed)"
                : i === visibleActiveIndex
                ? " (current)"
                : ""}
            </span>
          </div>
        ))}
      </div>

      {step === "team_review" && responses.length > 0 && (
        <div className="text-center">
          <p className="text-xs text-board-text-tertiary font-sans">
            Team member {currentMemberIndex + 1} of{" "}
            {Math.max(responses.length, selectedPersonaIds.length)}
          </p>
          <div className="mt-1.5 mx-auto max-w-[200px] h-0.5 rounded-full bg-board-border overflow-hidden">
            <div
              className="h-full rounded-full bg-board-accent transition-all duration-300"
              style={{
                width: `${
                  ((currentMemberIndex + 1) /
                    Math.max(selectedPersonaIds.length, 1)) *
                  100
                }%`,
              }}
            />
          </div>
        </div>
      )}
    </nav>
  );
}
