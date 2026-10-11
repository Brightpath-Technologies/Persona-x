"use client";

import { useBizCaseContext } from "@/lib/biz-case-context";
import { ExportDropdown } from "@/components/export-dropdown";
import { downloadBizCaseMarkdown, downloadBizCaseText, printBizCase } from "@/lib/export";

export function BizCaseResult() {
  const { narrativeContent, answers, restartSession, improveNarrative, isImproving } = useBizCaseContext();

  const exportData = { answers, narrativeContent };

  function handleCopy() {
    void navigator.clipboard.writeText(narrativeContent);
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-serif text-board-text">
          Your Business Case
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => improveNarrative()}
            disabled={isImproving}
            className="rounded-lg border border-board-border bg-board-surface px-3 py-1.5 text-xs font-medium text-board-text-secondary transition-colors hover:border-board-accent/40 hover:text-board-text disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImproving ? "Improving…" : "Improve ✦"}
          </button>
          <ExportDropdown
            disabled={isImproving}
            options={[
              { label: "Print / Save as PDF", onClick: () => printBizCase(exportData) },
              { label: "Download .md", onClick: () => downloadBizCaseMarkdown(exportData) },
              { label: "Download .txt", onClick: () => downloadBizCaseText(exportData) },
              { label: "Copy narrative", onClick: handleCopy },
            ]}
          />
          <button
            onClick={restartSession}
            className="rounded-lg border border-board-border bg-board-surface px-3 py-1.5 text-xs font-medium text-board-text-secondary transition-colors hover:border-board-accent/40 hover:text-board-text"
          >
            Start Over
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-board-border bg-board-surface px-6 py-6">
        <div className="whitespace-pre-wrap font-sans text-sm text-board-text leading-relaxed">
          {narrativeContent}
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={restartSession}
          className="text-xs text-board-text-tertiary hover:text-board-text-secondary transition-colors"
        >
          ← Build another business case
        </button>
      </div>
    </div>
  );
}
