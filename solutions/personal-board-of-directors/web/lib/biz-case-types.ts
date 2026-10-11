export type BizCaseStep = "persona_pick" | "interview" | "generating" | "result";

export type MessageRole = "question" | "answer" | "challenge";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  personaId?: string;
  personaName?: string;
  isStreaming?: boolean;
}

export interface InterviewAnswer {
  questionIndex: number;
  question: string;
  answer: string;
  challengeContent?: string;
  challengePersonaId?: string;
  challengePersonaName?: string;
}

export interface InterviewQuestion {
  prompt: string;
  challengePersonaSlug: string | null;
}

export type ChallengeEvent =
  | { type: "challenge_token"; token: string }
  | { type: "challenge_complete" }
  | { type: "error"; message: string };

export type GenerateEvent =
  | { type: "narrative_token"; token: string }
  | { type: "narrative_complete" }
  | { type: "error"; message: string };

export type ProposeEvent =
  | { type: "propose_token"; token: string }
  | { type: "propose_complete" }
  | { type: "error"; message: string };
