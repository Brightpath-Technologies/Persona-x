"use client";

import { useState } from "react";
import { useBoardContext } from "@/lib/board-context";
import { ROLE_BADGE_COLORS, DEFAULT_BADGE_COLOR } from "@/lib/constants";
import { RubricChart } from "./rubric-chart";

export function PersonaPage() {
  const {
    responses,
    activePersonaId,
    currentPersonaIndex,
    setCurrentPersonaIndex,
    profiles,
    setStep,
    challengeStatus,
    startChallenge,
  } = useBoardContext();

  const [challengeText, setChallengeText] = useState("");

  const response = responses[currentPersonaIndex];
  if (!response) return null;

  const profile = profiles.find((p) => p.id === response.personaId);
  const isActive = activePersonaId === response.personaId;
  const isStreaming = isActive && !response.isComplete;
  const isLastPersona = currentPersonaIndex === responses.length - 1;
  const allComplete = responses.every((r) => r.isComplete);

  const badgeColor =
    ROLE_BADGE_COLORS[profile?.contributionType ?? ""] ?? DEFAULT_BADGE_COLOR;

  // Challenge input is visible when advisor finished and no challenge streaming
  const showChallengeInput =
    response.isComplete && challengeStatus !== "streaming";

  function handlePrev() {
    if (currentPersonaIndex > 0) {
      setChallengeText("");
      setCurrentPersonaIndex(currentPersonaIndex - 1);
    }
  }

  function handleNext() {
    setChallengeText("");
    if (isLastPersona && allComplete) {
      setStep("board_brief");
    } else if (!isLastPersona) {
      setCurrentPersonaIndex(currentPersonaIndex + 1);
    }
  }

  function handleSubmitChallenge() {
    const text = challengeText.trim();
    if (!text) return;
    setChallengeText("");
    startChallenge(response.personaId, text);
  }

  function handleChallengeKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmitChallenge();
    }
  }

  // "Next" is disabled if the current persona is still streaming,
  // OR a challenge reply is streaming, OR we're on the last persona and not all are complete yet
  const nextDisabled =
    isStreaming ||
    challengeStatus === "streaming" ||
    (isLastPersona && !allComplete);

  const nextLabel = isLastPersona && allComplete ? "View Board Brief" : "Next";

  const liveMessage = challengeStatus === "streaming"
    ? `${response.personaName} is responding to your challenge...`
    : isStreaming
      ? `${response.personaName} is responding...`
      : response.isComplete
        ? `${response.personaName} has finished responding.`
        : "";

  return (
    <div className="animate-fade-in">
      {/* Screen reader status announcements */}
      <div className="sr-only" aria-live="polite">{liveMessage}</div>

      {/* Persona header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-serif text-board-text">
              {response.personaName}
            </h2>
            {profile && (
              <div className="flex items-center gap-3 mt-2">
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${badgeColor}`}
                >
                  {profile.contributionType}
                </span>
                <span className="text-xs text-board-text-tertiary">
                  {profile.role}
                </span>
              </div>
            )}
          </div>
          {isActive && (
            <div className="flex items-center gap-1.5 text-xs text-board-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-board-accent animate-pulse" />
              Speaking
            </div>
          )}
          {!isActive && response.isComplete && (
            <div className="text-xs text-board-text-tertiary">Complete</div>
          )}
        </div>
      </div>

      {/* Response content */}
      <div className="rounded-[16px] border border-board-border bg-board-surface px-6 py-7 mb-6">
        <div
          className={`text-sm leading-relaxed text-board-text-secondary whitespace-pre-wrap ${
            isStreaming ? "streaming-cursor" : ""
          }`}
        >
          {response.content || (
            <span className="text-board-text-tertiary italic">
              Preparing response...
            </span>
          )}
        </div>
      </div>

      {/* Challenge exchanges */}
      {response.challenges.length > 0 && (
        <div className="space-y-3 mb-6">
          {response.challenges.map((exchange, i) => (
            <div key={i} className="space-y-3">
              {/* User's challenge — right-aligned */}
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-[16px] border border-board-accent/20 bg-board-surface-raised px-5 py-4">
                  <p className="text-[10px] uppercase tracking-widest text-board-accent mb-2 font-sans">
                    You
                  </p>
                  <p className="text-sm text-board-text-secondary whitespace-pre-wrap">
                    {exchange.challengeText}
                  </p>
                </div>
              </div>

              {/* Advisor's reply — left-aligned */}
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-[16px] border border-board-border bg-board-surface px-5 py-4">
                  <p className="text-[10px] uppercase tracking-widest text-board-text-tertiary mb-2 font-sans">
                    {response.personaName}
                  </p>
                  <div
                    className={`text-sm text-board-text-secondary whitespace-pre-wrap ${
                      !exchange.isReplyComplete ? "streaming-cursor" : ""
                    }`}
                  >
                    {exchange.replyContent || (
                      <span className="text-board-text-tertiary italic">
                        Thinking...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Challenge input */}
      {showChallengeInput && (
        <div className="rounded-[16px] border border-board-border bg-board-surface px-6 py-5 mb-6">
          <label htmlFor="challenge-input" className="text-xs uppercase tracking-widest text-board-text-tertiary mb-3 block font-sans">
            Challenge this advisor
          </label>
          <textarea
            id="challenge-input"
            value={challengeText}
            onChange={(e) => setChallengeText(e.target.value)}
            onKeyDown={handleChallengeKeyDown}
            placeholder="Ask a follow-up question or push back on their perspective..."
            rows={3}
            maxLength={2000}
            className="w-full resize-none rounded-[12px] border border-board-border bg-board-bg px-4 py-3 text-sm text-board-text placeholder:text-board-text-tertiary/50 focus:outline-none focus:border-board-accent/50 transition-colors"
          />
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={handleNext}
              className="text-xs text-board-text-tertiary hover:text-board-text-secondary transition-colors"
            >
              Skip — nothing to challenge
            </button>
            <button
              onClick={handleSubmitChallenge}
              disabled={!challengeText.trim()}
              className="rounded-[10px] bg-board-accent px-4 py-2 text-xs font-semibold text-board-accent-contrast transition-colors hover:bg-board-accent/90 disabled:opacity-50 disabled:bg-board-surface-raised disabled:text-board-text-secondary disabled:cursor-not-allowed"
            >
              Challenge
            </button>
          </div>
        </div>
      )}

      {/* Rubric chart — always visible when profile available */}
      {profile && (
        <div className="rounded-[16px] border border-board-border bg-board-surface px-6 py-5 mb-8">
          <h3 className="text-xs uppercase tracking-widest text-board-text-tertiary mb-4 font-sans">
            Judgement Profile
          </h3>
          <RubricChart rubric={profile.rubric} />
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentPersonaIndex === 0}
          className="text-sm text-board-text-secondary hover:text-board-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span aria-hidden="true">&larr;</span> Previous
        </button>
        <button
          onClick={handleNext}
          disabled={nextDisabled}
          className="rounded-[12px] bg-board-accent px-6 py-2.5 text-sm font-semibold text-board-accent-contrast transition-colors hover:bg-board-accent/90 disabled:opacity-50 disabled:bg-board-surface-raised disabled:text-board-text-secondary disabled:cursor-not-allowed"
        >
          {nextLabel} <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </div>
  );
}
