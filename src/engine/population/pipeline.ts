import type {
  PersonaFile,
  PersonaPurpose,
  PanelRole,
  ReasoningTendencies,
  InteractionStyle,
  Boundaries,
} from "../../schema/persona.js";
import type { RubricProfile } from "../../schema/rubric.js";
import type { DiscoveryState } from "../discovery/discovery.js";

/**
 * Population Pipeline
 *
 * Enforces the fixed population order and manages the state machine
 * that builds a persona file section by section.
 */

/**
 * The fixed population order.
 * Later sections must not contradict earlier ones without explicit confirmation.
 */
export const POPULATION_ORDER = [
  "purpose",       // Persona Purpose & Panel Use
  "panel_role",    // Panel Role & Functional Contribution
  "rubric",        // Judgement & Reasoning Profile
  "reasoning",     // Reasoning & Decision Tendencies
  "interaction",   // Interaction & Challenge Style
  "boundaries",    // Boundaries, Constraints & Refusals
  "optional",      // Communication, Knowledge Base, Provenance (optional sections)
] as const;

export type PopulationSection = (typeof POPULATION_ORDER)[number];

/** Permitted population methods */
export type PopulationMethod =
  | "direct_input"
  | "structured_choice"
  | "scenario_based"
  | "inference";

/** Record of how a section was populated */
export interface PopulationRecord {
  section: PopulationSection;
  method: PopulationMethod;
  confidence: "high" | "medium" | "low";
  source_signals: string[]; // Which discovery signals informed this section
  inferred: boolean;
  inference_justification?: string;
  /** Provider that produced this section (or "human" for direct input). */
  provider?: string;
  /** Model identifier used to generate this section. */
  model?: string;
  /** ISO 8601 timestamp when the section was captured. */
  timestamp?: string;
}

/** Current state of the pipeline */
export interface PipelineState {
  current_section_index: number;
  completed_sections: PopulationSection[];
  records: PopulationRecord[];
  partial_persona: Partial<PersonaFile>;
  discovery: DiscoveryState;
}

/**
 * Create an initial pipeline state from completed discovery.
 */
export function createPipelineState(
  discovery: DiscoveryState
): PipelineState {
  return {
    current_section_index: 0,
    completed_sections: [],
    records: [],
    partial_persona: {},
    discovery,
  };
}

/**
 * Get the current section that needs to be populated.
 */
export function getCurrentSection(
  state: PipelineState
): PopulationSection | null {
  if (state.current_section_index >= POPULATION_ORDER.length) {
    return null;
  }
  return POPULATION_ORDER[state.current_section_index] ?? null;
}

/**
 * Advance to the next section after completing the current one.
 */
export function advanceSection(state: PipelineState): PipelineState {
  const current = getCurrentSection(state);
  if (!current) return state;

  return {
    ...state,
    current_section_index: state.current_section_index + 1,
    completed_sections: [...state.completed_sections, current],
  };
}

/**
 * Record how a section was populated and add it to the partial persona.
 */
export function recordPopulation(
  state: PipelineState,
  section: PopulationSection,
  method: PopulationMethod,
  data: unknown,
  options: {
    confidence: "high" | "medium" | "low";
    source_signals: string[];
    inference_justification?: string;
    provider?: string;
    model?: string;
    timestamp?: string;
  }
): PipelineState {
  const record: PopulationRecord = {
    section,
    method,
    confidence: options.confidence,
    source_signals: options.source_signals,
    inferred: method === "inference",
    inference_justification: options.inference_justification,
    provider: options.provider,
    model: options.model,
    timestamp: options.timestamp ?? new Date().toISOString(),
  };

  const updatedPartial = { ...state.partial_persona };

  // Map population section to persona file keys
  switch (section) {
    case "purpose":
      updatedPartial.purpose = data as PersonaPurpose;
      break;
    case "panel_role":
      updatedPartial.panel_role = data as PanelRole;
      break;
    case "rubric":
      updatedPartial.rubric = data as RubricProfile;
      break;
    case "reasoning":
      updatedPartial.reasoning = data as ReasoningTendencies;
      break;
    case "interaction":
      updatedPartial.interaction = data as InteractionStyle;
      break;
    case "boundaries":
      updatedPartial.boundaries = data as Boundaries;
      break;
    case "optional":
      // Optional sections are handled individually
      break;
  }

  return {
    ...state,
    records: [...state.records, record],
    partial_persona: updatedPartial,
  };
}

/**
 * Check whether the pipeline should ask the user or infer.
 * Implements the Ask vs Infer Rule.
 */
export function shouldAskUser(
  section: PopulationSection,
  state: PipelineState
): boolean {
  // Always ask for boundaries — ask when "a boundary, refusal, or escalation posture is unclear"
  if (section === "boundaries") return true;

  // Always ask for purpose — foundational section
  if (section === "purpose") return true;

  // For rubric, check if we have sufficient scenario/signal data
  if (section === "rubric") {
    const signalCount = state.discovery.signals.filter(
      (s) => s.confidence === "high" || s.confidence === "medium"
    ).length;
    // Need at least 4 strong signals to infer rubric scores
    return signalCount < 4;
  }

  // For other sections, infer if we have high-confidence signals
  const relevantSignals = state.discovery.signals.filter(
    (s) => s.confidence === "high"
  );
  return relevantSignals.length < 2;
}

/**
 * Validate that the pipeline is complete — all required sections populated.
 */
export function isPipelineComplete(state: PipelineState): boolean {
  const required: PopulationSection[] = [
    "purpose",
    "panel_role",
    "rubric",
    "reasoning",
    "interaction",
    "boundaries",
  ];

  return required.every((section) =>
    state.completed_sections.includes(section)
  );
}

/**
 * Convert pipeline records into the SectionGenerationRecord[] shape
 * expected by the persona file's provenance.section_generation field.
 * Records missing provider/model (e.g. direct input before an LLM runs)
 * are emitted with provider="human" and model="n/a" so the audit trail
 * is still complete.
 */
export function buildSectionGenerationProvenance(
  state: PipelineState
): Array<{
  section: string;
  provider: string;
  model: string;
  timestamp: string;
  method: PopulationMethod;
  confidence: "high" | "medium" | "low";
}> {
  return state.records.map((record) => ({
    section: record.section,
    provider:
      record.provider ??
      (record.method === "direct_input" ? "human" : "unknown"),
    model:
      record.model ?? (record.method === "direct_input" ? "n/a" : "unknown"),
    timestamp: record.timestamp ?? new Date().toISOString(),
    method: record.method,
    confidence: record.confidence,
  }));
}

/**
 * Generate a build trace summarising how the persona was constructed.
 * This replaces the overloaded DJM with a focused construction record.
 */
export function generateBuildTrace(state: PipelineState): string {
  const lines: string[] = [
    "# Build Trace",
    "",
    `Sections populated: ${state.completed_sections.length}/${POPULATION_ORDER.length}`,
    "",
  ];

  for (const record of state.records) {
    lines.push(`## ${record.section}`);
    lines.push(`- Method: ${record.method}`);
    lines.push(`- Confidence: ${record.confidence}`);
    if (record.inferred && record.inference_justification) {
      lines.push(`- Inference: ${record.inference_justification}`);
    }
    lines.push(`- Source signals: ${record.source_signals.join(", ") || "none"}`);
    lines.push("");
  }

  return lines.join("\n");
}
