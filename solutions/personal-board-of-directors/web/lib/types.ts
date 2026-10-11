/**
 * Client-safe shared types for the Board of Directors UI.
 * These types are used in both server and client code.
 */

export interface RubricScoreDisplay {
  score: number;
  note: string;
}

export interface PersonaProfile {
  id: string;
  name: string;
  role: string;
  contributionType: string;
  rubric: {
    risk_appetite: RubricScoreDisplay;
    evidence_threshold: RubricScoreDisplay;
    tolerance_for_ambiguity: RubricScoreDisplay;
    intervention_frequency: RubricScoreDisplay;
    escalation_bias: RubricScoreDisplay;
    delivery_vs_rigour_bias: RubricScoreDisplay;
  };
}

export interface ChallengeExchange {
  challengeText: string;
  replyContent: string;
  isReplyComplete: boolean;
}

export interface PersonaResponse {
  personaId: string;
  personaName: string;
  content: string;
  isComplete: boolean;
  challenges: ChallengeExchange[];
}

export interface BoardBrief {
  consensus: {
    areas: string[];
    strength: "strong" | "moderate" | "weak";
  };
  tensions: Array<{
    between: [string, string];
    issue: string;
    implication: string;
  }>;
  blindSpots: string[];
  recommendation: {
    summary: string;
    confidence: "high" | "moderate" | "low";
    conditions: string[];
  };
}

/** SSE event types for the board session stream */
export type BoardSessionEvent =
  | { type: "session_start"; personaCount: number }
  | { type: "persona_start"; personaId: string; personaName: string; role: string }
  | { type: "persona_token"; personaId: string; token: string }
  | { type: "persona_complete"; personaId: string }
  | { type: "brief_start" }
  | { type: "brief_complete"; brief: BoardBrief }
  | { type: "session_complete" }
  | { type: "error"; message: string };

export type SessionStatus = "idle" | "loading" | "streaming" | "complete" | "error";

export type FlowStep =
  | "decision_input"
  | "probing_questions"
  | "consulting_board"
  | "persona_review"
  | "board_brief";

export interface ProbingQuestion {
  id: string;
  question: string;
  hint?: string;
}

/** Profile assessment types */

export type ProfileStep = "about" | "goals" | "assessment" | "complete";

export type SeniorityLevel = "early" | "mid" | "senior" | "executive" | "founder";

export type TimeHorizon = "immediate" | "short_term" | "medium_term" | "long_term";

export interface WebUserProfile {
  name: string;
  background: string;
  seniorityLevel: SeniorityLevel;
  experienceDomains: string[];
  context: string;
  primaryGoal: string;
  successDefinition: string;
  timeHorizon: TimeHorizon;
  sacrificesAcceptable: string[];
  nonNegotiables: string[];
  dependencies: string[];
  resourceLimits: string;
  knownWeaknesses: string[];
  blindSpots: string[];
  patterns: string[];
  rubric: {
    risk_appetite: RubricScoreDisplay;
    evidence_threshold: RubricScoreDisplay;
    tolerance_for_ambiguity: RubricScoreDisplay;
    intervention_frequency: RubricScoreDisplay;
    escalation_bias: RubricScoreDisplay;
    delivery_vs_rigour_bias: RubricScoreDisplay;
  };
  completedAt: string;
}

export interface ProfileQuestionOption {
  label: string;
  scores: Partial<Record<string, number>>;
}

export interface ProfileQuestion {
  id: string;
  category: string;
  scenario: string;
  context: string;
  options: [ProfileQuestionOption, ProfileQuestionOption, ProfileQuestionOption, ProfileQuestionOption];
}

export interface ProfileQuestionResponse {
  question_id: string;
  selected_option: number;
}
