import type { UserProfile } from "../profile/schema.js";
import type { AdvocacyStrategy } from "./schema.js";

export interface CaseContext {
  decision_topic: string;
  user_position: string;
  supporting_evidence?: string[];
  known_opposition?: string[];
}

export function buildAdvocacyStrategy(
  profile: UserProfile,
  context: CaseContext
): AdvocacyStrategy {
  const strongest_arguments = generateStrongestArguments(profile, context);
  const anticipated_objections = generateAnticipatedObjections(profile, context);
  const evidence_to_emphasise = gatherEvidence(profile, context);
  const concessions = identifyConcessions(profile, context);
  const red_lines = extractRedLines(profile);

  return {
    position_summary: buildPositionSummary(profile, context),
    strongest_arguments,
    anticipated_objections,
    evidence_to_emphasise,
    concessions_available: concessions,
    red_lines,
  };
}

function buildPositionSummary(
  profile: UserProfile,
  context: CaseContext
): string {
  const timeframe =
    profile.goals.time_horizon === "immediate"
      ? "requiring immediate action"
      : profile.goals.time_horizon === "short_term"
        ? "within a short-term timeframe"
        : profile.goals.time_horizon === "medium_term"
          ? "over a medium-term horizon"
          : "as a long-term strategic play";

  return (
    `${profile.metadata.name} advocates for: ${context.user_position}. ` +
    `This supports their primary goal of ${profile.goals.primary_goal}, ` +
    `${timeframe}. Success is defined as: ${profile.goals.success_definition}.`
  );
}

function generateStrongestArguments(
  profile: UserProfile,
  context: CaseContext
): string[] {
  const args: string[] = [];

  args.push(
    `Aligns with the stated goal: ${profile.goals.primary_goal}`
  );

  if (profile.risk_profile.risk_appetite.score >= 6) {
    args.push(
      "The user has demonstrated willingness to accept calculated risk, making this a measured bet rather than a reckless one"
    );
  } else {
    args.push(
      "The user's conservative risk profile means this position has been carefully considered, not impulsive"
    );
  }

  if (profile.identity.experience_domains.length > 0) {
    args.push(
      `Backed by domain expertise in: ${profile.identity.experience_domains.join(", ")}`
    );
  }

  if (context.supporting_evidence && context.supporting_evidence.length > 0) {
    args.push(
      `Supported by evidence: ${context.supporting_evidence[0]}`
    );
  }

  if (profile.goals.sacrifices_acceptable.length > 0) {
    args.push(
      `The user has already identified acceptable trade-offs: ${profile.goals.sacrifices_acceptable.join("; ")}`
    );
  }

  return args.slice(0, 5);
}

function generateAnticipatedObjections(
  profile: UserProfile,
  context: CaseContext
): Array<{ objection: string; counter: string }> {
  const objections: Array<{ objection: string; counter: string }> = [];

  if (profile.vulnerabilities.known_weaknesses.length > 0) {
    const weakness = profile.vulnerabilities.known_weaknesses[0]!;
    objections.push({
      objection: `The user's self-identified weakness in "${weakness}" undermines this position`,
      counter: `Acknowledging this weakness demonstrates self-awareness and the position accounts for it through ${profile.constraints.resource_limits}`,
    });
  }

  if (profile.risk_profile.risk_appetite.score >= 7) {
    objections.push({
      objection: "This position takes on too much risk",
      counter:
        "The user's track record shows comfort with calculated risk, and downside is bounded by their stated non-negotiables",
    });
  } else {
    objections.push({
      objection: "This position is too conservative and misses the opportunity",
      counter:
        "Measured approaches preserve optionality and the user's constraints make aggressive positions untenable",
    });
  }

  if (context.known_opposition && context.known_opposition.length > 0) {
    for (const opposition of context.known_opposition.slice(0, 2)) {
      objections.push({
        objection: opposition,
        counter: `This concern is addressed by the user's approach: the position accommodates this through deliberate constraint management`,
      });
    }
  }

  if (objections.length === 0) {
    objections.push({
      objection: "The position lacks sufficient supporting evidence",
      counter: `The user's evidence threshold (${profile.risk_profile.evidence_threshold.score}/10) has been met given the available data`,
    });
  }

  return objections;
}

function gatherEvidence(
  profile: UserProfile,
  context: CaseContext
): string[] {
  const evidence: string[] = [];

  if (context.supporting_evidence) {
    evidence.push(...context.supporting_evidence);
  }

  evidence.push(
    `Professional background: ${profile.identity.background}`
  );

  if (profile.identity.seniority_level !== "early") {
    evidence.push(
      `${profile.identity.seniority_level}-level experience provides credibility in this domain`
    );
  }

  return evidence;
}

function identifyConcessions(
  profile: UserProfile,
  _context: CaseContext
): string[] {
  const concessions: string[] = [];

  if (profile.goals.sacrifices_acceptable.length > 0) {
    for (const sacrifice of profile.goals.sacrifices_acceptable) {
      concessions.push(
        `Willing to concede: ${sacrifice}`
      );
    }
  }

  if (profile.vulnerabilities.blind_spots.length > 0) {
    concessions.push(
      `Acknowledges potential blind spots in: ${profile.vulnerabilities.blind_spots.join(", ")}`
    );
  }

  return concessions;
}

function extractRedLines(profile: UserProfile): string[] {
  const redLines = [...profile.constraints.non_negotiables];

  if (redLines.length === 0) {
    redLines.push(
      "Core goal integrity must be preserved"
    );
  }

  return redLines;
}
