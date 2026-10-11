import type { RubricScoreDisplay, WebUserProfile, PersonaProfile } from "./types";

type DimKey = keyof WebUserProfile["rubric"];

const DIMENSION_KEYS: DimKey[] = [
  "risk_appetite",
  "evidence_threshold",
  "tolerance_for_ambiguity",
  "intervention_frequency",
  "escalation_bias",
  "delivery_vs_rigour_bias",
];

const NOTE_TEMPLATES: Record<DimKey, { low: string; mid: string; high: string }> = {
  risk_appetite: {
    low: "Strongly prefers proven approaches with clear downside protection before committing",
    mid: "Balances caution with pragmatism, willing to accept moderate uncertainty when the rationale is sound",
    high: "Comfortable with significant uncertainty and willing to move decisively when potential upside justifies it",
  },
  evidence_threshold: {
    low: "Relies on directional signals, experience, and professional judgement rather than exhaustive data",
    mid: "Requires reasonable supporting evidence but does not demand certainty before proceeding",
    high: "Requires documented, verified evidence before accepting conclusions or committing to action",
  },
  tolerance_for_ambiguity: {
    low: "Strongly prefers clarity and defined parameters before engaging, uncomfortable operating in grey areas",
    mid: "Can operate with some ambiguity but actively works to resolve it as a priority",
    high: "Comfortable navigating incomplete or evolving information, adapts approach as clarity emerges",
  },
  intervention_frequency: {
    low: "Prefers to observe and let others drive, stepping in only when something material is at stake",
    mid: "Intervenes selectively at key decision points or when the discussion needs redirecting",
    high: "Actively engages throughout discussions, frequently challenging, clarifying, and redirecting",
  },
  escalation_bias: {
    low: "Prefers to resolve issues locally and handle concerns directly rather than escalating up",
    mid: "Escalates when the issue exceeds their authority or the stakes warrant wider visibility",
    high: "Quickly escalates issues, risks, and concerns to ensure appropriate oversight and governance",
  },
  delivery_vs_rigour_bias: {
    low: "Strongly favours thoroughness and precision, willing to delay delivery for quality assurance",
    mid: "Balances the need for quality with pragmatic delivery timelines based on context",
    high: "Prioritises momentum and delivery, accepting that refinement can follow initial progress",
  },
};

function noteFor(dim: DimKey, score: number): string {
  const t = NOTE_TEMPLATES[dim];
  if (score <= 3) return t.low;
  if (score <= 7) return t.mid;
  return t.high;
}

function clamp(n: number): number {
  return Math.max(1, Math.min(10, n));
}

function calibrate(dim: DimKey, userScore: number): number {
  switch (dim) {
    case "risk_appetite":
      if (userScore <= 3) return clamp(userScore + 3);
      if (userScore >= 8) return userScore;
      return clamp(userScore + 2);
    case "evidence_threshold":
      if (userScore >= 8) return userScore;
      if (userScore <= 3) return clamp(userScore + 2);
      return userScore;
    case "tolerance_for_ambiguity":
      if (userScore <= 3) return clamp(userScore + 3);
      return clamp(userScore - 1);
    case "intervention_frequency":
      return 8;
    case "escalation_bias":
      if (userScore >= 7) return userScore;
      return clamp(userScore + 2);
    case "delivery_vs_rigour_bias":
      if (userScore >= 7) return userScore;
      if (userScore <= 3) return clamp(userScore + 2);
      return clamp(userScore + 1);
  }
}

export function buildAdvocateProfile(userProfile: WebUserProfile): PersonaProfile {
  const rubric = {} as Record<DimKey, RubricScoreDisplay>;
  for (const dim of DIMENSION_KEYS) {
    const advocateScore = calibrate(dim, userProfile.rubric[dim].score);
    rubric[dim] = { score: advocateScore, note: noteFor(dim, advocateScore) };
  }

  return {
    id: "advocate",
    name: `${userProfile.name}'s Advocate`,
    role: `Champions ${userProfile.name}'s position and finds the strongest path to making their argument succeed.`,
    contributionType: "advocate",
    rubric,
  };
}
