import { z } from "zod";
import { RubricProfileSchema } from "../schema/rubric.js";

/**
 * User Profile Schema
 *
 * A structured artefact that captures who the user is, what they want,
 * and how they make decisions. The risk_profile uses the same six-dimension
 * rubric as every board persona, making the user directly comparable.
 *
 * This is NOT a persona file — it is a separate artefact type that
 * informs advocate generation and board session context.
 */

// ── Seniority & Time Horizon ─────────────────────────────────────────

export const SeniorityLevelSchema = z.enum([
  "early",
  "mid",
  "senior",
  "executive",
  "founder",
]);

export type SeniorityLevel = z.infer<typeof SeniorityLevelSchema>;

export const TimeHorizonSchema = z.enum([
  "immediate",
  "short_term",
  "medium_term",
  "long_term",
]);

export type TimeHorizon = z.infer<typeof TimeHorizonSchema>;

// ── Profile Metadata ─────────────────────────────────────────────────

export const ProfileMetadataSchema = z.object({
  name: z.string().min(1).describe("User's name or profile identifier"),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "Version must follow semver (e.g. 1.0.0)")
    .default("1.0.0"),
  last_updated: z.string().describe("ISO date of last update"),
  created_by: z
    .string()
    .min(1)
    .describe("Tool or process that created this profile"),
});

export type ProfileMetadata = z.infer<typeof ProfileMetadataSchema>;

// ── Identity & Background ────────────────────────────────────────────

export const ProfileIdentitySchema = z.object({
  background: z
    .string()
    .min(1)
    .describe(
      "Professional and personal summary — who the user is and where they come from"
    ),
  experience_domains: z
    .array(z.string())
    .min(1)
    .describe("Industries, disciplines, or domains where the user has experience"),
  seniority_level: SeniorityLevelSchema.describe(
    "Current career stage or organisational level"
  ),
  context: z
    .string()
    .min(1)
    .describe("Current situation — what is happening in the user's life or career right now"),
});

export type ProfileIdentity = z.infer<typeof ProfileIdentitySchema>;

// ── Goals & Aspirations ──────────────────────────────────────────────

export const ProfileGoalsSchema = z.object({
  primary_goal: z
    .string()
    .min(1)
    .describe("The main decision, opportunity, or outcome the user is pursuing"),
  success_definition: z
    .string()
    .min(1)
    .describe("What good looks like — how the user would know they succeeded"),
  time_horizon: TimeHorizonSchema.describe(
    "How far out the user is thinking for this goal"
  ),
  sacrifices_acceptable: z
    .array(z.string())
    .min(1)
    .describe("What the user is willing to give up or trade off to reach their goal"),
});

export type ProfileGoals = z.infer<typeof ProfileGoalsSchema>;

// ── Constraints & Non-Negotiables ────────────────────────────────────

export const ProfileConstraintsSchema = z.object({
  non_negotiables: z
    .array(z.string())
    .min(1)
    .describe("Hard boundaries the user will not cross regardless of upside"),
  dependencies: z
    .array(z.string())
    .min(1)
    .describe(
      "People, commitments, or obligations that constrain the user's choices"
    ),
  resource_limits: z
    .string()
    .min(1)
    .describe(
      "Financial, time, or energy constraints that shape what is realistic"
    ),
});

export type ProfileConstraints = z.infer<typeof ProfileConstraintsSchema>;

// ── Vulnerabilities & Blind Spots ────────────────────────────────────

export const ProfileVulnerabilitiesSchema = z.object({
  known_weaknesses: z
    .array(z.string())
    .min(1)
    .describe("Self-identified weaknesses or areas where the user struggles"),
  blind_spots: z
    .array(z.string())
    .min(1)
    .describe(
      "Patterns or gaps the user may not see — inferred from artefacts and questionnaire responses"
    ),
  patterns: z
    .array(z.string())
    .min(1)
    .describe(
      "Recurring decision tendencies — e.g. over-committing, avoiding confrontation, analysis paralysis"
    ),
});

export type ProfileVulnerabilities = z.infer<typeof ProfileVulnerabilitiesSchema>;

// ── Provenance ───────────────────────────────────────────────────────

export const ProfileProvenanceEntrySchema = z.object({
  version: z.string(),
  date: z.string(),
  author: z.string(),
  changes: z.array(z.string()).min(1),
});

export const ProfileProvenanceSchema = z
  .object({
    created_by: z
      .string()
      .describe("Tool or process that created this profile"),
    history: z.array(ProfileProvenanceEntrySchema).optional(),
  })
  .optional();

export type ProfileProvenance = z.infer<typeof ProfileProvenanceSchema>;

// ── Complete User Profile ────────────────────────────────────────────

/**
 * The complete user profile schema.
 *
 * risk_profile uses the identical RubricProfileSchema from the persona
 * framework — same six dimensions, same 1-10 scale, same mandatory
 * interpretive notes. This makes user profiles directly comparable to
 * every board persona.
 */
export const UserProfileSchema = z.object({
  metadata: ProfileMetadataSchema,
  identity: ProfileIdentitySchema,
  goals: ProfileGoalsSchema,
  risk_profile: RubricProfileSchema,
  constraints: ProfileConstraintsSchema,
  vulnerabilities: ProfileVulnerabilitiesSchema,
  provenance: ProfileProvenanceSchema,
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * Validate raw data against the UserProfile schema.
 * Returns a discriminated result with either validated data or structured errors.
 */
export function validateUserProfile(data: unknown): {
  success: boolean;
  data?: UserProfile;
  errors?: z.ZodError;
} {
  const result = UserProfileSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Format a user profile for human-readable display.
 */
export function formatUserProfile(profile: UserProfile): string {
  const lines: string[] = [
    `# User Profile: ${profile.metadata.name}`,
    `Version ${profile.metadata.version} | Updated ${profile.metadata.last_updated}`,
    "",
    "## Identity",
    profile.identity.background,
    "",
    `**Experience**: ${profile.identity.experience_domains.join(", ")}`,
    `**Level**: ${profile.identity.seniority_level}`,
    `**Current situation**: ${profile.identity.context}`,
    "",
    "## Goals",
    `**Primary goal**: ${profile.goals.primary_goal}`,
    `**Success looks like**: ${profile.goals.success_definition}`,
    `**Time horizon**: ${profile.goals.time_horizon}`,
    `**Willing to sacrifice**: ${profile.goals.sacrifices_acceptable.join("; ")}`,
    "",
    "## Risk Profile",
  ];

  const dimensionLabels: Record<string, string> = {
    risk_appetite: "Risk Appetite",
    evidence_threshold: "Evidence Threshold",
    tolerance_for_ambiguity: "Tolerance for Ambiguity",
    intervention_frequency: "Intervention Frequency",
    escalation_bias: "Escalation Bias",
    delivery_vs_rigour_bias: "Delivery vs Rigour Bias",
  };

  for (const [key, label] of Object.entries(dimensionLabels)) {
    const score =
      profile.risk_profile[key as keyof typeof profile.risk_profile];
    const bar = "\u2588".repeat(score.score) + "\u2591".repeat(10 - score.score);
    lines.push(`**${label}**: ${bar} ${score.score}/10`);
    lines.push(`  ${score.note}`);
    lines.push("");
  }

  lines.push(
    "## Constraints",
    `**Non-negotiables**: ${profile.constraints.non_negotiables.join("; ")}`,
    `**Dependencies**: ${profile.constraints.dependencies.join("; ")}`,
    `**Resource limits**: ${profile.constraints.resource_limits}`,
    "",
    "## Vulnerabilities",
    `**Known weaknesses**: ${profile.vulnerabilities.known_weaknesses.join("; ")}`,
    `**Blind spots**: ${profile.vulnerabilities.blind_spots.join("; ")}`,
    `**Patterns**: ${profile.vulnerabilities.patterns.join("; ")}`
  );

  return lines.join("\n");
}
