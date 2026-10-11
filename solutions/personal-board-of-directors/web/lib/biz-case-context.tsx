"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  BizCaseStep,
  ChatMessage,
  InterviewAnswer,
  MessageRole,
  ChallengeEvent,
  GenerateEvent,
  ProposeEvent,
} from "./biz-case-types";
import { INTERVIEW_QUESTIONS } from "./biz-case-questions";
import { TEAM_PERSONA_CATALOGUE } from "./team-personas";

interface BizCaseContextValue {
  step: BizCaseStep;
  selectedPersonaIds: string[];
  togglePersona(id: string): void;
  messages: ChatMessage[];
  currentQuestionIndex: number;
  answers: InterviewAnswer[];
  userInput: string;
  setUserInput(s: string): void;
  isStreaming: boolean;
  narrativeContent: string;
  sessionError: string | null;
  interviewComplete: boolean;
  isImproving: boolean;
  isProposing: boolean;
  startInterview(): void;
  submitAnswer(): void;
  generateCase(): void;
  improveNarrative(): void;
  proposeAnswer(): void;
  restartSession(): void;
}

const BizCaseContext = createContext<BizCaseContextValue | null>(null);

export function useBizCaseContext(): BizCaseContextValue {
  const ctx = useContext(BizCaseContext);
  if (!ctx) throw new Error("useBizCaseContext must be used within BizCaseProvider");
  return ctx;
}

/** Consume an SSE ReadableStream, calling onEvent for each parsed event. */
async function consumeSSE<T>(
  res: Response,
  onEvent: (event: T) => boolean | void
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const match = part.match(/^data: (.+)$/m);
      if (!match) continue;

      let event: T;
      try {
        event = JSON.parse(match[1]) as T;
      } catch {
        continue;
      }

      const stop = onEvent(event);
      if (stop === true) break outer;
    }
  }
}

export function BizCaseProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<BizCaseStep>("persona_pick");
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<InterviewAnswer[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [narrativeContent, setNarrativeContent] = useState("");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isProposing, setIsProposing] = useState(false);

  const togglePersona = useCallback((id: string) => {
    setSelectedPersonaIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }, []);

  const startInterview = useCallback(() => {
    setStep("interview");
    setMessages([
      {
        role: "question" as MessageRole,
        content: INTERVIEW_QUESTIONS[0].prompt,
      },
    ]);
    setCurrentQuestionIndex(0);
  }, []);

  const submitAnswer = useCallback(async () => {
    const input = userInput.trim();
    if (!input || isStreaming) return;

    const qIdx = currentQuestionIndex;
    const question = INTERVIEW_QUESTIONS[qIdx];

    // Push answer message
    setMessages((prev) => [
      ...prev,
      { role: "answer" as MessageRole, content: input },
    ]);

    // Save answer
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = {
        questionIndex: qIdx,
        question: question.prompt,
        answer: input,
      };
      return next;
    });

    // Clear input
    setUserInput("");

    const personaSlug = question.challengePersonaSlug;
    const shouldChallenge =
      personaSlug !== null && selectedPersonaIds.includes(personaSlug);

    if (shouldChallenge && personaSlug) {
      const personaEntry = TEAM_PERSONA_CATALOGUE.find(
        (p) => p.id === personaSlug
      );
      const personaName = personaEntry?.name ?? personaSlug;

      setIsStreaming(true);
      setMessages((prev) => [
        ...prev,
        {
          role: "challenge" as MessageRole,
          content: "",
          personaId: personaSlug,
          personaName,
          isStreaming: true,
        },
      ]);

      let challengeContent = "";

      try {
        // Build priorAnswers from currently saved answers (before this question)
        const priorAnswers = answers
          .filter((a) => a.questionIndex < qIdx)
          .map((a) => ({ question: a.question, answer: a.answer }));

        const res = await fetch("/api/biz-case/challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personaSlug,
            question: question.prompt,
            answer: input,
            priorAnswers,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? `HTTP ${res.status}`
          );
        }

        await consumeSSE<ChallengeEvent>(res, (event) => {
          if (event.type === "challenge_token") {
            challengeContent += event.token;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "challenge" && last.isStreaming) {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + event.token,
                };
              }
              return updated;
            });
          } else if (event.type === "challenge_complete") {
            return true; // stop consuming
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        });

        // Mark challenge message as complete
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "challenge") {
            updated[updated.length - 1] = { ...last, isStreaming: false };
          }
          return updated;
        });

        // Save challenge content into answer
        setAnswers((prev) => {
          const next = [...prev];
          if (next[qIdx]) {
            next[qIdx] = {
              ...next[qIdx],
              challengeContent,
              challengePersonaId: personaSlug,
              challengePersonaName: personaName,
            };
          }
          return next;
        });
      } catch (err) {
        setSessionError(
          err instanceof Error ? err.message : String(err)
        );
        // Mark challenge message as non-streaming on error
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "challenge" && last.isStreaming) {
            updated[updated.length - 1] = { ...last, isStreaming: false };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    }

    // Advance to next question or mark complete
    if (qIdx === 6) {
      setInterviewComplete(true);
    } else {
      setCurrentQuestionIndex(qIdx + 1);
      setMessages((prev) => [
        ...prev,
        {
          role: "question" as MessageRole,
          content: INTERVIEW_QUESTIONS[qIdx + 1].prompt,
        },
      ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, selectedPersonaIds, userInput, answers, isStreaming]);

  const generateCase = useCallback(async () => {
    setStep("generating");
    setNarrativeContent("");
    setSessionError(null);

    try {
      const res = await fetch("/api/biz-case/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answers.map((a) => ({
            question: a.question,
            answer: a.answer,
            challengeContent: a.challengeContent,
            challengePersonaName: a.challengePersonaName,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? `HTTP ${res.status}`
        );
      }

      await consumeSSE<GenerateEvent>(res, (event) => {
        if (event.type === "narrative_token") {
          setNarrativeContent((prev) => prev + event.token);
        } else if (event.type === "narrative_complete") {
          return true; // stop consuming
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      });

      setStep("result");
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : String(err));
    }
  }, [answers]);

  const improveNarrative = useCallback(async () => {
    const current = narrativeContent;
    if (!current) return;
    setIsImproving(true);
    setNarrativeContent("");
    setSessionError(null);

    try {
      const res = await fetch("/api/biz-case/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative: current }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      await consumeSSE<GenerateEvent>(res, (event) => {
        if (event.type === "narrative_token") {
          setNarrativeContent((prev) => prev + event.token);
        } else if (event.type === "narrative_complete") {
          return true;
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      });
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : String(err));
      setNarrativeContent(current);
    } finally {
      setIsImproving(false);
    }
  }, [narrativeContent]);

  const proposeAnswer = useCallback(async () => {
    if (isStreaming || isProposing || interviewComplete) return;

    const qIdx = currentQuestionIndex;
    const question = INTERVIEW_QUESTIONS[qIdx];
    const priorAnswers = answers
      .filter((a) => a.questionIndex < qIdx)
      .map((a) => ({ question: a.question, answer: a.answer }));

    setIsProposing(true);
    setUserInput("");

    try {
      const res = await fetch("/api/biz-case/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.prompt, priorAnswers }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      await consumeSSE<ProposeEvent>(res, (event) => {
        if (event.type === "propose_token") {
          setUserInput((prev) => prev + event.token);
        } else if (event.type === "propose_complete") {
          return true;
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      });
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProposing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, isProposing, interviewComplete, currentQuestionIndex, answers]);

  const restartSession = useCallback(() => {
    setStep("persona_pick");
    setSelectedPersonaIds([]);
    setMessages([]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setUserInput("");
    setIsStreaming(false);
    setNarrativeContent("");
    setSessionError(null);
    setInterviewComplete(false);
    setIsImproving(false);
    setIsProposing(false);
  }, []);

  return (
    <BizCaseContext.Provider
      value={{
        step,
        selectedPersonaIds,
        togglePersona,
        messages,
        currentQuestionIndex,
        answers,
        userInput,
        setUserInput,
        isStreaming,
        narrativeContent,
        sessionError,
        interviewComplete,
        isImproving,
        isProposing,
        startInterview,
        submitAnswer,
        generateCase,
        improveNarrative,
        proposeAnswer,
        restartSession,
      }}
    >
      {children}
    </BizCaseContext.Provider>
  );
}
