"use client";

import { TeamProvider, useTeamContext } from "@/lib/team-context";
import { TeamStepIndicator } from "@/components/team/team-step-indicator";
import { PersonaSelector } from "@/components/team/persona-selector";
import { ProjectInput } from "@/components/team/project-input";
import { TeamLoading } from "@/components/team/team-loading";
import { FounderGate } from "@/components/team/founder-gate";
import { TeamReview } from "@/components/team/team-review";
import { TeamBriefDisplay } from "@/components/team/team-brief-display";

function TeamFlow() {
  const { step, sessionError, restartSession } = useTeamContext();

  if (sessionError) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/20 px-5 py-6 text-center">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
          Session Error
        </p>
        <p className="text-xs text-red-600 dark:text-red-400 mb-4">
          {sessionError}
        </p>
        <button
          onClick={restartSession}
          className="text-xs font-medium text-red-700 dark:text-red-400 underline hover:opacity-80"
        >
          Start Over
        </button>
      </div>
    );
  }

  if (step === "persona_select") {
    return <PersonaSelector />;
  }

  if (step === "project_input") {
    return <ProjectInput />;
  }

  if (step === "consulting_team") {
    return <TeamLoading />;
  }

  if (step === "founder_gate") {
    return (
      <>
        <TeamStepIndicator />
        <FounderGate />
      </>
    );
  }

  if (step === "team_review") {
    return (
      <>
        <TeamStepIndicator />
        <TeamReview />
      </>
    );
  }

  if (step === "team_brief") {
    return (
      <>
        <TeamStepIndicator />
        <TeamBriefDisplay />
      </>
    );
  }

  return null;
}

export default function SoftwareTeamPage() {
  return (
    <TeamProvider>
      <div className="animate-fade-in">
        <TeamFlow />
      </div>
    </TeamProvider>
  );
}
