import { z } from "zod";
import { RubricProfileSchema } from "./rubric.js";
import { KnowledgeBaseSchema } from "./knowledge-base.js";

/**
 * Complete Persona Definition Schema
 *
 * This is the canonical schema for persona definition files.
 * Every field maps to a specific section of the persona specification.
 */

// Metadata
export const PersonaTypeSchema = z.enum(["designed", "human_derived"]);

export const PersonaMetadataSchema = z.object({
  name: z.string().min(1).describe("Persona display name"),
  type: PersonaTypeSchema.describe(
    "designed = created from scratch; human_derived = based on a real person's patterns",
  ),
  owner: z
    .string()
    .min(1)
    .describe("Person or team responsible for this persona"),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "Version must follow semver (e.g. 1.0.0)")
    .default("1.0.0"),
  last_updated: z.string().describe("ISO date or DD Mon YYYY format"),
  audience: z
    .string()
    .min(1)
    .describe("Intended consumers of this persona file"),
});

export type PersonaMetadata = z.infer<typeof PersonaMetadataSchema>;

// Persona Purpose & Panel Use
export const PersonaPurposeSchema = z.object({
  description: z.string().min(1).describe("What this persona is for"),
  invoke_when: z
    .array(z.string())
    .min(1)
    .describe("Conditions when this persona should be deliberately invoked"),
  do_not_invoke_when: z
    .array(z.string())
    .min(1)
    .describe("Conditions when this persona should NOT be used"),
});

export type PersonaPurpose = z.infer<typeof PersonaPurposeSchema>;

// Brief Bio & Context
export const PersonaBioSchema = z.object({
  background: z
    .string()
    .min(1)
    .describe("Short professional background (one paragraph)"),
  perspective_origin: z
    .string()
    .min(1)
    .describe("How this background shapes the persona's perspective"),
});

export type PersonaBio = z.infer<typeof PersonaBioSchema>;

// Panel Role & Functional Contribution
export const PanelRoleSchema = z.object({
  contribution_type: z
    .string()
    .min(1)
    .describe(
      "Primary function in a panel discussion (e.g. challenger, sense-checker, boundary-setter, integrator)",
    ),
  expected_value: z
    .string()
    .min(1)
    .describe("What this persona is intended to contribute when invoked"),
  failure_modes_surfaced: z
    .array(z.string())
    .min(1)
    .describe(
      "The specific kinds of errors, omissions, or unsafe assumptions this persona exists to detect",
    ),
});

export type PanelRole = z.infer<typeof PanelRoleSchema>;

// Reasoning & Decision Tendencies
export const ReasoningTendenciesSchema = z.object({
  default_assumptions: z
    .array(z.string())
    .min(1)
    .describe("The persona's default assumptions when entering a discussion"),
  notices_first: z
    .array(z.string())
    .min(1)
    .describe("Signals or issues the persona picks up on first"),
  systematically_questions: z
    .array(z.string())
    .min(1)
    .describe("Claims or proposals the persona systematically questions"),
  under_pressure: z
    .string()
    .min(1)
    .describe("How reasoning shifts under uncertainty or pressure"),
});

export type ReasoningTendencies = z.infer<typeof ReasoningTendenciesSchema>;

// Interaction & Challenge Style
export const InteractionStyleSchema = z.object({
  primary_mode: z
    .enum(["questions", "assertions", "mixed"])
    .describe(
      "Whether the persona primarily asks questions or makes assertions",
    ),
  challenge_strength: z
    .enum(["gentle", "moderate", "strong", "confrontational"])
    .describe("How strongly the persona challenges by default"),
  silent_when: z
    .array(z.string())
    .min(1)
    .describe("Conditions when the persona remains silent"),
  handles_poor_input: z
    .string()
    .min(1)
    .describe("How the persona handles poorly framed or incomplete input"),
});

export type InteractionStyle = z.infer<typeof InteractionStyleSchema>;

// Communication & Expression Style (Optional)
export const CommunicationStyleSchema = z
  .object({
    clarity_vs_brevity: z
      .enum(["clarity", "brevity", "balanced"])
      .describe("Preference between thoroughness and conciseness"),
    structure_preference: z
      .string()
      .optional()
      .describe(
        "Preferred response structure (e.g. bullet points, narrative, numbered)",
      ),
    tone_markers: z
      .array(z.string())
      .optional()
      .describe("Specific tone characteristics (e.g. dry, warm, clinical)"),
  })
  .optional();

export type CommunicationStyle = z.infer<typeof CommunicationStyleSchema>;

// Boundaries, Constraints & Refusals
export const BoundariesSchema = z.object({
  will_not_engage: z
    .array(z.string())
    .min(1)
    .describe("Topics or areas the persona will not engage on"),
  will_not_claim: z
    .array(z.string())
    .min(1)
    .describe("Claims the persona will not make"),
  defers_by_design: z
    .array(z.string())
    .min(1)
    .describe("Areas where the persona defers to others by design"),
});

export type Boundaries = z.infer<typeof BoundariesSchema>;

// Invocation Cues & Usage Notes
export const InvocationCuesSchema = z.object({
  include_when: z
    .array(z.string())
    .min(1)
    .describe(
      "Concrete conditions under which this persona should be included",
    ),
  exclude_when: z
    .array(z.string())
    .min(1)
    .describe(
      "Concrete conditions under which this persona should be excluded",
    ),
});

export type InvocationCues = z.infer<typeof InvocationCuesSchema>;

// Provenance & Version History
export const ProvenanceEntrySchema = z.object({
  version: z.string(),
  date: z.string(),
  author: z.string(),
  changes: z.array(z.string()).min(1),
});

export const SectionGenerationRecordSchema = z.object({
  section: z.string().describe("Population section name"),
  provider: z
    .string()
    .describe(
      "LLM provider that generated this section (or 'human' for direct input)",
    ),
  model: z.string().describe("Model identifier used"),
  timestamp: z.string().describe("ISO 8601 timestamp"),
  method: z
    .enum(["direct_input", "structured_choice", "scenario_based", "inference"])
    .describe("How this section was populated"),
  confidence: z.enum(["high", "medium", "low"]),
});

export type SectionGenerationRecord = z.infer<
  typeof SectionGenerationRecordSchema
>;

export const ProvenanceSchema = z
  .object({
    created_by: z.string().describe("Tool or process that created this file"),
    history: z.array(ProvenanceEntrySchema).optional(),
    section_generation: z
      .array(SectionGenerationRecordSchema)
      .optional()
      .describe("Per-section record of which LLM generated what"),
  })
  .optional();

export type Provenance = z.infer<typeof ProvenanceSchema>;

/**
 * The complete persona definition file schema.
 * This is the top-level validation for any persona file.
 */
export const PersonaFileSchema = z.object({
  metadata: PersonaMetadataSchema,
  purpose: PersonaPurposeSchema,
  bio: PersonaBioSchema,
  panel_role: PanelRoleSchema,
  rubric: RubricProfileSchema,
  reasoning: ReasoningTendenciesSchema,
  interaction: InteractionStyleSchema,
  communication: CommunicationStyleSchema,
  boundaries: BoundariesSchema,
  invocation: InvocationCuesSchema,
  knowledge_base: KnowledgeBaseSchema.optional(),
  provenance: ProvenanceSchema,
});

export type PersonaFile = z.infer<typeof PersonaFileSchema>;

/**
 * Validate a raw object against the PersonaFile schema.
 * Returns a discriminated result with either the validated data or structured errors.
 */
export function validatePersonaFile(data: unknown): {
  success: boolean;
  data?: PersonaFile;
  errors?: z.ZodError;
} {
  const result = PersonaFileSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
