import type { RubricDimensionName } from "../schema/rubric.js";
import type { SeniorityLevel } from "./schema.js";

export interface ArtifactSignal {
  dimension: RubricDimensionName;
  direction: "high" | "low" | "neutral";
  confidence: "high" | "medium" | "low";
  source: string;
  evidence: string;
}

export interface ParsedArtifact {
  type: "resume" | "linkedin" | "bio" | "unknown";
  identity: {
    background: string | null;
    experience_domains: string[];
    seniority_level: SeniorityLevel | null;
    context: string | null;
  };
  signals: ArtifactSignal[];
  raw_text: string;
}

const SENIORITY_KEYWORDS: Record<SeniorityLevel, string[]> = {
  early: [
    "junior",
    "graduate",
    "entry level",
    "intern",
    "associate",
    "assistant",
  ],
  mid: [
    "mid-level",
    "senior associate",
    "team lead",
    "specialist",
    "coordinator",
  ],
  senior: [
    "senior",
    "principal",
    "lead",
    "head of",
    "director",
    "manager",
  ],
  executive: [
    "vice president",
    "vp",
    "chief",
    "cto",
    "cfo",
    "coo",
    "cmo",
    "svp",
    "evp",
  ],
  founder: ["founder", "co-founder", "owner", "entrepreneur", "ceo"],
};

const DOMAIN_PATTERNS: Array<{ pattern: RegExp; domain: string }> = [
  { pattern: /\b(financ|banking|invest|capital|fund)\w*/i, domain: "Finance" },
  {
    pattern: /\b(technolog|software|engineer|develop|programm)\w*/i,
    domain: "Technology",
  },
  {
    pattern: /\b(marketing|brand|advertis|campaign|growth)\w*/i,
    domain: "Marketing",
  },
  {
    pattern: /\b(operat|logistics|supply chain|process|manufactur)\w*/i,
    domain: "Operations",
  },
  {
    pattern: /\b(legal|compliance|regulat|governance|policy)\w*/i,
    domain: "Legal & Compliance",
  },
  {
    pattern: /\b(human resources|hr|talent|recruit|people)\w*/i,
    domain: "Human Resources",
  },
  {
    pattern: /\b(consult|advisory|strateg|managem)\w*/i,
    domain: "Consulting & Strategy",
  },
  {
    pattern: /\b(health|medical|pharma|clinic|patient)\w*/i,
    domain: "Healthcare",
  },
  {
    pattern: /\b(educat|teach|academ|research|universit)\w*/i,
    domain: "Education & Research",
  },
  {
    pattern: /\b(sales|business develop|account|revenue)\w*/i,
    domain: "Sales & Business Development",
  },
  { pattern: /\b(design|ux|ui|creative|visual)\w*/i, domain: "Design" },
  {
    pattern: /\b(data|analy|machine learning|ai|artificial intelligen)\w*/i,
    domain: "Data & AI",
  },
];

const SIGNAL_PATTERNS: Array<{
  pattern: RegExp;
  dimension: RubricDimensionName;
  direction: "high" | "low";
  evidence_template: string;
}> = [
  {
    pattern: /\b(startup|venture|entrepreneuri?a?l?|founded|bootstrapped)\b/i,
    dimension: "risk_appetite",
    direction: "high",
    evidence_template: "Entrepreneurial experience suggests higher risk tolerance",
  },
  {
    pattern: /\b(compliance|audit|regulat|governance|risk management)\b/i,
    dimension: "risk_appetite",
    direction: "low",
    evidence_template: "Regulatory/compliance background suggests lower risk appetite",
  },
  {
    pattern: /\b(research|analy|data.driven|evidence.based|quantitative)\b/i,
    dimension: "evidence_threshold",
    direction: "high",
    evidence_template: "Analytical/research orientation suggests higher evidence requirements",
  },
  {
    pattern: /\b(agile|iterative|lean|pivot|adapt|flexible)\b/i,
    dimension: "tolerance_for_ambiguity",
    direction: "high",
    evidence_template: "Agile/adaptive methodology experience suggests higher ambiguity tolerance",
  },
  {
    pattern: /\b(waterfall|structured|process|standard|framework|procedure)\b/i,
    dimension: "tolerance_for_ambiguity",
    direction: "low",
    evidence_template: "Process-oriented approach suggests preference for clarity",
  },
  {
    pattern: /\b(hands.on|direct|lead|managed teams?|oversaw)\b/i,
    dimension: "intervention_frequency",
    direction: "high",
    evidence_template: "Hands-on leadership style suggests higher intervention frequency",
  },
  {
    pattern: /\b(delegat|empower|autonom|trust|independent)\b/i,
    dimension: "intervention_frequency",
    direction: "low",
    evidence_template: "Delegation-focused approach suggests lower intervention frequency",
  },
  {
    pattern: /\b(escalat|report|governance|board|oversight)\b/i,
    dimension: "escalation_bias",
    direction: "high",
    evidence_template: "Governance/reporting emphasis suggests higher escalation tendency",
  },
  {
    pattern: /\b(ship|deliver|launch|release|deploy|fast|velocity)\b/i,
    dimension: "delivery_vs_rigour_bias",
    direction: "high",
    evidence_template: "Delivery-focused language suggests bias toward speed over rigour",
  },
  {
    pattern: /\b(thorough|rigour|quality|precision|meticulous|detail)\b/i,
    dimension: "delivery_vs_rigour_bias",
    direction: "low",
    evidence_template: "Quality-focused language suggests bias toward rigour over speed",
  },
];

export function detectArtifactType(
  text: string
): "resume" | "linkedin" | "bio" | "unknown" {
  const lower = text.toLowerCase();
  if (
    lower.includes("linkedin") ||
    lower.includes("connections") ||
    lower.includes("endorsements")
  ) {
    return "linkedin";
  }
  if (
    lower.includes("curriculum vitae") ||
    lower.includes("resume") ||
    lower.includes("work experience") ||
    lower.includes("professional experience") ||
    lower.includes("education")
  ) {
    return "resume";
  }
  if (
    text.length < 1000 &&
    !lower.includes("work experience") &&
    !lower.includes("professional experience")
  ) {
    return "bio";
  }
  return "unknown";
}

export function inferSeniority(text: string): SeniorityLevel | null {
  const lower = text.toLowerCase();

  for (const level of [
    "founder",
    "executive",
    "senior",
    "mid",
    "early",
  ] as const) {
    for (const keyword of SENIORITY_KEYWORDS[level]) {
      if (lower.includes(keyword)) {
        return level;
      }
    }
  }
  return null;
}

export function extractDomains(text: string): string[] {
  const found = new Set<string>();
  for (const { pattern, domain } of DOMAIN_PATTERNS) {
    if (pattern.test(text)) {
      found.add(domain);
    }
  }
  return Array.from(found);
}

export function extractSignals(text: string): ArtifactSignal[] {
  const signals: ArtifactSignal[] = [];
  const dimensionCounts = new Map<RubricDimensionName, number>();

  for (const { pattern, dimension, direction, evidence_template } of SIGNAL_PATTERNS) {
    const matches = text.match(new RegExp(pattern, "gi"));
    if (matches && matches.length > 0) {
      const count = (dimensionCounts.get(dimension) ?? 0) + 1;
      dimensionCounts.set(dimension, count);

      const confidence =
        matches.length >= 3 ? "high" : matches.length >= 2 ? "medium" : "low";

      signals.push({
        dimension,
        direction,
        confidence,
        source: "artifact_text",
        evidence: evidence_template,
      });
    }
  }

  return signals;
}

export function parseArtifact(text: string): ParsedArtifact {
  const type = detectArtifactType(text);
  const domains = extractDomains(text);
  const seniority = inferSeniority(text);
  const signals = extractSignals(text);

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const background =
    sentences.length > 0
      ? sentences
          .slice(0, 3)
          .map((s) => s.trim())
          .join(". ") + "."
      : null;

  return {
    type,
    identity: {
      background,
      experience_domains: domains,
      seniority_level: seniority,
      context: null,
    },
    signals,
    raw_text: text,
  };
}
