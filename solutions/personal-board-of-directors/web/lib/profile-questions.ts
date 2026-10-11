import type { ProfileQuestion, ProfileQuestionResponse, RubricScoreDisplay } from "./types";

const RUBRIC_DIMENSIONS = [
  "risk_appetite",
  "evidence_threshold",
  "tolerance_for_ambiguity",
  "intervention_frequency",
  "escalation_bias",
  "delivery_vs_rigour_bias",
] as const;

type RubricDimensionName = (typeof RUBRIC_DIMENSIONS)[number];

export type RubricProfile = Record<RubricDimensionName, RubricScoreDisplay>;

const NOTE_TEMPLATES: Record<RubricDimensionName, { low: string; mid: string; high: string }> = {
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

function generateInterpretiveNote(dimension: RubricDimensionName, score: number): string {
  const templates = NOTE_TEMPLATES[dimension];
  if (score <= 3) return templates.low;
  if (score <= 7) return templates.mid;
  return templates.high;
}

export function scoreResponses(responses: ProfileQuestionResponse[]): RubricProfile {
  const accumulators = new Map<RubricDimensionName, { total: number; count: number }>();

  for (const dim of RUBRIC_DIMENSIONS) {
    accumulators.set(dim, { total: 0, count: 0 });
  }

  for (const response of responses) {
    const question = PROFILE_QUESTION_BANK.find((q) => q.id === response.question_id);
    if (!question) continue;

    const optionIndex = response.selected_option;
    if (optionIndex < 0 || optionIndex >= question.options.length) continue;

    const option = question.options[optionIndex]!;

    for (const [dim, score] of Object.entries(option.scores)) {
      if (score === undefined) continue;
      const acc = accumulators.get(dim as RubricDimensionName);
      if (acc) {
        acc.total += score;
        acc.count += 1;
      }
    }
  }

  const profile = {} as Record<string, RubricScoreDisplay>;

  for (const dim of RUBRIC_DIMENSIONS) {
    const acc = accumulators.get(dim)!;
    const raw = acc.count > 0 ? acc.total / acc.count : 5;
    const score = Math.max(1, Math.min(10, Math.round(raw)));
    profile[dim] = {
      score,
      note: generateInterpretiveNote(dim, score),
    };
  }

  return profile as RubricProfile;
}

export const PROFILE_QUESTION_BANK: ProfileQuestion[] = [
  {
    id: "risk_evidence_01",
    category: "Risk & Evidence",
    scenario:
      "A promising opportunity lands on your desk with strong potential upside but limited data to back it up. The window closes in 48 hours.",
    context:
      "You have enough capital to absorb a loss, but not enough data to model the downside precisely.",
    options: [
      { label: "Pass — insufficient data to make a sound decision", scores: { risk_appetite: 2, evidence_threshold: 9 } },
      { label: "Commission a rapid analysis and decide when results come in, even if the window narrows", scores: { risk_appetite: 4, evidence_threshold: 7 } },
      { label: "Take a partial position to limit downside while keeping the option open", scores: { risk_appetite: 7, evidence_threshold: 4 } },
      { label: "Move decisively — the opportunity cost of waiting outweighs the data gap", scores: { risk_appetite: 9, evidence_threshold: 2 } },
    ],
  },
  {
    id: "risk_evidence_02",
    category: "Risk & Evidence",
    scenario:
      "Your team proposes a significant strategic pivot. Their presentation is compelling but relies heavily on anecdotal evidence and market intuition.",
    context:
      "The current strategy is safe but showing diminishing returns. Competitor activity suggests the market is shifting.",
    options: [
      { label: "Reject the pivot until they bring quantitative market research and financial modelling", scores: { risk_appetite: 2, evidence_threshold: 9 } },
      { label: "Ask for a structured pilot with defined metrics before committing fully", scores: { risk_appetite: 5, evidence_threshold: 6 } },
      { label: "Approve a time-boxed experiment with limited resources to test the thesis", scores: { risk_appetite: 7, evidence_threshold: 4 } },
      { label: "Back the pivot — market intuition from experienced operators is evidence enough", scores: { risk_appetite: 9, evidence_threshold: 2 } },
    ],
  },
  {
    id: "evidence_rigour_01",
    category: "Evidence & Rigour",
    scenario:
      "You receive a consultant's report recommending a major operational change. The methodology section is thin but the conclusions align with your instincts.",
    context:
      "The change would affect 200+ people. Reversing it would take 6 months.",
    options: [
      { label: "Send the report back — you need to understand the methodology before acting on conclusions", scores: { evidence_threshold: 9, delivery_vs_rigour_bias: 2 } },
      { label: "Accept the conclusions provisionally but commission an independent review before implementation", scores: { evidence_threshold: 7, delivery_vs_rigour_bias: 4 } },
      { label: "Start planning implementation while requesting methodology clarification in parallel", scores: { evidence_threshold: 4, delivery_vs_rigour_bias: 7 } },
      { label: "Move forward — the conclusions match reality and waiting for perfect methodology is a luxury", scores: { evidence_threshold: 2, delivery_vs_rigour_bias: 9 } },
    ],
  },
  {
    id: "ambiguity_01",
    category: "Ambiguity & Clarity",
    scenario:
      "You are leading a project where the client keeps changing requirements. The team is frustrated and progress is stalling.",
    context:
      "The client is important to the business. Pushing back too hard risks the relationship.",
    options: [
      { label: "Halt work and demand a formal requirements freeze before continuing", scores: { tolerance_for_ambiguity: 2, intervention_frequency: 9 } },
      { label: "Escalate to the client's leadership requesting a single point of decision", scores: { tolerance_for_ambiguity: 4, intervention_frequency: 7 } },
      { label: "Absorb the changes into an agile backlog and reprioritise each sprint", scores: { tolerance_for_ambiguity: 7, intervention_frequency: 4 } },
      { label: "Adapt on the fly — shifting requirements are normal and the team should learn to roll with them", scores: { tolerance_for_ambiguity: 9, intervention_frequency: 2 } },
    ],
  },
  {
    id: "ambiguity_02",
    category: "Ambiguity & Clarity",
    scenario:
      "You are asked to make a hiring decision for a critical role. Two finalists are close, and your team is split.",
    context:
      "The role has been open for 3 months. Each additional week costs the team productivity.",
    options: [
      { label: "Run additional assessment rounds until a clear winner emerges", scores: { tolerance_for_ambiguity: 2, delivery_vs_rigour_bias: 2 } },
      { label: "Define the three most critical criteria and score both candidates objectively", scores: { tolerance_for_ambiguity: 4, delivery_vs_rigour_bias: 4 } },
      { label: "Pick the one whose strengths best match the immediate project needs", scores: { tolerance_for_ambiguity: 7, delivery_vs_rigour_bias: 7 } },
      { label: "Trust your gut — both are qualified, and speed of decision matters more than marginal differences", scores: { tolerance_for_ambiguity: 9, delivery_vs_rigour_bias: 9 } },
    ],
  },
  {
    id: "intervention_01",
    category: "Intervention & Delegation",
    scenario:
      "A direct report is managing a high-stakes client relationship. You hear through informal channels that the client is unhappy but your report says everything is fine.",
    context:
      "Intervening risks undermining your report's authority. Not intervening risks losing the client.",
    options: [
      { label: "Contact the client directly to assess the situation yourself", scores: { intervention_frequency: 9, escalation_bias: 7 } },
      { label: "Have a direct conversation with your report sharing what you have heard and ask for their honest assessment", scores: { intervention_frequency: 7, escalation_bias: 4 } },
      { label: "Ask a peer to check in with the client casually to get an independent read", scores: { intervention_frequency: 4, escalation_bias: 5 } },
      { label: "Trust your report — they are closest to the situation and you hired them for a reason", scores: { intervention_frequency: 2, escalation_bias: 2 } },
    ],
  },
  {
    id: "intervention_02",
    category: "Intervention & Delegation",
    scenario:
      "During a board presentation, a colleague presents data you believe is materially misleading. Correcting them publicly would be awkward.",
    context:
      "The board is about to make a funding decision based on this data. Your colleague outranks you.",
    options: [
      { label: "Raise it immediately in the meeting — accuracy matters more than comfort", scores: { intervention_frequency: 9, escalation_bias: 8 } },
      { label: "Ask a clarifying question that surfaces the discrepancy without direct confrontation", scores: { intervention_frequency: 7, escalation_bias: 5 } },
      { label: "Note it and raise it privately with your colleague after the meeting", scores: { intervention_frequency: 4, escalation_bias: 3 } },
      { label: "Let it go — they may have context you do not, and the board will do its own due diligence", scores: { intervention_frequency: 2, escalation_bias: 2 } },
    ],
  },
  {
    id: "escalation_01",
    category: "Escalation & Boundaries",
    scenario:
      "A compliance issue surfaces in a project you oversee. It is likely technical rather than substantive, but you are not certain.",
    context:
      "Escalating triggers a formal review process that will delay the project by 3 weeks. Not escalating leaves you personally accountable if it turns out to be substantive.",
    options: [
      { label: "Escalate immediately — compliance ambiguity always gets escalated", scores: { escalation_bias: 9, risk_appetite: 2 } },
      { label: "Consult the compliance team informally before deciding whether to trigger the formal process", scores: { escalation_bias: 6, risk_appetite: 4 } },
      { label: "Document the issue, apply a fix, and flag it in the next regular review cycle", scores: { escalation_bias: 4, risk_appetite: 6 } },
      { label: "Fix it and move on — this is clearly technical and the formal process would be disproportionate", scores: { escalation_bias: 2, risk_appetite: 9 } },
    ],
  },
  {
    id: "speed_rigour_01",
    category: "Speed vs Thoroughness",
    scenario:
      "A product launch is scheduled for next week. QA has found minor issues that are unlikely to affect users but technically violate your quality standards.",
    context:
      "Delaying costs $50K per day in marketing spend already committed. The issues are cosmetic, not functional.",
    options: [
      { label: "Delay the launch — standards exist for a reason and exceptions become precedents", scores: { delivery_vs_rigour_bias: 2, risk_appetite: 2 } },
      { label: "Launch with a documented exception and a committed fix date within 2 weeks", scores: { delivery_vs_rigour_bias: 6, risk_appetite: 5 } },
      { label: "Launch now, fix in the first patch — users will not notice these issues", scores: { delivery_vs_rigour_bias: 8, risk_appetite: 7 } },
      { label: "Launch immediately — the commercial cost of delay far outweighs cosmetic imperfections", scores: { delivery_vs_rigour_bias: 9, risk_appetite: 9 } },
    ],
  },
  {
    id: "speed_rigour_02",
    category: "Speed vs Thoroughness",
    scenario:
      "You need to submit a proposal to a potential partner. You have a solid draft but limited time to refine it.",
    context:
      "The partner has indicated other parties are interested. Submitting early shows eagerness; submitting late shows thoroughness.",
    options: [
      { label: "Take the full time available — a polished proposal demonstrates professionalism and rigour", scores: { delivery_vs_rigour_bias: 2, evidence_threshold: 8 } },
      { label: "Refine the key sections and submit a day early with a note that supplementary detail can follow", scores: { delivery_vs_rigour_bias: 5, evidence_threshold: 6 } },
      { label: "Submit the solid draft now — the substance is there and speed signals commitment", scores: { delivery_vs_rigour_bias: 8, evidence_threshold: 3 } },
      { label: "Send a brief expression of interest immediately, with the full proposal to follow within 24 hours", scores: { delivery_vs_rigour_bias: 7, evidence_threshold: 5 } },
    ],
  },
  {
    id: "risk_escalation_01",
    category: "Risk & Escalation",
    scenario:
      "A key supplier notifies you of potential delays that could affect a major delivery. The probability is uncertain — they estimate 30%.",
    context:
      "You have alternative suppliers but switching mid-project adds cost and complexity. Your client expects on-time delivery.",
    options: [
      { label: "Notify the client immediately and begin activating the alternative supplier", scores: { risk_appetite: 2, escalation_bias: 9 } },
      { label: "Prepare a contingency plan with the alternative supplier but hold off on client notification until probability exceeds 50%", scores: { risk_appetite: 4, escalation_bias: 5 } },
      { label: "Monitor the situation closely with weekly check-ins and only act if the delay materialises", scores: { risk_appetite: 7, escalation_bias: 3 } },
      { label: "Accept the risk — 30% is low, switching suppliers is expensive, and the current one will likely deliver", scores: { risk_appetite: 9, escalation_bias: 2 } },
    ],
  },
  {
    id: "ambiguity_speed_01",
    category: "Ambiguity & Speed",
    scenario:
      "Your organisation is restructuring and your role is uncertain. You have been asked to continue delivering while the new structure is finalised.",
    context:
      "Some colleagues are pausing work until clarity emerges. Others are positioning for new roles. Deliverables are still expected.",
    options: [
      { label: "Pause discretionary work and focus only on contractual obligations until the structure is clear", scores: { tolerance_for_ambiguity: 2, delivery_vs_rigour_bias: 3 } },
      { label: "Continue current work but avoid starting anything new that might not survive the restructure", scores: { tolerance_for_ambiguity: 4, delivery_vs_rigour_bias: 5 } },
      { label: "Keep delivering at full pace — demonstrating value during uncertainty is how you secure your position", scores: { tolerance_for_ambiguity: 7, delivery_vs_rigour_bias: 8 } },
      { label: "Use the ambiguity as an opportunity to shape the new structure by taking initiative on visible projects", scores: { tolerance_for_ambiguity: 9, delivery_vs_rigour_bias: 7 } },
    ],
  },
];
