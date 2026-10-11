import { z } from "zod";
import { RubricProfileSchema } from "../schema/rubric.js";
import { RUBRIC_DIMENSION_LABELS, type RubricDimensionName } from "../schema/rubric.js";

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

export const UserIdentitySchema = z.object({
  background: z
    .string()
    .min(1)
    .describe("Professional background summary"),
  experience_domains: z
    .array(z.string())
    .min(1)
    .describe("Key areas of expertise or experience"),
  seniority_level: SeniorityLevelSchema.describe(
    "Current career seniority level"
  ),
  context: z
    .string()
    .min(1)
    .describe("Current situation or role context"),
});
export type UserIdentity = z.infer<typeof UserIdentitySchema>;

export const UserGoalsSchema = z.object({
  primary_goal: z
    .string()
    .min(1)
    .describe("The main objective being brought to the board"),
  success_definition: z
    .string()
    .min(1)
    .describe("What success looks like for this goal"),
  time_horizon: TimeHorizonSchema.describe(
    "Expected timeframe for achieving the goal"
  ),
  sacrifices_acceptable: z
    .array(z.string())
    .min(1)
    .describe("What the user is willing to trade off"),
});
export type UserGoals = z.infer<typeof UserGoalsSchema>;

export const UserConstraintsSchema = z.object({
  non_negotiables: z
    .array(z.string())
    .min(1)
    .describe("Hard constraints that cannot be compromised"),
  dependencies: z
    .array(z.string())
    .describe("External factors the outcome depends on"),
  resource_limits: z
    .string()
    .min(1)
    .describe("Budget, time, or capacity constraints"),
});
export type UserConstraints = z.infer<typeof UserConstraintsSchema>;

export const UserVulnerabilitiesSchema = z.object({
  known_weaknesses: z
    .array(z.string())
    .min(1)
    .describe("Self-identified areas of weakness"),
  blind_spots: z
    .array(z.string())
    .describe("Areas the user may not see clearly"),
  patterns: z
    .array(z.string())
    .describe("Recurring behavioural patterns under pressure"),
});
export type UserVulnerabilities = z.infer<typeof UserVulnerabilitiesSchema>;

export const UserProfileMetadataSchema = z.object({
  name: z.string().min(1).describe("User display name"),
  created_at: z.string().describe("ISO date of profile creation"),
  last_updated: z.string().describe("ISO date of last update"),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "Version must follow semver (e.g. 1.0.0)")
    .default("1.0.0"),
});
export type UserProfileMetadata = z.infer<typeof UserProfileMetadataSchema>;

export const UserProfileSchema = z.object({
  metadata: UserProfileMetadataSchema,
  identity: UserIdentitySchema,
  goals: UserGoalsSchema,
  risk_profile: RubricProfileSchema,
  constraints: UserConstraintsSchema,
  vulnerabilities: UserVulnerabilitiesSchema,
  provenance: z
    .object({
      sources: z
        .array(z.string())
        .describe("What inputs were used to build this profile"),
      questionnaire_version: z.string().optional(),
    })
    .optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

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

export function formatUserProfile(profile: UserProfile): string {
  const lines: string[] = [];

  lines.push(`# ${profile.metadata.name} — User Profile`);
  lines.push("");
  lines.push(`**Version:** ${profile.metadata.version}`);
  lines.push(`**Last Updated:** ${profile.metadata.last_updated}`);
  lines.push("");

  lines.push("## Identity");
  lines.push(`**Background:** ${profile.identity.background}`);
  lines.push(`**Seniority:** ${profile.identity.seniority_level}`);
  lines.push(
    `**Domains:** ${profile.identity.experience_domains.join(", ")}`
  );
  lines.push(`**Context:** ${profile.identity.context}`);
  lines.push("");

  lines.push("## Goals");
  lines.push(`**Primary Goal:** ${profile.goals.primary_goal}`);
  lines.push(`**Success Definition:** ${profile.goals.success_definition}`);
  lines.push(`**Time Horizon:** ${profile.goals.time_horizon}`);
  lines.push(
    `**Acceptable Sacrifices:** ${profile.goals.sacrifices_acceptable.join("; ")}`
  );
  lines.push("");

  lines.push("## Risk Profile");
  const dimensions = Object.keys(
    profile.risk_profile
  ) as RubricDimensionName[];
  for (const dim of dimensions) {
    const score = profile.risk_profile[dim];
    const label = RUBRIC_DIMENSION_LABELS[dim];
    lines.push(`- **${label}:** ${score.score}/10 — ${score.note}`);
  }
  lines.push("");

  lines.push("## Constraints");
  lines.push(
    `**Non-negotiables:** ${profile.constraints.non_negotiables.join("; ")}`
  );
  lines.push(
    `**Dependencies:** ${profile.constraints.dependencies.join("; ")}`
  );
  lines.push(`**Resource Limits:** ${profile.constraints.resource_limits}`);
  lines.push("");

  lines.push("## Vulnerabilities");
  lines.push(
    `**Known Weaknesses:** ${profile.vulnerabilities.known_weaknesses.join("; ")}`
  );
  lines.push(
    `**Blind Spots:** ${profile.vulnerabilities.blind_spots.join("; ")}`
  );
  lines.push(
    `**Patterns:** ${profile.vulnerabilities.patterns.join("; ")}`
  );

  return lines.join("\n");
}
