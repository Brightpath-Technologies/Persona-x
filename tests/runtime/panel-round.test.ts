import { describe, expect, it } from "vitest";
import {
  createPanelSession,
  runPanel,
  runPanelRound,
} from "../../src/runtime/panel.js";
import type {
  LoadedPersona,
  PanelConfig,
} from "../../src/runtime/interface.js";
import type { PersonaFile } from "../../src/schema/persona.js";
import type {
  LLMProvider,
  LLMRequestOptions,
  LLMResponse,
} from "../../src/llm/providers/types.js";

/**
 * Panel round execution tests.
 * Uses a stub provider so the tests never touch the network and the
 * output is fully deterministic.
 */

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
      background: "Test background.",
      perspective_origin: "Test origin.",
    },
    panel_role: {
      contribution_type: "test",
      expected_value: "Validates panel mechanics.",
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
        note: `Score ${interventionScore} for ordering tests`,
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

interface StubCall {
  system: string | undefined;
  cacheSystem: boolean | undefined;
  firstUserMessage: string;
}

function createStubProvider(): LLMProvider & { calls: StubCall[] } {
  const calls: StubCall[] = [];
  let counter = 0;
  const provider = {
    name: "ollama" as const,
    model: "stub-model",
    calls,
    async sendMessage(opts: LLMRequestOptions): Promise<LLMResponse> {
      counter += 1;
      calls.push({
        system: opts.system,
        cacheSystem: opts.cacheSystem,
        firstUserMessage: opts.messages[0]?.content ?? "",
      });
      return {
        content: `stub response ${counter}`,
        provider: "ollama",
        model: "stub-model",
        usage: { input_tokens: 10, output_tokens: 20 },
      };
    },
  };
  return provider;
}

function buildConfig(personas: LoadedPersona[], rounds: number): PanelConfig {
  return {
    topic: "Testing the panel",
    context: "Unit test context",
    personas,
    max_rounds: rounds,
    moderation: "none",
  };
}

describe("runPanelRound", () => {
  it("produces one message per contributing persona in speaking order", async () => {
    const personas = [
      createTestPersona("Low", 2),
      createTestPersona("High", 9),
      createTestPersona("Mid", 6),
    ];
    const session = createPanelSession(buildConfig(personas, 3));
    const provider = createStubProvider();

    const round = await runPanelRound(provider, session, 1);

    expect(round.messages).toHaveLength(3);
    expect(round.messages.map((m) => m.persona_name)).toEqual([
      "High",
      "Mid",
      "Low",
    ]);
  });

  it("skips inactive personas", async () => {
    const personas = [
      createTestPersona("Active", 8),
      createTestPersona("Inactive", 8),
    ];
    personas[1]!.active = false;
    const session = createPanelSession(buildConfig(personas, 3));
    const provider = createStubProvider();

    const round = await runPanelRound(provider, session, 1);

    expect(round.messages.map((m) => m.persona_name)).toEqual(["Active"]);
  });

  it("skips low-intervention personas on middle rounds", async () => {
    const personas = [
      createTestPersona("Always", 9),
      createTestPersona("Quiet", 2),
    ];
    const session = createPanelSession(buildConfig(personas, 5));
    const provider = createStubProvider();

    const round = await runPanelRound(provider, session, 3);

    expect(round.messages.map((m) => m.persona_name)).toEqual(["Always"]);
  });

  it("records the round on the session and generates a summary", async () => {
    const personas = [createTestPersona("Solo", 8)];
    const session = createPanelSession(buildConfig(personas, 2));
    const provider = createStubProvider();

    await runPanelRound(provider, session, 1);

    expect(session.rounds).toHaveLength(1);
    expect(session.current_round).toBe(1);
    expect(session.rounds[0]!.summary.length).toBeGreaterThan(0);
  });

  it("returns no-contribution summary when nobody speaks", async () => {
    const personas = [createTestPersona("Quiet", 2)];
    const session = createPanelSession(buildConfig(personas, 5));
    const provider = createStubProvider();

    const round = await runPanelRound(provider, session, 3);

    expect(round.messages).toHaveLength(0);
    expect(round.summary).toContain("No contributions");
  });

  it("passes cacheSystem=true to the provider for persona responses", async () => {
    const personas = [createTestPersona("Solo", 8)];
    const session = createPanelSession(buildConfig(personas, 1));
    const provider = createStubProvider();

    await runPanelRound(provider, session, 1);

    const personaCalls = provider.calls.filter(
      (c) => c.system && c.system.includes("You are Solo"),
    );
    expect(personaCalls.length).toBeGreaterThan(0);
    expect(personaCalls[0]!.cacheSystem).toBe(true);
  });
});

describe("runPanel", () => {
  it("runs up to max_rounds", async () => {
    const personas = [createTestPersona("Always", 9)];
    const session = createPanelSession(buildConfig(personas, 3));
    const provider = createStubProvider();

    await runPanel(provider, session);

    expect(session.rounds).toHaveLength(3);
  });

  it("short-circuits when a round produces no messages", async () => {
    const personas = [createTestPersona("Quiet", 2)];
    const session = createPanelSession(buildConfig(personas, 5));
    const provider = createStubProvider();

    await runPanel(provider, session);

    expect(session.rounds.length).toBeGreaterThan(0);
    expect(session.rounds.length).toBeLessThan(5);
    const lastRound = session.rounds[session.rounds.length - 1]!;
    expect(lastRound.messages).toHaveLength(0);
  });
});
