"use client";

import { useState } from "react";
import type { BoardBrief, PersonaProfile, PersonaResponse } from "@/lib/types";
import { ROLE_BADGE_COLORS, DEFAULT_BADGE_COLOR } from "@/lib/constants";

const CONFIDENCE_COLORS = {
  high: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  moderate: "text-board-accent bg-board-accent/10 border-board-accent/20",
  low: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const STRENGTH_LABELS = {
  strong: "Strong consensus",
  moderate: "Moderate consensus",
  weak: "Weak consensus",
};

interface BoardBriefDisplayProps {
  brief: BoardBrief | null;
  responses: PersonaResponse[];
  profiles: PersonaProfile[];
  briefLoading?: boolean;
  onBack?: () => void;
  onImprove?: () => void;
  improving?: boolean;
}

export function BoardBriefDisplay({
  brief,
  responses,
  profiles,
  briefLoading,
  onBack,
  onImprove,
  improving,
}: BoardBriefDisplayProps) {
  const [expandedAdvisor, setExpandedAdvisor] = useState<string | null>(null);

  function toggleAdvisor(personaId: string) {
    setExpandedAdvisor((prev) => (prev === personaId ? null : personaId));
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-board-text-tertiary font-sans">
            Synthesis
          </p>
          <h2 className="text-2xl font-serif text-board-text mt-1">
            Board Brief
          </h2>
          <p className="text-xs text-board-text-tertiary mt-1 font-sans">
            Synthesised from {responses.length} perspectives
          </p>
        </div>
        {onImprove && (
          <button
            onClick={onImprove}
            disabled={improving || briefLoading || !brief}
            className="shrink-0 rounded-lg border border-board-border bg-board-surface px-3 py-1.5 text-xs font-medium text-board-text-secondary transition-colors hover:border-board-accent/40 hover:text-board-text disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {improving ? "Improving…" : "Improve ✦"}
          </button>
        )}
      </div>

      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="text-sm text-board-text-secondary hover:text-board-text transition-colors"
        >
          <span aria-hidden="true">&larr;</span> Back to advisors
        </button>
      )}

      {/* Loading state */}
      {(briefLoading || !brief) && (
        <div aria-live="polite" className="rounded-[16px] border border-board-accent/20 bg-board-surface px-6 py-8 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-board-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-board-accent animate-pulse" />
            {briefLoading
              ? "Regenerating brief with challenge context..."
              : "Generating Board Brief..."}
          </div>
        </div>
      )}

      {!briefLoading && brief && (
        <>
          {/* Consensus */}
          <section className="rounded-[16px] border border-board-border bg-board-surface px-6 py-7">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-sm font-medium text-board-text">
                Consensus
              </h3>
              <span className="rounded-full border px-2.5 py-0.5 text-[10px] font-medium bg-board-bg border-board-border text-board-text-tertiary">
                {STRENGTH_LABELS[brief.consensus.strength]}
              </span>
            </div>
            <ul className="space-y-2">
              {brief.consensus.areas.map((area, i) => (
                <li
                  key={i}
                  className="text-sm text-board-text-secondary pl-3 border-l-2 border-board-accent/40"
                >
                  {area}
                </li>
              ))}
            </ul>
          </section>

          {/* Tensions */}
          {brief.tensions.length > 0 && (
            <section className="rounded-[16px] border border-board-border bg-board-surface px-6 py-7">
              <h3 className="text-sm font-medium text-board-text mb-4">
                Tensions
              </h3>
              <div className="space-y-4">
                {brief.tensions.map((tension, i) => (
                  <div
                    key={i}
                    className="rounded-[12px] border border-board-border bg-board-bg p-4"
                  >
                    <div className="text-xs font-medium text-board-accent mb-1.5">
                      {tension.between[0]} vs {tension.between[1]}
                    </div>
                    <p className="text-sm text-board-text-secondary">
                      {tension.issue}
                    </p>
                    <p className="text-xs text-board-text-tertiary mt-1.5 italic">
                      {tension.implication}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Blind Spots */}
          {brief.blindSpots.length > 0 && (
            <section className="rounded-[16px] border border-board-border bg-board-surface px-6 py-7">
              <h3 className="text-sm font-medium text-board-text mb-4">
                Blind Spots
              </h3>
              <ul className="space-y-2">
                {brief.blindSpots.map((spot, i) => (
                  <li
                    key={i}
                    className="text-sm text-board-text-secondary pl-3 border-l-2 border-rose-500/40"
                  >
                    {spot}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Recommendation */}
          <section className="rounded-[16px] border border-board-accent/20 bg-board-surface px-6 py-7">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-medium text-board-text">
                Recommendation
              </h3>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${CONFIDENCE_COLORS[brief.recommendation.confidence]}`}
              >
                {brief.recommendation.confidence} confidence
              </span>
            </div>
            <p className="text-sm text-board-text-secondary leading-relaxed">
              {brief.recommendation.summary}
            </p>
            {brief.recommendation.conditions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-board-border">
                <p className="text-xs text-board-text-tertiary mb-2">
                  This recommendation holds when:
                </p>
                <ul className="space-y-1.5">
                  {brief.recommendation.conditions.map((condition, i) => (
                    <li
                      key={i}
                      className="text-xs text-board-text-secondary"
                    >
                      &bull; {condition}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Advisor Responses — accordion review */}
          {responses.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-widest text-board-text-tertiary mb-4 font-sans">
                Advisor Responses
              </h3>
              <div className="space-y-2">
                {responses.map((response) => {
                  const profile = profiles.find(
                    (p) => p.id === response.personaId
                  );
                  const isExpanded = expandedAdvisor === response.personaId;
                  const challengeCount = response.challenges?.length ?? 0;
                  const badgeColor =
                    ROLE_BADGE_COLORS[profile?.contributionType ?? ""] ??
                    DEFAULT_BADGE_COLOR;

                  return (
                    <div
                      key={response.personaId}
                      className="rounded-[16px] border border-board-border bg-board-surface overflow-hidden"
                    >
                      {/* Accordion header */}
                      <button
                        onClick={() => toggleAdvisor(response.personaId)}
                        aria-expanded={isExpanded}
                        aria-controls={`advisor-panel-${response.personaId}`}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-board-bg/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-board-text">
                            {response.personaName}
                          </span>
                          {profile && (
                            <span
                              className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider ${badgeColor}`}
                            >
                              {profile.contributionType}
                            </span>
                          )}
                          {challengeCount > 0 && (
                            <span className="rounded-full bg-board-accent/10 border border-board-accent/20 px-2 py-0.5 text-[9px] font-medium text-board-accent">
                              {challengeCount}{" "}
                              {challengeCount === 1
                                ? "challenge"
                                : "challenges"}
                            </span>
                          )}
                        </div>
                        <span
                          aria-hidden="true"
                          className={`text-board-text-tertiary text-xs transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        >
                          &#9660;
                        </span>
                      </button>

                      {/* Accordion body */}
                      {isExpanded && (
                        <div
                          id={`advisor-panel-${response.personaId}`}
                          role="region"
                          aria-label={`${response.personaName} response details`}
                          className="px-6 pb-5 border-t border-board-border"
                        >
                          {/* Initial response */}
                          <div className="pt-4">
                            <p className="text-[10px] uppercase tracking-widest text-board-text-tertiary mb-2 font-sans">
                              Initial Response
                            </p>
                            <div className="text-sm leading-relaxed text-board-text-secondary whitespace-pre-wrap">
                              {response.content}
                            </div>
                          </div>

                          {/* Challenge exchanges */}
                          {response.challenges &&
                            response.challenges.length > 0 && (
                              <div className="mt-5 pt-4 border-t border-board-border space-y-3">
                                <p className="text-[10px] uppercase tracking-widest text-board-text-tertiary font-sans">
                                  Follow-up Discussion
                                </p>
                                {response.challenges.map((exchange, i) => (
                                  <div key={i} className="space-y-3">
                                    {/* User challenge */}
                                    <div className="flex justify-end">
                                      <div className="max-w-[80%] rounded-[12px] border border-board-accent/20 bg-board-surface-raised px-4 py-3">
                                        <p className="text-[9px] uppercase tracking-widest text-board-accent mb-1.5 font-sans">
                                          You
                                        </p>
                                        <p className="text-sm text-board-text-secondary whitespace-pre-wrap">
                                          {exchange.challengeText}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Advisor reply */}
                                    <div className="flex justify-start">
                                      <div className="max-w-[80%] rounded-[12px] border border-board-border bg-board-bg px-4 py-3">
                                        <p className="text-[9px] uppercase tracking-widest text-board-text-tertiary mb-1.5 font-sans">
                                          {response.personaName}
                                        </p>
                                        <p className="text-sm text-board-text-secondary whitespace-pre-wrap">
                                          {exchange.replyContent}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
