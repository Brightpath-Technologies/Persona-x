"use client";

import { useEffect, useRef } from "react";
import { useBizCaseContext } from "@/lib/biz-case-context";
import type { ChatMessage } from "@/lib/biz-case-types";

function StreamingCursor() {
  return (
    <span
      className="inline-block w-0.5 h-4 bg-board-text animate-blink ml-0.5 align-middle"
      aria-hidden
    />
  );
}

function QuestionMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-board-text-tertiary">
          Interviewer
        </p>
        <div className="rounded-xl border border-board-border bg-board-surface px-4 py-3 text-sm text-board-text leading-relaxed">
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function AnswerMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        <p className="mb-1 text-right text-[10px] font-medium uppercase tracking-wide text-board-text-tertiary">
          You
        </p>
        <div className="rounded-xl border border-board-accent/20 bg-board-accent/10 px-4 py-3 text-sm text-board-text leading-relaxed">
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function ChallengeMessage({
  msg,
  isLast,
}: {
  msg: ChatMessage;
  isLast: boolean;
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] w-full">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-board-text-tertiary">
            Expert Input
          </span>
          {msg.personaName && (
            <span className="rounded-full bg-board-accent/10 px-2 py-0.5 text-[10px] font-semibold text-board-accent">
              {msg.personaName}
            </span>
          )}
        </div>
        <div className="rounded-xl border-l-2 border-board-accent bg-board-surface-raised px-4 py-3 text-sm text-board-text leading-relaxed">
          {msg.content}
          {msg.isStreaming && isLast && <StreamingCursor />}
        </div>
      </div>
    </div>
  );
}

export function Interview() {
  const {
    messages,
    userInput,
    setUserInput,
    isStreaming,
    isProposing,
    interviewComplete,
    submitAnswer,
    generateCase,
    proposeAnswer,
  } = useBizCaseContext();

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Focus textarea after streaming completes
  useEffect(() => {
    if (!isStreaming && !interviewComplete) {
      textareaRef.current?.focus();
    }
  }, [isStreaming, interviewComplete]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (userInput.trim() && !isStreaming && !isProposing) {
        void submitAnswer();
      }
    }
  }

  const isBusy = isStreaming || isProposing;
  const canSubmit = userInput.trim().length > 0 && !isBusy;

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[500px]">
      {/* Message feed */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1"
      >
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          if (msg.role === "question") {
            return <QuestionMessage key={i} msg={msg} />;
          }
          if (msg.role === "answer") {
            return <AnswerMessage key={i} msg={msg} />;
          }
          if (msg.role === "challenge") {
            return <ChallengeMessage key={i} msg={msg} isLast={isLast} />;
          }
          return null;
        })}
      </div>

      {/* Bottom input panel */}
      <div className="shrink-0 border-t border-board-border pt-4 space-y-3">
        {interviewComplete && !isStreaming && (
          <button
            onClick={() => void generateCase()}
            className="w-full rounded-xl bg-board-accent px-5 py-3 text-sm font-semibold text-board-accent-contrast transition-opacity hover:opacity-90"
          >
            Generate Business Case →
          </button>
        )}

        {!interviewComplete && (
          <>
            <div className="relative">
              <textarea
                ref={textareaRef}
                rows={3}
                maxLength={2000}
                disabled={isStreaming}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isStreaming
                    ? "Waiting for response…"
                    : isProposing
                    ? "Drafting a proposed answer…"
                    : "Your answer… (Cmd+Enter to submit)"
                }
                className="w-full resize-none rounded-xl border border-board-border bg-board-surface px-4 py-3 text-sm text-board-text placeholder:text-board-text-tertiary focus:border-board-accent/50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              />
              {isProposing && userInput && (
                <span className="pointer-events-none absolute bottom-3 right-3">
                  <span className="inline-block w-0.5 h-3.5 bg-board-text-tertiary animate-blink" />
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => void proposeAnswer()}
                disabled={isBusy}
                className="rounded-lg border border-board-border bg-board-surface px-3 py-1.5 text-xs font-medium text-board-text-secondary transition-colors hover:border-board-accent/40 hover:text-board-text disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isProposing ? (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-board-text-tertiary/40 border-t-board-text-secondary animate-spin" />
                    Proposing…
                  </>
                ) : (
                  "Propose Answer ✦"
                )}
              </button>
              <button
                onClick={() => void submitAnswer()}
                disabled={!canSubmit}
                className="rounded-xl bg-board-accent px-5 py-2.5 text-sm font-semibold text-board-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
