import type {
  RubricDimensionName,
  RubricProfile,
  RubricScore,
} from "../schema/rubric.js";
import {
  RUBRIC_DIMENSIONS,
  validateRubricCoherence,
} from "../schema/rubric.js";

/**
 * Profile Risk Questionnaire
 *
 * Twelve scenario-based questions that determine the user's personal
 * risk profile across the same six rubric dimensions used by board
 * personas. Each question targets one or two dimensions and offers
 * 4 options scored on the 1-10 scale.
 *
 * Question design principles:
 * - Scenarios, not abstractions — real decisions with real trade-offs
 * - No "correct" answers — each option reflects a legitimate posture
 * - Australian English in all user-facing text
 * - Each dimension is targeted by at least 2 questions for reliability
 */

// ── Types ────────────────────────────────────────────────────────────

export interface QuestionOption {
  /** Option label shown to the user */
  label: string;
  /** Score contributions per rubric dimension */
  scores: Partial<Record<RubricDimensionName, number>>;
}

export interface ProfileQuestion {
  id: string;
  /** Short category label for UI grouping */
  category: string;
  /** The scenario presented to the user */
  scenario: string;
  /** Additional context to ground the scenario */
  context: string;
  /** Which rubric dimensions this question targets */
  targets: RubricDimensionName[];
  /** The response options (always 4) */
  options: [QuestionOption, QuestionOption, QuestionOption, QuestionOption];
}

/** A user's response to a single question */
export interface QuestionResponse {
  question_id: string;
  /** Index of the chosen option (0-3) */
  selected_option: number;
}

/** Intermediate score accumulator for a single dimension */
export interface DimensionAccumulator {
  total: number;
  count: number;
}

// ── Question Bank ────────────────────────────────────────────────────

export const PROFILE_QUESTION_BANK: ProfileQuestion[] = [
  // ── Risk Appetite (primary) + Evidence Threshold ─────────────────

  {
    id: "pq_opportunity_confidence",
    category: "Risk & Evidence",
    scenario:
      "You have 60% confidence in a business opportunity. A trusted adviser says wait for more data. A competitor is moving now.",
    context:
      "The opportunity is genuine but unproven. Waiting means better information but possible loss of first-mover advantage.",
    targets: ["risk_appetite", "evidence_threshold"],
    options: [
      {
        label:
          "Wait — I need at least 80% confidence before committing real resources",
        scores: { risk_appetite: 2, evidence_threshold: 9 },
      },
      {
        label:
          "Run a quick two-week validation sprint, then decide with whatever I learn",
        scores: { risk_appetite: 4, evidence_threshold: 6 },
      },
      {
        label:
          "Move now with a defined fallback plan — 60% is enough if the downside is contained",
        scores: { risk_appetite: 7, evidence_threshold: 4 },
      },
      {
        label:
          "Move now, fully committed — speed is the advantage and hesitation is the real risk",
        scores: { risk_appetite: 9, evidence_threshold: 2 },
      },
    ],
  },

  {
    id: "pq_career_leap",
    category: "Risk & Evidence",
    scenario:
      "You receive an offer from a startup at 40% more pay, but the company has only 18 months of runway. Your current role is stable with a clear promotion path.",
    context:
      "The startup role would stretch your skills significantly. The current role is comfortable but predictable.",
    targets: ["risk_appetite", "evidence_threshold"],
    options: [
      {
        label:
          "Stay — the promotion path is proven and the startup could fold in a year",
        scores: { risk_appetite: 2, evidence_threshold: 8 },
      },
      {
        label:
          "Ask for more data — financial projections, retention rates, board composition — before deciding",
        scores: { risk_appetite: 4, evidence_threshold: 7 },
      },
      {
        label:
          "Take it if the contract includes a reasonable severance clause — manage the downside",
        scores: { risk_appetite: 7, evidence_threshold: 5 },
      },
      {
        label:
          "Take it — growth comes from discomfort and the upside dwarfs the risk",
        scores: { risk_appetite: 9, evidence_threshold: 3 },
      },
    ],
  },

  // ── Evidence Threshold (primary) + Delivery vs Rigour ────────────

  {
    id: "pq_data_decision",
    category: "Evidence & Rigour",
    scenario:
      "Your team has strong anecdotal evidence that a product change will improve retention, but the A/B test needs another 3 weeks to reach statistical significance.",
    context:
      "A competitor just launched a similar feature. Leadership is asking for faster results.",
    targets: ["evidence_threshold", "delivery_vs_rigour_bias"],
    options: [
      {
        label:
          "Wait the full 3 weeks — launching on anecdotes is how you build a product on sand",
        scores: { evidence_threshold: 9, delivery_vs_rigour_bias: 2 },
      },
      {
        label:
          "Wait, but run the analysis on a subset to see if the signal is consistent",
        scores: { evidence_threshold: 7, delivery_vs_rigour_bias: 4 },
      },
      {
        label:
          "Launch to 20% of users now and use that as a live test — you learn faster in production",
        scores: { evidence_threshold: 4, delivery_vs_rigour_bias: 7 },
      },
      {
        label:
          "Ship it — the anecdotal signal is strong enough and waiting has its own cost",
        scores: { evidence_threshold: 2, delivery_vs_rigour_bias: 9 },
      },
    ],
  },

  // ── Tolerance for Ambiguity (primary) + Risk Appetite ────────────

  {
    id: "pq_ambiguous_brief",
    category: "Ambiguity & Clarity",
    scenario:
      "You are handed a project with an unclear brief, shifting requirements, and a sponsor who says 'you'll figure it out as you go.'",
    context:
      "The project has executive visibility and genuine impact potential, but no one has defined what success looks like.",
    targets: ["tolerance_for_ambiguity", "risk_appetite"],
    options: [
      {
        label:
          "Decline or push back until the brief is clear — ambiguous mandates set people up to fail",
        scores: { tolerance_for_ambiguity: 2, risk_appetite: 2 },
      },
      {
        label:
          "Accept but immediately define your own success criteria and get sign-off before starting",
        scores: { tolerance_for_ambiguity: 4, risk_appetite: 4 },
      },
      {
        label:
          "Accept and start with a 2-week discovery phase — shape the brief as you learn",
        scores: { tolerance_for_ambiguity: 7, risk_appetite: 6 },
      },
      {
        label:
          "Dive in — the best way to define the project is to start building and iterate",
        scores: { tolerance_for_ambiguity: 9, risk_appetite: 8 },
      },
    ],
  },

  {
    id: "pq_incomplete_information",
    category: "Ambiguity & Clarity",
    scenario:
      "You need to make a hiring decision between two strong candidates. You have solid data on Candidate A but limited references for Candidate B, who interviewed exceptionally well.",
    context:
      "The role needs to be filled within two weeks. Extending the search is not practical.",
    targets: ["tolerance_for_ambiguity", "evidence_threshold"],
    options: [
      {
        label:
          "Hire Candidate A — you know what you're getting and surprises in hiring are rarely good",
        scores: { tolerance_for_ambiguity: 2, evidence_threshold: 8 },
      },
      {
        label:
          "Delay one week to chase Candidate B's references — the extra data is worth the wait",
        scores: { tolerance_for_ambiguity: 4, evidence_threshold: 7 },
      },
      {
        label:
          "Hire Candidate B with a clear 90-day review — trust the interview signal and manage the uncertainty",
        scores: { tolerance_for_ambiguity: 7, evidence_threshold: 4 },
      },
      {
        label:
          "Hire Candidate B — exceptional interview performance is the strongest signal there is",
        scores: { tolerance_for_ambiguity: 9, evidence_threshold: 2 },
      },
    ],
  },

  // ── Intervention Frequency (primary) + Escalation Bias ───────────

  {
    id: "pq_team_direction",
    category: "Intervention & Delegation",
    scenario:
      "You notice your team is heading in a direction you think is suboptimal, but not catastrophically wrong. They are engaged, moving fast, and haven't asked for input.",
    context:
      "Correcting course now would be easy. Correcting later would cost a week of rework.",
    targets: ["intervention_frequency", "escalation_bias"],
    options: [
      {
        label:
          "Intervene immediately — a week of rework is avoidable and you have the context to prevent it",
        scores: { intervention_frequency: 9, escalation_bias: 3 },
      },
      {
        label:
          "Raise it in the next scheduled check-in — there is a process for this and it can wait a day",
        scores: { intervention_frequency: 6, escalation_bias: 5 },
      },
      {
        label:
          "Ask a subtle question that nudges them to reconsider — guide without directing",
        scores: { intervention_frequency: 5, escalation_bias: 3 },
      },
      {
        label:
          "Let it play out — they will learn more from finding the issue themselves, and a week of rework is not critical",
        scores: { intervention_frequency: 2, escalation_bias: 2 },
      },
    ],
  },

  {
    id: "pq_meeting_derail",
    category: "Intervention & Delegation",
    scenario:
      "You are in a meeting where the discussion has drifted significantly off-topic. The chair has not noticed and others seem content to continue.",
    context:
      "The original agenda item is time-sensitive. You are not the most senior person in the room.",
    targets: ["intervention_frequency", "escalation_bias"],
    options: [
      {
        label:
          "Redirect immediately — 'Can we come back to the original topic? We have a deadline.'",
        scores: { intervention_frequency: 9, escalation_bias: 4 },
      },
      {
        label:
          "Message the chair privately during the meeting to flag the drift",
        scores: { intervention_frequency: 6, escalation_bias: 7 },
      },
      {
        label:
          "Wait for a natural pause and then suggest returning to the agenda",
        scores: { intervention_frequency: 4, escalation_bias: 3 },
      },
      {
        label:
          "Stay quiet — it is the chair's job to manage the meeting and you will follow up afterwards if needed",
        scores: { intervention_frequency: 2, escalation_bias: 6 },
      },
    ],
  },

  // ── Escalation Bias (primary) + Intervention Frequency ───────────

  {
    id: "pq_ethical_concern",
    category: "Escalation & Boundaries",
    scenario:
      "You discover a colleague has been inflating metrics in their reports. The numbers are not wildly wrong, but they are consistently overstated.",
    context:
      "The colleague is well-liked and under pressure from leadership to hit targets. The inflated metrics have not caused direct harm yet.",
    targets: ["escalation_bias", "intervention_frequency"],
    options: [
      {
        label:
          "Escalate to management immediately — metric integrity is non-negotiable regardless of intent",
        scores: { escalation_bias: 9, intervention_frequency: 8 },
      },
      {
        label:
          "Raise it with the colleague first and give them a week to correct it themselves",
        scores: { escalation_bias: 4, intervention_frequency: 7 },
      },
      {
        label:
          "Document what you have found and raise it at the next review cycle through proper channels",
        scores: { escalation_bias: 6, intervention_frequency: 4 },
      },
      {
        label:
          "Monitor the situation — it may be an honest mistake and confronting it prematurely could damage a working relationship",
        scores: { escalation_bias: 2, intervention_frequency: 2 },
      },
    ],
  },

  // ── Delivery vs Rigour (primary) + Tolerance for Ambiguity ───────

  {
    id: "pq_launch_quality",
    category: "Speed vs Thoroughness",
    scenario:
      "Your product is 85% polished and the launch window is closing. The remaining 15% is edge cases and minor UX refinements — nothing broken, just not perfect.",
    context:
      "A delayed launch means missing a seasonal demand spike and letting a competitor establish first.",
    targets: ["delivery_vs_rigour_bias", "tolerance_for_ambiguity"],
    options: [
      {
        label:
          "Delay — launching at 85% creates a first impression you cannot undo and edge cases always bite harder than expected",
        scores: { delivery_vs_rigour_bias: 2, tolerance_for_ambiguity: 3 },
      },
      {
        label:
          "Fix the top 3 edge cases (one more week), then launch — prioritise the issues most likely to surface",
        scores: { delivery_vs_rigour_bias: 4, tolerance_for_ambiguity: 5 },
      },
      {
        label:
          "Launch now with a clear post-launch patch schedule communicated to users",
        scores: { delivery_vs_rigour_bias: 7, tolerance_for_ambiguity: 7 },
      },
      {
        label:
          "Launch immediately — perfect is the enemy of shipped and the market will not wait",
        scores: { delivery_vs_rigour_bias: 9, tolerance_for_ambiguity: 8 },
      },
    ],
  },

  {
    id: "pq_documentation_debt",
    category: "Speed vs Thoroughness",
    scenario:
      "You have built a working solution to a critical problem. It works reliably but the documentation, tests, and error handling are minimal. You have the choice to ship now or spend two more days hardening.",
    context:
      "Other team members will need to maintain this solution. You have three other priorities waiting.",
    targets: ["delivery_vs_rigour_bias", "evidence_threshold"],
    options: [
      {
        label:
          "Spend the two days — undocumented, untested code is a liability, not a solution",
        scores: { delivery_vs_rigour_bias: 2, evidence_threshold: 7 },
      },
      {
        label:
          "Write the essential documentation and the critical-path tests, skip the rest",
        scores: { delivery_vs_rigour_bias: 4, evidence_threshold: 5 },
      },
      {
        label:
          "Ship now with inline comments and a README, schedule hardening for next sprint",
        scores: { delivery_vs_rigour_bias: 7, evidence_threshold: 4 },
      },
      {
        label:
          "Ship now — it works, the team can read the code, and hardening never actually gets scheduled anyway",
        scores: { delivery_vs_rigour_bias: 9, evidence_threshold: 2 },
      },
    ],
  },

  // ── Risk Appetite (reinforcement) + Escalation Bias ──────────────

  {
    id: "pq_investment_allocation",
    category: "Risk & Escalation",
    scenario:
      "You have $50,000 to invest. A financial adviser recommends splitting it: 70% in index funds, 30% in a higher-risk growth portfolio. A friend with a strong track record recommends going 100% into the growth portfolio.",
    context:
      "You do not need this money for at least 10 years. Your emergency fund is solid.",
    targets: ["risk_appetite", "escalation_bias"],
    options: [
      {
        label:
          "Go with the adviser's 70/30 split — diversification is protection and the friend is not a fiduciary",
        scores: { risk_appetite: 3, escalation_bias: 5 },
      },
      {
        label:
          "Seek a second professional opinion before deciding — $50K warrants proper due diligence",
        scores: { risk_appetite: 4, escalation_bias: 7 },
      },
      {
        label:
          "Split 50/50 between the two strategies — hedge your bets and revisit in a year",
        scores: { risk_appetite: 6, escalation_bias: 4 },
      },
      {
        label:
          "Go 100% growth — with a 10-year horizon and solid emergency fund, volatility is your friend",
        scores: { risk_appetite: 9, escalation_bias: 2 },
      },
    ],
  },

  // ── Tolerance for Ambiguity (reinforcement) + Delivery vs Rigour ─

  {
    id: "pq_strategy_pivot",
    category: "Ambiguity & Speed",
    scenario:
      "Halfway through executing a strategy, new market data suggests the original plan may be wrong. The data is suggestive but not conclusive. Your team is executing well on the current plan.",
    context:
      "Pivoting now would mean abandoning 3 months of work. Continuing risks building the wrong thing.",
    targets: ["tolerance_for_ambiguity", "delivery_vs_rigour_bias"],
    options: [
      {
        label:
          "Pause execution and commission a proper analysis before continuing — the cost of building the wrong thing exceeds the cost of delay",
        scores: { tolerance_for_ambiguity: 2, delivery_vs_rigour_bias: 2 },
      },
      {
        label:
          "Continue executing but allocate a small team to investigate the new data in parallel",
        scores: { tolerance_for_ambiguity: 5, delivery_vs_rigour_bias: 5 },
      },
      {
        label:
          "Adjust the strategy to hedge — keep the core plan but modify the next milestone to account for the new signal",
        scores: { tolerance_for_ambiguity: 7, delivery_vs_rigour_bias: 6 },
      },
      {
        label:
          "Pivot now — suggestive data from the market is more valuable than conclusive data from your spreadsheet",
        scores: { tolerance_for_ambiguity: 9, delivery_vs_rigour_bias: 8 },
      },
    ],
  },
];

// ── Scoring Engine ───────────────────────────────────────────────────

/**
 * Score a set of questionnaire responses into a complete rubric profile.
 *
 * For each dimension, averages the scores contributed by all answered
 * questions targeting that dimension. Every score gets an auto-generated
 * interpretive note based on where it falls on the scale.
 */
export function scoreResponses(responses: QuestionResponse[]): {
  profile: RubricProfile;
  warnings: string[];
  coverage: Record<RubricDimensionName, number>;
} {
  // Accumulate scores per dimension
  const accumulators: Record<RubricDimensionName, DimensionAccumulator> =
    {} as Record<RubricDimensionName, DimensionAccumulator>;

  for (const dim of RUBRIC_DIMENSIONS) {
    accumulators[dim] = { total: 0, count: 0 };
  }

  for (const response of responses) {
    const question = PROFILE_QUESTION_BANK.find(
      (q) => q.id === response.question_id
    );
    if (!question) continue;

    const option = question.options[response.selected_option];
    if (!option) continue;

    for (const [dimension, score] of Object.entries(option.scores)) {
      const dim = dimension as RubricDimensionName;
      accumulators[dim].total += score;
      accumulators[dim].count += 1;
    }
  }

  // Build the profile
  const profile: Record<string, RubricScore> = {};
  const coverage: Record<string, number> = {};

  for (const dim of RUBRIC_DIMENSIONS) {
    const acc = accumulators[dim];
    coverage[dim] = acc.count;

    if (acc.count === 0) {
      // Default to midpoint if no data — should not happen with full questionnaire
      profile[dim] = {
        score: 5,
        note: "Insufficient data to determine posture. Defaulted to midpoint.",
      };
    } else {
      const rawScore = acc.total / acc.count;
      const score = Math.max(1, Math.min(10, Math.round(rawScore)));
      profile[dim] = {
        score,
        note: generateInterpretiveNote(dim, score),
      };
    }
  }

  const rubricProfile = profile as unknown as RubricProfile;
  const warnings = validateRubricCoherence(rubricProfile);

  return {
    profile: rubricProfile,
    warnings,
    coverage: coverage as Record<RubricDimensionName, number>,
  };
}

/**
 * Generate an interpretive note for a rubric dimension score.
 * Notes describe how the score manifests in the user's behaviour —
 * not whether it is good or bad.
 */
export function generateInterpretiveNote(
  dimension: RubricDimensionName,
  score: number
): string {
  const band = score <= 3 ? "low" : score <= 6 ? "mid" : "high";

  const notes: Record<
    RubricDimensionName,
    Record<"low" | "mid" | "high", string>
  > = {
    risk_appetite: {
      low: `Conservative. Prefers proven approaches with clear downside protection before committing.`,
      mid: `Balanced. Willing to accept moderate risk when the potential reward is proportionate and the downside is understood.`,
      high: `Bold. Comfortable with significant uncertainty and willing to move on incomplete information when the upside justifies it.`,
    },
    evidence_threshold: {
      low: `Trusts directional signals, experienced judgement, and pattern recognition over formal evidence.`,
      mid: `Wants reasonable supporting evidence but does not require exhaustive proof before acting.`,
      high: `Requires documented evidence, tested assumptions, and verified sources before accepting conclusions.`,
    },
    tolerance_for_ambiguity: {
      low: `Uncomfortable operating without clarity. Prefers defined scope, clear success criteria, and structured plans.`,
      mid: `Can work with some ambiguity but actively seeks to reduce it. Prefers rough structure over none.`,
      high: `Comfortable navigating unclear situations. Treats ambiguity as a normal operating condition and shapes clarity through action.`,
    },
    intervention_frequency: {
      low: `Hands-off. Prefers to let things play out and intervenes only when something material is at risk.`,
      mid: `Selectively engaged. Intervenes at natural checkpoints or when the situation clearly warrants input.`,
      high: `Actively involved. Steps in frequently to challenge, clarify, or redirect when issues are spotted early.`,
    },
    escalation_bias: {
      low: `Handles issues locally wherever possible. Prefers to resolve problems at the source before involving others.`,
      mid: `Escalates when the issue is material or outside personal authority, but handles routine concerns independently.`,
      high: `Escalates early and often. Prefers transparency and shared awareness over handling issues quietly.`,
    },
    delivery_vs_rigour_bias: {
      low: `Strongly favours thoroughness. Would rather delay than ship something insufficiently tested or documented.`,
      mid: `Balances speed and quality pragmatically. Adjusts based on stakes — moves fast on low-risk items, slows down for high-stakes work.`,
      high: `Strongly favours delivery. Believes shipping and iterating produces better outcomes than extended preparation.`,
    },
  };

  return notes[dimension][band];
}

/**
 * Get the questions that target a specific rubric dimension.
 */
export function getQuestionsForDimension(
  dimension: RubricDimensionName
): ProfileQuestion[] {
  return PROFILE_QUESTION_BANK.filter((q) => q.targets.includes(dimension));
}

/**
 * Validate that a set of responses covers all rubric dimensions adequately.
 * Returns dimensions with fewer than 2 contributing responses.
 */
export function checkCoverage(
  responses: QuestionResponse[]
): RubricDimensionName[] {
  const coverage: Record<string, number> = {};
  for (const dim of RUBRIC_DIMENSIONS) {
    coverage[dim] = 0;
  }

  for (const response of responses) {
    const question = PROFILE_QUESTION_BANK.find(
      (q) => q.id === response.question_id
    );
    if (!question) continue;

    const option = question.options[response.selected_option];
    if (!option) continue;

    for (const dimension of Object.keys(option.scores)) {
      coverage[dimension] = (coverage[dimension] ?? 0) + 1;
    }
  }

  return RUBRIC_DIMENSIONS.filter((dim) => (coverage[dim] ?? 0) < 2);
}

/**
 * Get the total number of questions in the bank.
 */
export const PROFILE_QUESTION_COUNT = PROFILE_QUESTION_BANK.length;
