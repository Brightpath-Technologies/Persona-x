"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useBoardSession } from "./use-board-session";
import { useProfileContext } from "./profile-context";
import { buildAdvocateProfile } from "./advocate-calibration";
import type {
  BoardBrief,
  ChallengeExchange,
  FlowStep,
  PersonaProfile,
  PersonaResponse,
  ProbingQuestion,
} from "./types";

type ChallengeStatus = "idle" | "streaming";

interface BoardContextValue {
  // Flow
  step: FlowStep;
  setStep: (step: FlowStep) => void;

  // Decision
  decision: string;
  setDecision: (d: string) => void;
  enrichedDecision: string;

  // Probing questions
  probingQuestions: ProbingQuestion[];
  probingAnswers: Record<string, string>;
  setProbingAnswer: (id: string, value: string) => void;
  questionsLoading: boolean;
  generateProbingQuestions: (decision: string) => Promise<void>;

  // Session (from useBoardSession)
  sessionStatus: ReturnType<typeof useBoardSession>["status"];
  responses: ReturnType<typeof useBoardSession>["responses"];
  activePersonaId: ReturnType<typeof useBoardSession>["activePersonaId"];
  brief: BoardBrief | null;
  sessionError: ReturnType<typeof useBoardSession>["error"];
  startSession: ReturnType<typeof useBoardSession>["startSession"];

  // Persona navigation
  currentPersonaIndex: number;
  setCurrentPersonaIndex: (i: number) => void;

  // Profiles
  profiles: PersonaProfile[];

  // Challenge
  challengeStatus: ChallengeStatus;
  startChallenge: (personaId: string, text: string) => void;
  abortChallenge: () => void;

  // Brief regeneration
  briefStale: boolean;
  briefLoading: boolean;
  improveBrief(): void;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoardContext() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoardContext must be used within BoardProvider");
  return ctx;
}

export function BoardProvider({ children }: { children: ReactNode }) {
  const [step, setStepRaw] = useState<FlowStep>("decision_input");
  const [decision, setDecision] = useState("");
  const [probingQuestions, setProbingQuestions] = useState<ProbingQuestion[]>([]);
  const [probingAnswers, setProbingAnswers] = useState<Record<string, string>>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [currentPersonaIndex, setCurrentPersonaIndex] = useState(0);
  const [profiles, setProfiles] = useState<PersonaProfile[]>([]);

  // User profile (for advocate persona)
  const { profile: userProfile } = useProfileContext();

  // Challenge state
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>("idle");
  const challengeAbortRef = useRef<AbortController | null>(null);
  const challengePersonaRef = useRef<string | null>(null);

  // Brief regeneration state
  const [briefStale, setBriefStale] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [regeneratedBrief, setRegeneratedBrief] = useState<BoardBrief | null>(null);

  const session = useBoardSession();
  const { status, responses, activePersonaId, brief: sessionBrief, error: sessionError, startSession: rawStartSession, updateResponse } = session;

  // Wrap startSession to automatically include user profile for advocate generation
  const startSession = useCallback(
    (decision: string) => rawStartSession(decision, userProfile),
    [rawStartSession, userProfile]
  );

  // Use regenerated brief if available, otherwise use session brief
  const brief = regeneratedBrief ?? sessionBrief;

  // Track the previous response count so we can auto-advance
  const prevResponseCountRef = useRef(0);
  // Track whether user has manually navigated
  const userNavigatedRef = useRef(false);

  // Load persona profiles on mount, include advocate if user has a profile
  useEffect(() => {
    fetch("/api/board/personas")
      .then((res) => res.json())
      .then((data) => {
        const baseProfiles: PersonaProfile[] = data.personas ?? [];
        if (userProfile) {
          const advocateProfile = buildAdvocateProfile(userProfile);
          setProfiles([...baseProfiles, advocateProfile]);
        } else {
          setProfiles(baseProfiles);
        }
      })
      .catch(console.error);
  }, [userProfile]);

  // Build enriched decision from original + probing Q&A
  const enrichedDecision = useMemo(
    () => buildEnrichedDecision(decision, probingQuestions, probingAnswers),
    [decision, probingQuestions, probingAnswers]
  );

  // Generate probing questions from the API
  const generateProbingQuestions = useCallback(async (decisionText: string) => {
    setQuestionsLoading(true);
    try {
      const res = await fetch("/api/board/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: decisionText }),
      });
      if (!res.ok) throw new Error("Failed to generate questions");
      const data = await res.json();
      setProbingQuestions(data.questions ?? []);
      setProbingAnswers({});
    } catch (err) {
      console.error("Failed to generate probing questions:", err);
      setProbingQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  const setProbingAnswer = useCallback((id: string, value: string) => {
    setProbingAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  // Abort any in-flight challenge and remove the incomplete exchange
  const abortChallenge = useCallback(() => {
    if (challengeAbortRef.current) {
      challengeAbortRef.current.abort();
      challengeAbortRef.current = null;
      // Remove the dangling incomplete exchange
      const personaId = challengePersonaRef.current;
      if (personaId) {
        updateResponse(personaId, (r) => ({
          ...r,
          challenges: r.challenges.filter((c) => c.isReplyComplete),
        }));
        challengePersonaRef.current = null;
      }
    }
    setChallengeStatus("idle");
  }, [updateResponse]);

  // Reset challenge/brief state when a new session starts
  useEffect(() => {
    if (status === "loading") {
      abortChallenge();
      setChallengeStatus("idle");
      setBriefStale(false);
      setBriefLoading(false);
      setRegeneratedBrief(null);
    }
  }, [status, abortChallenge]);

  // Start a challenge exchange
  const startChallenge = useCallback(
    (personaId: string, text: string) => {
      // Abort any existing challenge
      abortChallenge();

      const abortController = new AbortController();
      challengeAbortRef.current = abortController;
      challengePersonaRef.current = personaId;

      // Find the current response to get context
      const response = responses.find((r) => r.personaId === personaId);
      if (!response) return;

      // Add blank exchange to the persona's challenges
      const newExchange: ChallengeExchange = {
        challengeText: text,
        replyContent: "",
        isReplyComplete: false,
      };

      updateResponse(personaId, (r) => ({
        ...r,
        challenges: [...r.challenges, newExchange],
      }));

      setChallengeStatus("streaming");

      // Completed challenges (not including the new blank one)
      const priorChallenges = response.challenges.filter((c) => c.isReplyComplete);

      // Stream the challenge reply
      (async () => {
        try {
          const res = await fetch("/api/board/challenge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              personaId,
              decision: enrichedDecision,
              initialResponse: response.content,
              priorChallenges,
              challengeText: text,
            }),
            signal: abortController.signal,
          });

          if (!res.ok) throw new Error(`Challenge failed: ${res.status}`);

          const reader = res.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const dataMatch = line.match(/^data: (.+)$/m);
              if (!dataMatch) continue;

              let event;
              try {
                event = JSON.parse(dataMatch[1]);
              } catch {
                continue;
              }

              if (event.type === "challenge_reply_token") {
                updateResponse(personaId, (r) => {
                  const challenges = [...r.challenges];
                  const last = challenges[challenges.length - 1];
                  challenges[challenges.length - 1] = {
                    ...last,
                    replyContent: last.replyContent + event.token,
                  };
                  return { ...r, challenges };
                });
              } else if (event.type === "challenge_reply_complete") {
                updateResponse(personaId, (r) => {
                  const challenges = [...r.challenges];
                  const last = challenges[challenges.length - 1];
                  challenges[challenges.length - 1] = {
                    ...last,
                    isReplyComplete: true,
                  };
                  return { ...r, challenges };
                });
                challengePersonaRef.current = null;
                setChallengeStatus("idle");
                setBriefStale(true);
              } else if (event.type === "error") {
                updateResponse(personaId, (r) => {
                  const challenges = [...r.challenges];
                  const last = challenges[challenges.length - 1];
                  challenges[challenges.length - 1] = {
                    ...last,
                    replyContent: last.replyContent || `[Error: ${event.message}]`,
                    isReplyComplete: true,
                  };
                  return { ...r, challenges };
                });
                challengePersonaRef.current = null;
                setChallengeStatus("idle");
              }
            }
          }
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          setChallengeStatus("idle");
        }
      })();
    },
    [responses, enrichedDecision, updateResponse, abortChallenge]
  );

  const improveBrief = useCallback(() => {
    const currentBrief = brief;
    if (!currentBrief) return;
    setBriefLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/board/brief/improve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brief: currentBrief, decision: enrichedDecision }),
        });
        if (!res.ok) throw new Error(`Improve failed: ${res.status}`);
        const data = await res.json();
        setRegeneratedBrief(data.brief);
      } catch (err) {
        console.error("Failed to improve brief:", err);
      } finally {
        setBriefLoading(false);
      }
    })();
  }, [brief, enrichedDecision]);

  // Step setter that handles brief regeneration when navigating to board_brief
  const setStep = useCallback(
    (newStep: FlowStep) => {
      // Abort challenge on navigation
      if (newStep !== step) {
        abortChallenge();
      }

      if (newStep === "board_brief" && briefStale) {
        setBriefLoading(true);
        setStepRaw(newStep);

        (async () => {
          try {
            const res = await fetch("/api/board/brief", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                decision: enrichedDecision,
                responses,
              }),
            });

            if (!res.ok) throw new Error(`Brief regeneration failed: ${res.status}`);
            const data = await res.json();
            setRegeneratedBrief(data.brief);
            setBriefStale(false);
          } catch (err) {
            console.error("Failed to regenerate brief:", err);
            // Fall back to original brief
          } finally {
            setBriefLoading(false);
          }
        })();
      } else {
        setStepRaw(newStep);
      }
    },
    [step, briefStale, enrichedDecision, responses, abortChallenge]
  );

  // Auto-advance: consulting_board → persona_review when first persona starts
  useEffect(() => {
    if (step === "consulting_board" && responses.length > 0) {
      setStepRaw("persona_review");
      setCurrentPersonaIndex(0);
      prevResponseCountRef.current = responses.length;
      userNavigatedRef.current = false;
    }
  }, [step, responses.length]);

  // Auto-advance persona index as new personas stream in (only if user is on the latest)
  useEffect(() => {
    if (step === "persona_review" && responses.length > prevResponseCountRef.current) {
      if (!userNavigatedRef.current) {
        setCurrentPersonaIndex(responses.length - 1);
      }
      prevResponseCountRef.current = responses.length;
    }
  }, [step, responses.length]);

  // Wrap setCurrentPersonaIndex to track manual navigation + abort challenge
  const handleSetCurrentPersonaIndex = useCallback((i: number) => {
    abortChallenge();
    userNavigatedRef.current = true;
    setCurrentPersonaIndex(i);
  }, [abortChallenge]);

  return (
    <BoardContext.Provider
      value={{
        step,
        setStep,
        decision,
        setDecision,
        enrichedDecision,
        probingQuestions,
        probingAnswers,
        setProbingAnswer,
        questionsLoading,
        generateProbingQuestions,
        sessionStatus: status,
        responses,
        activePersonaId,
        brief,
        sessionError: sessionError,
        startSession,
        currentPersonaIndex,
        setCurrentPersonaIndex: handleSetCurrentPersonaIndex,
        profiles,
        challengeStatus,
        startChallenge,
        abortChallenge,
        briefStale,
        briefLoading,
        improveBrief,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
}

function buildEnrichedDecision(
  decision: string,
  questions: ProbingQuestion[],
  answers: Record<string, string>
): string {
  const answeredQuestions = questions
    .filter((q) => answers[q.id]?.trim())
    .map((q) => `Q: ${q.question}\nA: ${answers[q.id].trim()}`)
    .join("\n\n");

  if (!answeredQuestions) return decision;

  return `${decision}\n\n--- Additional Context ---\n\n${answeredQuestions}`;
}
