"use client";

import { useTeamContext } from "@/lib/team-context";
import { TEAM_PERSONA_CATALOGUE } from "@/lib/team-personas";
import { ROLE_BADGE_COLORS, DEFAULT_BADGE_COLOR } from "@/lib/constants";
import { ExportDropdown } from "@/components/export-dropdown";
import {
  downloadResponseMarkdown,
  downloadResponseText,
  printResponse,
} from "@/lib/export";

export function TeamReview() {
  const {
    responses,
    activePersonaId,
    currentMemberIndex,
    setCurrentMemberIndex,
    setStep,
    teamBrief,
    personaStances,
  } = useTeamContext();

  const response = responses[currentMemberIndex];
  if (!response) return null;

  const catalogue = TEAM_PERSONA_CATALOGUE.find((p) => p.id === response.personaId);
  const isActive = activePersonaId === response.personaId;
  const isStreaming = isActive && !response.isComplete;
  const isLast = currentMemberIndex === responses.length - 1;
  const allComplete = responses.every((r) => r.isComplete);

  const badgeColor =
    ROLE_BADGE_COLORS[catalogue?.contributionType ?? ""] ?? DEFAULT_BADGE_COLOR;

  const stance = personaStances[response.personaId] ?? "constructive";
  const exportData = {
    personaName: response.personaName,
    contributionType: catalogue?.contributionType ?? "",
    tagline: catalogue?.tagline ?? "",
    stance,
    content: response.content,
  };

  const nextDisabled = isStreaming || (isLast && !allComplete);
  const nextLabel = isLast && allComplete ? "View Team Brief" : "Next";

  function handleNext() {
    if (isLast && allComplete) {
      setStep("team_brief");
    } else if (!isLast) {
      setCurrentMemberIndex(currentMemberIndex + 1);
    }
  }

  const liveMessage = isStreaming
    ? `${response.personaName} is responding…`
    : response.isComplete
    ? `${response.personaName} has finished responding.`
    : "";

  return (
    <div className="animate-fade-in">
      <div className="sr-only" aria-live="polite">{liveMessage}</div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-serif text-board-text">
              {response.personaName}
            </h2>
            {catalogue && (
              <div className="flex items-center gap-3 mt-2">
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${badgeColor}`}
                >
                  {catalogue.contributionType}
                </span>
                <span className="text-xs text-board-text-tertiary">
                  {catalogue.tagline}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isActive && (
              <div className="flex items-center gap-1.5 text-xs text-board-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-board-accent animate-pulse" />
                Speaking
              </div>
            )}
            {!isActive && response.isComplete && (
              <ExportDropdown
                disabled={!response.isComplete}
                options={[
                  { label: "Print / Save as PDF", onClick: () => printResponse(exportData) },
                  { label: "Download .md", onClick: () => downloadResponseMarkdown(exportData) },
                  { label: "Download .txt", onClick: () => downloadResponseText(exportData) },
                ]}
              />
            )}
          </div>
        </div>
      </div>

      {/* Response */}
      <div className="rounded-[16px] border border-board-border bg-board-surface px-6 py-7 mb-8">
        <div
          className={`text-sm leading-relaxed text-board-text-secondary whitespace-pre-wrap ${
            isStreaming ? "streaming-cursor" : ""
          }`}
        >
          {response.content || (
            <span className="text-board-text-tertiary italic">
              Preparing response…
            </span>
          )}
        </div>
      </div>

      {/* Team member navigation dots */}
      {responses.length > 1 && (
        <div className="flex justify-center gap-2 mb-6">
          {responses.map((r, i) => (
            <button
              key={r.personaId}
              onClick={() => setCurrentMemberIndex(i)}
              aria-label={`View ${r.personaName}`}
              aria-current={i === currentMemberIndex ? "true" : undefined}
              className={[
                "h-1.5 rounded-full transition-all duration-200",
                i === currentMemberIndex
                  ? "w-6 bg-board-accent"
                  : r.isComplete
                  ? "w-1.5 bg-board-accent/40"
                  : "w-1.5 bg-board-border",
              ].join(" ")}
            />
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMemberIndex(currentMemberIndex - 1)}
          disabled={currentMemberIndex === 0}
          className="text-sm text-board-text-secondary hover:text-board-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span aria-hidden="true">&larr;</span> Previous
        </button>
        <button
          onClick={handleNext}
          disabled={nextDisabled}
          className="rounded-[12px] bg-board-accent px-6 py-2.5 text-sm font-semibold text-board-accent-contrast transition-colors hover:bg-board-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {nextLabel} <span aria-hidden="true">&rarr;</span>
        </button>
      </div>

      {/* Brief available early hint */}
      {teamBrief && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setStep("team_brief")}
            className="text-xs text-board-accent underline hover:opacity-80 transition-opacity"
          >
            Skip to Team Brief
          </button>
        </div>
      )}
    </div>
  );
}
