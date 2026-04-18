import { describe, it, expect } from "vitest";
import {
  createPanelSession,
  determineSpeakingOrder,
  shouldPersonaContribute,
} from "../../src/runtime/panel.js";
import { generatePersonaSystemPrompt } from "../../src/runtime/interface.js";
import type {
  LoadedPersona,
  PanelConfig,
} from "../../src/runtime/interface.js";
import type { PersonaFile } from "../../src/schema/persona.js";

function createTestPersona(
  name: string,
  interventionScore: number,
): LoadedPersona {
  const file: PersonaFile = {
    metadata: {
      name,
      type: "designed",
      owner: "Test",
      version: "1.0.0",
      last_updated: "2026-02-13",
      audience: "Tests",
    },
    purpose: {
      description: `Test persona: ${name}`,
      invoke_when: ["Testing"],
      do_not_invoke_when: ["Production"],
    },
    bio: {
      background: "Test background for panel testing.",
      perspective_origin: "Created for unit testing purposes.",
    },
    panel_role: {
      contribution_type: "test",
      expected_value: "Validates panel mechanics",
      failure_modes_surfaced: ["Test failures"],
    },
    rubric: {
      risk_appetite: { score: 5, note: "Balanced risk for testing" },
      evidence_threshold: { score: 5, note: "Moderate evidence needs" },
      tolerance_for_ambiguity: {
        score: 5,
        note: "Balanced ambiguity tolerance",
      },
      intervention_frequency: {
        score: interventionScore,
        note: `Intervention score ${interventionScore} for ordering tests`,
      },
      escalation_bias: { score: 5, note: "Balanced escalation tendency" },
      delivery_vs_rigour_bias: { score: 5, note: "Balanced delivery-rigour" },
    },
    reasoning: {
      default_assumptions: ["Test assumption"],
      notices_first: ["Test signals"],
      systematically_questions: ["Test claims"],
      under_pressure: "Maintains test posture",
    },
    interaction: {
      primary_mode: "assertions",
      challenge_strength: "moderate",
      silent_when: ["No test needed"],
      handles_poor_input: "Reports test errors",
    },
    boundaries: {
      will_not_engage: ["Non-test topics"],
      will_not_claim: ["Production readiness"],
      defers_by_design: ["Integration testing"],
    },
    invocation: {
      include_when: ["Testing"],
      exclude_when: ["Not testing"],
    },
  };

  return {
    file,
    id: name.toLowerCase().replace(/\s/g, "-"),
    active: true,
  };
}

describe("Panel Speaking Order", () => {
  it("orders personas by intervention frequency (highest first)", () => {
    const personas = [
      createTestPersona("Low Freq", 2),
      createTestPersona("High Freq", 9),
      createTestPersona("Mid Freq", 5),
    ];

    const ordered = determineSpeakingOrder(personas);
    expect(ordered[0]!.file.metadata.name).toBe("High Freq");
    expect(ordered[1]!.file.metadata.name).toBe("Mid Freq");
    expect(ordered[2]!.file.metadata.name).toBe("Low Freq");
  });
});

describe("Persona Contribution", () => {
  it("high-intervention personas always contribute", () => {
    const persona = createTestPersona("Active", 9);
    expect(shouldPersonaContribute(persona, 1, 5)).toBe(true);
    expect(shouldPersonaContribute(persona, 3, 5)).toBe(true);
    expect(shouldPersonaContribute(persona, 5, 5)).toBe(true);
  });

  it("low-intervention personas contribute on round 1", () => {
    const persona = createTestPersona("Quiet", 2);
    expect(shouldPersonaContribute(persona, 1, 5)).toBe(true);
  });

  it("low-intervention personas skip middle rounds", () => {
    const persona = createTestPersona("Quiet", 2);
    expect(shouldPersonaContribute(persona, 3, 5)).toBe(false);
  });
});

describe("System Prompt Generation", () => {
  it("generates a prompt containing the persona name", () => {
    const persona = createTestPersona("Risk Analyst", 7);
    const prompt = generatePersonaSystemPrompt(persona.file);
    expect(prompt).toContain("Risk Analyst");
  });

  it("includes rubric scores in the prompt", () => {
    const persona = createTestPersona("Test", 7);
    const prompt = generatePersonaSystemPrompt(persona.file);
    expect(prompt).toContain("Risk Appetite: 5/10");
    expect(prompt).toContain("Intervention Frequency: 7/10");
  });

  it("includes boundaries in the prompt", () => {
    const persona = createTestPersona("Test", 5);
    const prompt = generatePersonaSystemPrompt(persona.file);
    expect(prompt).toContain("Will not engage on");
    expect(prompt).toContain("Non-test topics");
  });

  it("includes reasoning tendencies", () => {
    const persona = createTestPersona("Test", 5);
    const prompt = generatePersonaSystemPrompt(persona.file);
    expect(prompt).toContain("How You Reason");
    expect(prompt).toContain("Test assumption");
  });
});

describe("Panel Session", () => {
  it("creates a session with system prompts for each persona", () => {
    const personas = [
      createTestPersona("Alpha", 8),
      createTestPersona("Beta", 4),
    ];

    const config: PanelConfig = {
      topic: "Test Discussion",
      context: "Unit test",
      personas,
      max_rounds: 3,
      moderation: "none",
    };

    const session = createPanelSession(config);
    expect(session.system_prompts.size).toBe(2);
    expect(session.system_prompts.has("alpha")).toBe(true);
    expect(session.system_prompts.has("beta")).toBe(true);
  });
});
