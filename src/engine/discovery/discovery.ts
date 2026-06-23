/**
 * Discovery State Machine
 *
 * Manages the structured, minimal questioning process that extracts
 * judgement and behaviour signals from the user.
 */

/** The priority signals that materially affect persona behaviour */
export const PRIORITY_SIGNALS = [
  "discomfort_triggers",
  "evidence_change_thresholds",
  "ambiguity_handling",
  "pressure_behaviour",
  "deferral_preferences",
] as const;

export type PrioritySignal = (typeof PRIORITY_SIGNALS)[number];

/** Question types — decision-oriented, not descriptive */
export type QuestionType =
  | "choice" // Binary or multi-option selection
  | "contrast" // "Closer to X or Y?"
  | "spectrum" // "Where on the scale of X to Y?"
  | "scenario"; // Short situation with implied behaviour

export interface DiscoveryQuestion {
  id: string;
  type: QuestionType;
  text: string;
  targets: PrioritySignal[]; // Which signals this question helps populate
  options?: string[]; // For choice/contrast types
  spectrum_anchors?: { low: string; high: string }; // For spectrum types
  scenario_context?: string; // For scenario types
}

/** Raw signal extracted from a user answer */
export interface ExtractedSignal {
  signal: PrioritySignal;
  value: string;
  confidence: "high" | "medium" | "low";
  source_question_id: string;
}

/** Accumulated state of the discovery process */
export interface DiscoveryState {
  phase: "not_started" | "gathering" | "sufficient" | "complete";
  signals: ExtractedSignal[];
  questions_asked: string[];
  persona_purpose: string | null;
  persona_context: string | null;
}

/**
 * Check if we have sufficient signal to populate the scaffold coherently.
 * Implements the Signal Sufficiency Rule.
 */
export function hasSignalSufficiency(state: DiscoveryState): boolean {
  // Need at least purpose established
  if (!state.persona_purpose) return false;

  // Need at least 3 of 5 priority signals with medium+ confidence
  const strongSignals = state.signals.filter(
    (s) => s.confidence === "high" || s.confidence === "medium",
  );
  const strongCoverage = new Set(strongSignals.map((s) => s.signal));

  return strongCoverage.size >= 3;
}

/**
 * Determine which priority signals are still missing or weak.
 * Used to generate the next question.
 */
export function getMissingSignals(state: DiscoveryState): PrioritySignal[] {
  const covered = new Map<PrioritySignal, "high" | "medium" | "low">();

  for (const signal of state.signals) {
    const existing = covered.get(signal.signal);
    if (
      !existing ||
      (signal.confidence === "high" && existing !== "high") ||
      (signal.confidence === "medium" && existing === "low")
    ) {
      covered.set(signal.signal, signal.confidence);
    }
  }

  return PRIORITY_SIGNALS.filter((signal) => {
    const confidence = covered.get(signal);
    return !confidence || confidence === "low";
  });
}

/**
 * Create an initial empty discovery state.
 */
export function createDiscoveryState(): DiscoveryState {
  return {
    phase: "not_started",
    signals: [],
    questions_asked: [],
    persona_purpose: null,
    persona_context: null,
  };
}

/**
 * Core discovery question bank.
 * These are the minimal, high-leverage questions for discovery.
 * The engine selects from this bank based on which signals are missing.
 */
export const QUESTION_BANK: DiscoveryQuestion[] = [
  // Purpose establishment
  {
    id: "purpose_core",
    type: "choice",
    text: "What is this persona's primary job in a panel? Pick the closest fit.",
    targets: [],
    options: [
      "Challenge assumptions and surface risks",
      "Validate evidence and check rigour",
      "Push for progress and pragmatic outcomes",
      "Integrate perspectives and find common ground",
      "Set boundaries and flag what's out of scope",
    ],
  },

  // Discomfort triggers
  {
    id: "discomfort_scenario",
    type: "scenario",
    text: "A team presents a proposal with strong commercial upside but limited supporting data. How does this persona respond?",
    targets: ["discomfort_triggers", "evidence_change_thresholds"],
    scenario_context:
      "The proposal is time-sensitive. Waiting for more data means missing the window.",
  },

  // Evidence thresholds
  {
    id: "evidence_spectrum",
    type: "spectrum",
    text: "How much evidence does this persona need before accepting a conclusion?",
    targets: ["evidence_change_thresholds"],
    spectrum_anchors: {
      low: "Comfortable with directional signals and experienced judgement",
      high: "Requires documented evidence, tested assumptions, and verified sources",
    },
  },

  // Ambiguity handling
  {
    id: "ambiguity_contrast",
    type: "contrast",
    text: "When inputs are incomplete or messy, does this persona:",
    targets: ["ambiguity_handling"],
    options: [
      "Work with what's available and flag gaps as they go",
      "Stop and demand clarity before proceeding",
    ],
  },

  // Pressure behaviour
  {
    id: "pressure_scenario",
    type: "scenario",
    text: "The discussion is running long, the group is divided, and a decision is needed today. What does this persona do?",
    targets: ["pressure_behaviour", "deferral_preferences"],
    scenario_context:
      "Stakes are moderate. Both sides have reasonable arguments.",
  },

  // Deferral preferences
  {
    id: "deferral_contrast",
    type: "contrast",
    text: "When this persona reaches the edge of its expertise, does it:",
    targets: ["deferral_preferences"],
    options: [
      "State its limits clearly and recommend who should weigh in",
      "Offer its best judgement with caveats and keep the discussion moving",
    ],
  },

  // Risk appetite
  {
    id: "risk_spectrum",
    type: "spectrum",
    text: "Where does this persona sit on the risk spectrum?",
    targets: ["discomfort_triggers"],
    spectrum_anchors: {
      low: "Cautious — prefers proven approaches with clear downside protection",
      high: "Bold — comfortable with uncertainty if the potential upside justifies it",
    },
  },

  // Intervention frequency
  {
    id: "intervention_contrast",
    type: "contrast",
    text: "In a panel discussion, this persona tends to:",
    targets: ["pressure_behaviour"],
    options: [
      "Speak up frequently — challenges, clarifies, redirects as issues arise",
      "Stay quiet and intervene only when something material is at stake",
    ],
  },
];
