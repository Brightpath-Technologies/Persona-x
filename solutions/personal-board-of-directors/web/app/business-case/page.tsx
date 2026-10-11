"use client";

import { BizCaseProvider, useBizCaseContext } from "@/lib/biz-case-context";
import { PersonaPicker } from "@/components/biz-case/persona-picker";
import { Interview } from "@/components/biz-case/interview";
import { BizCaseResult } from "@/components/biz-case/result";

function GeneratingLoading({ narrativeContent }: { narrativeContent: string }) {
  return (
    <div className="animate-fade-in py-16 flex flex-col items-center gap-6">
      <div className="relative">
        <div className="h-3 w-3 rounded-full bg-board-accent animate-pulse" />
        <div className="absolute inset-0 h-3 w-3 rounded-full bg-board-accent animate-ping opacity-30" />
      </div>
      <h2 className="text-2xl font-serif text-board-text">
        Drafting your business case…
      </h2>
      {narrativeContent && (
        <div className="w-full max-w-2xl rounded-xl border border-board-border bg-board-surface px-5 py-4 text-sm text-board-text-secondary whitespace-pre-wrap opacity-70">
          {narrativeContent}
        </div>
      )}
    </div>
  );
}

function BizCaseFlow() {
  const { step, sessionError, restartSession, narrativeContent } =
    useBizCaseContext();

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

  if (step === "persona_pick") return <PersonaPicker />;
  if (step === "interview") return <Interview />;
  if (step === "generating")
    return <GeneratingLoading narrativeContent={narrativeContent} />;
  if (step === "result") return <BizCaseResult />;
  return null;
}

export default function BusinessCasePage() {
  return (
    <BizCaseProvider>
      <div className="animate-fade-in">
        <BizCaseFlow />
      </div>
    </BizCaseProvider>
  );
}
