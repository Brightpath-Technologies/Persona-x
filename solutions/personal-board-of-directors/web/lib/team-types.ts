/**
 * Client-safe types for the Software Team Advisor feature.
 */

export type PersonaStance = "constructive" | "balanced" | "critical";
export type PersonaStanceMap = Record<string, PersonaStance>;
export type CompetitiveAdvantageVerdict = "yes" | "no" | "unsure";

export type TeamFlowStep =
  | "persona_select"
  | "project_input"
  | "consulting_team"
  | "founder_gate"
  | "team_review"
  | "team_brief";

export interface TeamMemberProfile {
  /** Slug — matches YAML filename without extension, e.g. "founder" */
  id: string;
  /** Display name, e.g. "Founder" */
  name: string;
  /** One-sentence role description shown on the selector card */
  tagline: string;
  contributionType: string;
}

export interface TeamBrief {
  alignment: {
    areas: string[];
    strength: "strong" | "moderate" | "weak";
  };
  critical_risks: Array<{
    risk: string;
    raised_by: string;
    implication: string;
  }>;
  build_priorities: string[];
  unknowns: string[];
  verdict: {
    recommendation: "go" | "conditional_go" | "no_go";
    summary: string;
    conditions: string[];
  };
}

export interface ProjectResources {
  budget: string;
  team: string;
  specialties: string;
  existingTools: string;
}

export type SessionStatus = "idle" | "loading" | "streaming" | "complete" | "error";

export interface PersonaResponse {
  personaId: string;
  personaName: string;
  content: string;
  isComplete: boolean;
}

/** SSE events emitted by /api/team/session */
export type TeamSessionEvent =
  | { type: "session_start"; personaCount: number }
  | { type: "persona_start"; personaId: string; personaName: string; role: string }
  | { type: "persona_token"; personaId: string; token: string }
  | { type: "persona_complete"; personaId: string }
  | { type: "brief_start" }
  | { type: "brief_complete"; brief: TeamBrief }
  | { type: "session_complete" }
  | { type: "competitive_advantage_verdict"; verdict: CompetitiveAdvantageVerdict }
  | { type: "founder_phase_complete" }
  | { type: "error"; message: string };
