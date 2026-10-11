"use client";

import { useEffect } from "react";
import { BoardProvider, useBoardContext } from "@/lib/board-context";
import { StepIndicator } from "@/components/step-indicator";
import { DecisionInput } from "@/components/decision-input";
import { ProbingQuestions } from "@/components/probing-questions";
import { ConsultingLoading } from "@/components/consulting-loading";
import { PersonaPage } from "@/components/persona-page";
import { BoardBriefDisplay } from "@/components/board-brief";
import type { FlowStep } from "@/lib/types";

const STEP_TITLES: Record<FlowStep, string> = {
  decision_input: "Describe Your Decision",
  probing_questions: "Refine Your Decision",
  consulting_board: "Consulting the Board",
  persona_review: "Review Advisors",
  board_brief: "Board Brief",
};

function BoardFlow() {
  const { step, brief, sessionError, responses, profiles, briefLoading, setStep, setCurrentPersonaIndex, improveBrief } = useBoardContext();

  useEffect(() => {
    document.title = `${STEP_TITLES[step]} | Personal Board of Directors`;
  }, [step]);

  return (
    <div>
      <StepIndicator />

      {sessionError && (
        <div role="alert" className="mb-6 rounded-[12px] border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-600 dark:text-rose-300">
          {sessionError}
        </div>
      )}

      {step === "decision_input" && <DecisionInput />}
      {step === "probing_questions" && <ProbingQuestions />}
      {step === "consulting_board" && <ConsultingLoading />}
      {step === "persona_review" && <PersonaPage />}
      {step === "board_brief" && (
        <BoardBriefDisplay
          brief={brief}
          responses={responses}
          profiles={profiles}
          briefLoading={briefLoading}
          onBack={() => {
            setStep("persona_review");
            setCurrentPersonaIndex(responses.length - 1);
          }}
          onImprove={improveBrief}
          improving={briefLoading}
        />
      )}
    </div>
  );
}

export default function BoardPage() {
  return (
    <BoardProvider>
      <BoardFlow />
    </BoardProvider>
  );
}
