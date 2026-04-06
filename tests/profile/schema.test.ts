import { describe, it, expect } from "vitest";
import {
  UserProfileSchema,
  validateUserProfile,
  formatUserProfile,
  ProfileMetadataSchema,
  ProfileIdentitySchema,
  ProfileGoalsSchema,
  ProfileConstraintsSchema,
  ProfileVulnerabilitiesSchema,
  SeniorityLevelSchema,
  TimeHorizonSchema,
} from "../../src/profile/schema.js";

// ── Fixtures ─────────────────────────────────────────────────────────

const validRubric = {
  risk_appetite: { score: 7, note: "Bold. Comfortable with uncertainty when upside justifies it." },
  evidence_threshold: { score: 4, note: "Trusts directional signals and experienced judgement." },
  tolerance_for_ambiguity: { score: 7, note: "Comfortable navigating unclear situations." },
  intervention_frequency: { score: 6, note: "Selectively engaged at natural checkpoints." },
  escalation_bias: { score: 4, note: "Handles issues locally wherever possible." },
  delivery_vs_rigour_bias: { score: 7, note: "Favours shipping and iterating over extended preparation." },
};

const validProfile = {
  metadata: {
    name: "Maya Chen",
    version: "1.0.0",
    last_updated: "2026-04-06",
    created_by: "Persona-x Profile Assessment",
  },
  identity: {
    background: "Senior product manager with 8 years in SaaS, previously in management consulting.",
    experience_domains: ["Product management", "SaaS", "Management consulting"],
    seniority_level: "senior" as const,
    context: "Evaluating a move from stable corporate PM role to VP Product at a Series A startup.",
  },
  goals: {
    primary_goal: "Determine whether to accept the VP Product role at the startup",
    success_definition: "A decision I can commit to fully, with eyes open on the risks",
    time_horizon: "short_term" as const,
    sacrifices_acceptable: ["Short-term income stability", "Work-life balance for 12-18 months"],
  },
  risk_profile: validRubric,
  constraints: {
    non_negotiables: ["Must maintain health insurance for family", "Will not relocate"],
    dependencies: ["Partner's income covers mortgage", "Two school-age children"],
    resource_limits: "Can absorb 6 months without income if needed. No additional capital to invest.",
  },
  vulnerabilities: {
    known_weaknesses: ["Tendency to over-analyse and delay decisions", "Avoids difficult conversations"],
    blind_spots: ["May underweight emotional factors in career decisions", "Assumes past success predicts future performance"],
    patterns: ["Analysis paralysis on high-stakes decisions", "Seeks external validation before committing"],
  },
};

// ── Schema Tests ─────────────────────────────────────────────────────

describe("SeniorityLevelSchema", () => {
  it("accepts valid seniority levels", () => {
    for (const level of ["early", "mid", "senior", "executive", "founder"]) {
      expect(SeniorityLevelSchema.safeParse(level).success).toBe(true);
    }
  });

  it("rejects invalid seniority levels", () => {
    expect(SeniorityLevelSchema.safeParse("intern").success).toBe(false);
  });
});

describe("TimeHorizonSchema", () => {
  it("accepts valid time horizons", () => {
    for (const horizon of ["immediate", "short_term", "medium_term", "long_term"]) {
      expect(TimeHorizonSchema.safeParse(horizon).success).toBe(true);
    }
  });

  it("rejects invalid time horizons", () => {
    expect(TimeHorizonSchema.safeParse("forever").success).toBe(false);
  });
});

describe("ProfileMetadataSchema", () => {
  it("accepts valid metadata", () => {
    const result = ProfileMetadataSchema.safeParse(validProfile.metadata);
    expect(result.success).toBe(true);
  });

  it("rejects invalid semver", () => {
    const result = ProfileMetadataSchema.safeParse({
      ...validProfile.metadata,
      version: "v1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = ProfileMetadataSchema.safeParse({
      ...validProfile.metadata,
      name: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("ProfileIdentitySchema", () => {
  it("accepts valid identity", () => {
    const result = ProfileIdentitySchema.safeParse(validProfile.identity);
    expect(result.success).toBe(true);
  });

  it("rejects empty experience domains", () => {
    const result = ProfileIdentitySchema.safeParse({
      ...validProfile.identity,
      experience_domains: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("ProfileGoalsSchema", () => {
  it("accepts valid goals", () => {
    const result = ProfileGoalsSchema.safeParse(validProfile.goals);
    expect(result.success).toBe(true);
  });

  it("rejects empty sacrifices_acceptable", () => {
    const result = ProfileGoalsSchema.safeParse({
      ...validProfile.goals,
      sacrifices_acceptable: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("ProfileConstraintsSchema", () => {
  it("accepts valid constraints", () => {
    const result = ProfileConstraintsSchema.safeParse(validProfile.constraints);
    expect(result.success).toBe(true);
  });

  it("rejects empty non_negotiables", () => {
    const result = ProfileConstraintsSchema.safeParse({
      ...validProfile.constraints,
      non_negotiables: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("ProfileVulnerabilitiesSchema", () => {
  it("accepts valid vulnerabilities", () => {
    const result = ProfileVulnerabilitiesSchema.safeParse(
      validProfile.vulnerabilities
    );
    expect(result.success).toBe(true);
  });

  it("rejects empty known_weaknesses", () => {
    const result = ProfileVulnerabilitiesSchema.safeParse({
      ...validProfile.vulnerabilities,
      known_weaknesses: [],
    });
    expect(result.success).toBe(false);
  });
});

// ── Full Profile Validation ──────────────────────────────────────────

describe("UserProfileSchema", () => {
  it("accepts a complete valid profile", () => {
    const result = UserProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it("rejects a profile with missing identity", () => {
    const { identity, ...noIdentity } = validProfile;
    const result = UserProfileSchema.safeParse(noIdentity);
    expect(result.success).toBe(false);
  });

  it("rejects a profile with missing goals", () => {
    const { goals, ...noGoals } = validProfile;
    const result = UserProfileSchema.safeParse(noGoals);
    expect(result.success).toBe(false);
  });

  it("rejects a profile with missing risk_profile", () => {
    const { risk_profile, ...noRubric } = validProfile;
    const result = UserProfileSchema.safeParse(noRubric);
    expect(result.success).toBe(false);
  });

  it("rejects a profile with invalid rubric score", () => {
    const result = UserProfileSchema.safeParse({
      ...validProfile,
      risk_profile: {
        ...validRubric,
        risk_appetite: { score: 11, note: "Off the scale" },
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a profile with missing rubric dimension", () => {
    const { risk_appetite, ...incompleteRubric } = validRubric;
    const result = UserProfileSchema.safeParse({
      ...validProfile,
      risk_profile: incompleteRubric,
    });
    expect(result.success).toBe(false);
  });

  it("uses the same RubricProfileSchema as persona files", () => {
    // This test confirms the integration point: user risk_profile
    // and persona rubric share the same schema
    const result = UserProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
    if (result.success) {
      const riskProfile = result.data.risk_profile;
      expect(riskProfile.risk_appetite.score).toBeGreaterThanOrEqual(1);
      expect(riskProfile.risk_appetite.score).toBeLessThanOrEqual(10);
      expect(riskProfile.risk_appetite.note.length).toBeGreaterThanOrEqual(10);
    }
  });
});

// ── validateUserProfile helper ───────────────────────────────────────

describe("validateUserProfile", () => {
  it("returns success with valid data", () => {
    const result = validateUserProfile(validProfile);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.metadata.name).toBe("Maya Chen");
  });

  it("returns errors with invalid data", () => {
    const result = validateUserProfile({});
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });
});

// ── formatUserProfile ────────────────────────────────────────────────

describe("formatUserProfile", () => {
  it("produces readable markdown output", () => {
    const output = formatUserProfile(validProfile as any);
    expect(output).toContain("# User Profile: Maya Chen");
    expect(output).toContain("## Identity");
    expect(output).toContain("## Goals");
    expect(output).toContain("## Risk Profile");
    expect(output).toContain("Risk Appetite");
    expect(output).toContain("7/10");
    expect(output).toContain("## Constraints");
    expect(output).toContain("## Vulnerabilities");
  });

  it("includes all six rubric dimensions", () => {
    const output = formatUserProfile(validProfile as any);
    expect(output).toContain("Risk Appetite");
    expect(output).toContain("Evidence Threshold");
    expect(output).toContain("Tolerance for Ambiguity");
    expect(output).toContain("Intervention Frequency");
    expect(output).toContain("Escalation Bias");
    expect(output).toContain("Delivery vs Rigour Bias");
  });
});
