import { describe, it, expect } from "vitest";
import {
  PersonaFileSchema,
  validatePersonaFile,
} from "../../src/schema/persona.js";
import {
  RubricProfileSchema,
  RubricScoreSchema,
  validateRubricCoherence,
} from "../../src/schema/rubric.js";

describe("RubricScoreSchema", () => {
  it("accepts valid scores with interpretive notes", () => {
    const result = RubricScoreSchema.safeParse({
      score: 7,
      note: "Intervenes regularly but picks moments for maximum impact",
    });
    expect(result.success).toBe(true);
  });

  it("rejects scores below 1", () => {
    const result = RubricScoreSchema.safeParse({
      score: 0,
      note: "Some note here for testing purposes",
    });
    expect(result.success).toBe(false);
  });

  it("rejects scores above 10", () => {
    const result = RubricScoreSchema.safeParse({
      score: 11,
      note: "Some note here for testing purposes",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing interpretive note", () => {
    const result = RubricScoreSchema.safeParse({ score: 5 });
    expect(result.success).toBe(false);
  });

  it("rejects empty interpretive note", () => {
    const result = RubricScoreSchema.safeParse({ score: 5, note: "" });
    expect(result.success).toBe(false);
  });

  it("rejects notes that are too short to be meaningful", () => {
    const result = RubricScoreSchema.safeParse({ score: 5, note: "ok" });
    expect(result.success).toBe(false);
  });
});

describe("RubricProfileSchema", () => {
  const validProfile = {
    risk_appetite: {
      score: 3,
      note: "Conservative approach to risk-taking in decisions",
    },
    evidence_threshold: {
      score: 8,
      note: "Requires documented evidence before accepting claims",
    },
    tolerance_for_ambiguity: {
      score: 4,
      note: "Uncomfortable with ambiguity, pushes for clarity",
    },
    intervention_frequency: {
      score: 7,
      note: "Intervenes regularly at high-impact moments",
    },
    escalation_bias: {
      score: 6,
      note: "Moderate escalation when regulatory risk involved",
    },
    delivery_vs_rigour_bias: {
      score: 3,
      note: "Strongly favours rigour over delivery speed",
    },
  };

  it("accepts a complete valid rubric profile", () => {
    const result = RubricProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it("rejects a profile missing a required dimension", () => {
    const { risk_appetite, ...incomplete } = validProfile;
    const result = RubricProfileSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it("requires all six dimensions", () => {
    const result = RubricProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("validateRubricCoherence", () => {
  it("warns about high risk appetite combined with high evidence threshold", () => {
    const profile = {
      risk_appetite: {
        score: 9,
        note: "Very bold risk taker in all situations",
      },
      evidence_threshold: {
        score: 9,
        note: "Requires extensive evidence for every claim",
      },
      tolerance_for_ambiguity: {
        score: 5,
        note: "Balanced approach to handling ambiguity",
      },
      intervention_frequency: {
        score: 5,
        note: "Moderate intervention in discussions",
      },
      escalation_bias: {
        score: 5,
        note: "Balanced approach to escalation decisions",
      },
      delivery_vs_rigour_bias: {
        score: 5,
        note: "Balanced between delivery and rigour",
      },
    };
    const warnings = validateRubricCoherence(profile);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("returns no warnings for a coherent profile", () => {
    const profile = {
      risk_appetite: {
        score: 3,
        note: "Conservative risk posture in all contexts",
      },
      evidence_threshold: {
        score: 8,
        note: "Requires documented evidence before proceeding",
      },
      tolerance_for_ambiguity: {
        score: 4,
        note: "Prefers clarity over operating with ambiguity",
      },
      intervention_frequency: {
        score: 7,
        note: "Intervenes at high-impact moments",
      },
      escalation_bias: {
        score: 6,
        note: "Escalates when material risk is present",
      },
      delivery_vs_rigour_bias: {
        score: 3,
        note: "Strongly favours thorough analysis",
      },
    };
    const warnings = validateRubricCoherence(profile);
    expect(warnings).toEqual([]);
  });
});

describe("validatePersonaFile", () => {
  const validPersona = {
    metadata: {
      name: "Test Persona",
      type: "designed",
      owner: "Test Suite",
      version: "1.0.0",
      last_updated: "2026-02-13",
      audience: "Panel tools",
    },
    purpose: {
      description: "A test persona for validation",
      invoke_when: ["Testing scenario"],
      do_not_invoke_when: ["Production use"],
    },
    bio: {
      background: "Created for testing the persona validation schema.",
      perspective_origin: "Test-driven perspective for schema validation.",
    },
    panel_role: {
      contribution_type: "validator",
      expected_value: "Validates that the schema enforcement works correctly",
      failure_modes_surfaced: ["Schema violations going undetected"],
    },
    rubric: {
      risk_appetite: { score: 5, note: "Balanced risk approach for testing" },
      evidence_threshold: { score: 5, note: "Moderate evidence requirements" },
      tolerance_for_ambiguity: {
        score: 5,
        note: "Balanced ambiguity tolerance",
      },
      intervention_frequency: {
        score: 5,
        note: "Moderate intervention pattern",
      },
      escalation_bias: { score: 5, note: "Balanced escalation tendency" },
      delivery_vs_rigour_bias: {
        score: 5,
        note: "Balanced delivery and rigour",
      },
    },
    reasoning: {
      default_assumptions: ["Input data may be invalid"],
      notices_first: ["Schema violations"],
      systematically_questions: ["Data completeness"],
      under_pressure: "Maintains validation rigour regardless of pressure",
    },
    interaction: {
      primary_mode: "assertions" as const,
      challenge_strength: "moderate" as const,
      silent_when: ["All validations pass"],
      handles_poor_input:
        "Reports specific validation errors with path and message",
    },
    boundaries: {
      will_not_engage: ["Runtime behaviour testing"],
      will_not_claim: ["That validation guarantees correctness"],
      defers_by_design: ["Integration testing to other tools"],
    },
    invocation: {
      include_when: ["Schema validation is needed"],
      exclude_when: ["No persona file is being processed"],
    },
  };

  it("accepts a complete valid persona file", () => {
    const result = validatePersonaFile(validPersona);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("rejects a persona file with missing metadata", () => {
    const { metadata, ...noMetadata } = validPersona;
    const result = validatePersonaFile(noMetadata);
    expect(result.success).toBe(false);
  });

  it("rejects a persona file with invalid version format", () => {
    const invalid = {
      ...validPersona,
      metadata: { ...validPersona.metadata, version: "v1" },
    };
    const result = validatePersonaFile(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a persona file with empty invoke_when", () => {
    const invalid = {
      ...validPersona,
      purpose: { ...validPersona.purpose, invoke_when: [] },
    };
    const result = validatePersonaFile(invalid);
    expect(result.success).toBe(false);
  });
});
