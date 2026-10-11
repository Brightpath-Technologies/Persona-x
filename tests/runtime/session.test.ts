import { describe, it, expect, afterAll } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { unlink } from "node:fs/promises";
import type { LoadedPersona, PanelConfig, PanelRound } from "../../src/runtime/interface.js";
import type { PersonaFile } from "../../src/schema/persona.js";
import { createPanelSession } from "../../src/runtime/panel.js";
import type { PanelSession } from "../../src/runtime/panel.js";
import {
  createSessionRecord,
  sessionToYaml,
  yamlToSession,
  saveSessionToFile,
  loadSessionFromFile,
  replaySession,
  compareSessions,
} from "../../src/runtime/session.js";
import type { SessionRecord } from "../../src/runtime/session.js";

// ── Helpers ──────────────────────────────────────────────────────────

function makePersona(name: string, riskScore = 5): LoadedPersona {
  const file: PersonaFile = {
    metadata: {
      name,
      type: "designed",
      owner: "Test",
      version: "1.0.0",
      last_updated: "2026-02-28",
      audience: "Tests",
    },
    purpose: {
      description: `Test persona: ${name}`,
      invoke_when: ["Testing"],
      do_not_invoke_when: ["Production"],
    },
    bio: {
      background: "Test background.",
      perspective_origin: "Created for unit testing.",
    },
    panel_role: {
      contribution_type: "test",
      expected_value: "Validates session mechanics",
      failure_modes_surfaced: ["Missing test coverage"],
    },
    rubric: {
      risk_appetite: { score: riskScore, note: `Risk score ${riskScore}` },
      evidence_threshold: { score: 6, note: "Moderate evidence threshold" },
      tolerance_for_ambiguity: { score: 5, note: "Balanced ambiguity tolerance" },
      intervention_frequency: { score: 7, note: "Frequently intervenes" },
      escalation_bias: { score: 4, note: "Rarely escalates" },
      delivery_vs_rigour_bias: { score: 6, note: "Leans toward delivery" },
    },
    reasoning: {
      default_assumptions: ["Test assumption"],
      notices_first: ["Test signals"],
      systematically_questions: ["Test claims"],
      under_pressure: "Maintains posture",
    },
    interaction: {
      primary_mode: "assertions",
      challenge_strength: "moderate",
      silent_when: ["No test input"],
      handles_poor_input: "Reports test errors",
    },
    boundaries: {
      will_not_engage: ["Non-test topics"],
      will_not_claim: ["Production suitability"],
      defers_by_design: ["Integration tests"],
    },
    invocation: {
      include_when: ["Testing"],
      exclude_when: ["Not testing"],
    },
  };

  return {
    file,
    id: name.toLowerCase().replace(/\s+/g, "-"),
    active: true,
  };
}

function makeSessionWithRounds(): PanelSession {
  const personas = [makePersona("Alpha Reviewer"), makePersona("Beta Analyst")];
  const config: PanelConfig = {
    topic: "AI ethics in financial services",
    context: "Evaluating use of AI for loan decisions",
    personas,
    max_rounds: 2,
    moderation: "light",
  };

  const session = createPanelSession(config);

  const rounds: PanelRound[] = [
    {
      round_number: 1,
      messages: [
        {
          persona_id: "alpha-reviewer",
          persona_name: "Alpha Reviewer",
          content: "This raises significant fairness concerns.",
          timestamp: "2026-02-28T10:00:00.000Z",
          rubric_influence: {
            dominant_dimensions: ["risk_appetite"],
            behaviour_notes: ["risk_appetite (5/10): balanced risk posture"],
          },
        },
        {
          persona_id: "beta-analyst",
          persona_name: "Beta Analyst",
          content: "Regulatory exposure is the key risk here.",
          timestamp: "2026-02-28T10:01:00.000Z",
          rubric_influence: {
            dominant_dimensions: ["evidence_threshold"],
            behaviour_notes: ["evidence_threshold (6/10): requires solid evidence"],
          },
        },
      ],
      summary: "Round 1 identified fairness and regulatory risks.",
    },
    {
      round_number: 2,
      messages: [
        {
          persona_id: "alpha-reviewer",
          persona_name: "Alpha Reviewer",
          content: "Mitigation through explainability requirements is feasible.",
          timestamp: "2026-02-28T10:05:00.000Z",
          rubric_influence: {
            dominant_dimensions: ["escalation_bias"],
            behaviour_notes: ["escalation_bias (4/10): prefers internal resolution"],
          },
        },
      ],
      summary: "Round 2 reached consensus on explainability safeguards.",
    },
  ];

  session.rounds.push(...rounds);
  session.current_round = 2;

  return session;
}

// Track temp files for cleanup
const tempFiles: string[] = [];

afterAll(async () => {
  for (const f of tempFiles) {
    try {
      await unlink(f);
    } catch {
      // file may already be gone — ignore
    }
  }
});

// ── createSessionRecord ───────────────────────────────────────────────

describe("createSessionRecord", () => {
  it("produces a record with a unique ID", () => {
    const session = makeSessionWithRounds();
    const a = createSessionRecord(session);
    const b = createSessionRecord(session);
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^session-/);
  });

  it("captures topic and context from the session config", () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session);
    expect(record.topic).toBe("AI ethics in financial services");
    expect(record.context).toBe("Evaluating use of AI for loan decisions");
  });

  it("captures all personas with rubric snapshots", () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session);
    expect(record.personas).toHaveLength(2);
    expect(record.personas[0]?.name).toBe("Alpha Reviewer");
    expect(record.personas[0]?.rubric_snapshot.risk_appetite.score).toBe(5);
    expect(record.personas[1]?.name).toBe("Beta Analyst");
  });

  it("captures all rounds and messages", () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session);
    expect(record.rounds).toHaveLength(2);
    expect(record.rounds[0]?.messages).toHaveLength(2);
    expect(record.rounds[1]?.messages).toHaveLength(1);
    expect(record.rounds[0]?.summary).toContain("fairness and regulatory");
  });

  it("maps rubric_influence to dominant_dimensions and behaviour_notes", () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session);
    const firstMsg = record.rounds[0]?.messages[0];
    expect(firstMsg?.dominant_dimensions).toEqual(["risk_appetite"]);
    expect(firstMsg?.behaviour_notes).toEqual(["risk_appetite (5/10): balanced risk posture"]);
  });

  it("records stage when provided", () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session, { stage: "propose" });
    expect(record.stage).toBe("propose");
  });

  it("records outcome when provided", () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session, {
      outcome: "Composite score 7.8/10 — proceeding to Challenge.",
    });
    expect(record.outcome).toContain("7.8");
  });

  it("uses panelName override when provided", () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session, {
      panelName: "Opportunity Structuring Panel",
    });
    expect(record.panel_name).toBe("Opportunity Structuring Panel");
  });

  it("falls back to topic as panel_name when no override", () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session);
    expect(record.panel_name).toBe("AI ethics in financial services");
  });

  it("produces a created_at that is a valid ISO datetime", () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session);
    expect(() => new Date(record.created_at)).not.toThrow();
    expect(new Date(record.created_at).toISOString()).toBe(record.created_at);
  });
});

// ── sessionToYaml / yamlToSession ────────────────────────────────────

describe("sessionToYaml and yamlToSession", () => {
  it("serialises to a string starting with YAML comment header", () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session);
    const yaml = sessionToYaml(record);
    expect(yaml).toMatch(/^# Panel Session Record/);
    expect(yaml).toContain("# Session:");
    expect(yaml).toContain("# Panel:");
  });

  it("round-trips through YAML without data loss", () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session, {
      stage: "propose",
      outcome: "Gate passed — composite 7.4/10.",
      panelName: "Opportunity Structuring Panel",
    });

    const yaml = sessionToYaml(record);
    const result = yamlToSession(yaml);

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe(record.id);
    expect(result.data?.topic).toBe(record.topic);
    expect(result.data?.stage).toBe("propose");
    expect(result.data?.outcome).toContain("7.4");
    expect(result.data?.personas).toHaveLength(2);
    expect(result.data?.rounds).toHaveLength(2);
    expect(result.data?.rounds[0]?.messages[0]?.dominant_dimensions).toEqual([
      "risk_appetite",
    ]);
  });

  it("returns an error for malformed YAML", () => {
    const result = yamlToSession("{ invalid: yaml: [unclosed");
    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it("returns an error when required fields are missing", () => {
    const incompleteYaml = `
id: session-abc
created_at: "2026-02-28T10:00:00.000Z"
panel_name: "Test Panel"
`;
    const result = yamlToSession(incompleteYaml);
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.includes("topic"))).toBe(true);
  });

  it("validates the loaded record against SessionRecordSchema", () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session);
    const yaml = sessionToYaml(record);
    const result = yamlToSession(yaml);
    expect(result.success).toBe(true);
    // If the schema validates, all required fields are present
    expect(result.data?.personas.length).toBeGreaterThan(0);
  });
});

// ── saveSessionToFile / loadSessionFromFile ───────────────────────────

describe("saveSessionToFile and loadSessionFromFile", () => {
  it("saves a session to disk and loads it back (round-trip)", async () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session, {
      stage: "propose",
      outcome: "Gate passed.",
      panelName: "Opportunity Structuring Panel",
    });

    const filePath = join(tmpdir(), `session-test-${Date.now()}.yaml`);
    tempFiles.push(filePath);

    await saveSessionToFile(record, filePath);
    const result = await loadSessionFromFile(filePath);

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe(record.id);
    expect(result.data?.panel_name).toBe("Opportunity Structuring Panel");
    expect(result.data?.stage).toBe("propose");
    expect(result.data?.personas).toHaveLength(2);
    expect(result.data?.rounds).toHaveLength(2);
  });

  it("saved files are human-readable YAML (not binary)", async () => {
    const { readFile } = await import("node:fs/promises");
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session);

    const filePath = join(tmpdir(), `session-readable-${Date.now()}.yaml`);
    tempFiles.push(filePath);

    await saveSessionToFile(record, filePath);
    const raw = await readFile(filePath, "utf-8");

    expect(raw).toMatch(/^# Panel Session Record/);
    expect(raw).toContain("topic:");
    expect(raw).toContain("personas:");
    expect(raw).toContain("rounds:");
  });

  it("returns an error when loading a non-existent file", async () => {
    const result = await loadSessionFromFile("/does/not/exist.yaml");
    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it("preserves rubric snapshot scores on disk round-trip", async () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session);

    const filePath = join(tmpdir(), `session-rubric-${Date.now()}.yaml`);
    tempFiles.push(filePath);

    await saveSessionToFile(record, filePath);
    const result = await loadSessionFromFile(filePath);

    expect(result.data?.personas[0]?.rubric_snapshot.risk_appetite.score).toBe(5);
    expect(result.data?.personas[0]?.rubric_snapshot.evidence_threshold.score).toBe(6);
  });
});

// ── replaySession ────────────────────────────────────────────────────

describe("replaySession", () => {
  function makeRecord(overrides?: Partial<SessionRecord>): SessionRecord {
    const session = makeSessionWithRounds();
    const base = createSessionRecord(session, {
      panelName: "Opportunity Structuring Panel",
      stage: "propose",
    });
    return { ...base, ...overrides };
  }

  it("includes the panel name as the heading", () => {
    const record = makeRecord();
    const output = replaySession(record);
    expect(output).toContain("# Panel Session: Opportunity Structuring Panel");
  });

  it("includes participant names", () => {
    const record = makeRecord();
    const output = replaySession(record);
    expect(output).toContain("Alpha Reviewer");
    expect(output).toContain("Beta Analyst");
  });

  it("includes round headings", () => {
    const record = makeRecord();
    const output = replaySession(record);
    expect(output).toContain("### Round 1");
    expect(output).toContain("### Round 2");
  });

  it("includes message content", () => {
    const record = makeRecord();
    const output = replaySession(record);
    expect(output).toContain("fairness concerns");
    expect(output).toContain("Regulatory exposure");
  });

  it("includes round summaries", () => {
    const record = makeRecord();
    const output = replaySession(record);
    expect(output).toContain("Round 1 identified fairness and regulatory risks.");
  });

  it("includes stage when present", () => {
    const record = makeRecord();
    const output = replaySession(record);
    expect(output).toContain("**Stage:** propose");
  });

  it("includes outcome when present", () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session, {
      outcome: "All challenges addressed — proceeding.",
    });
    const output = replaySession(record);
    expect(output).toContain("## Outcome");
    expect(output).toContain("All challenges addressed");
  });

  it("omits outcome section when absent", () => {
    const session = makeSessionWithRounds();
    const record = createSessionRecord(session);
    const output = replaySession(record);
    expect(output).not.toContain("## Outcome");
  });
});

// ── compareSessions ──────────────────────────────────────────────────

describe("compareSessions", () => {
  it("identifies personas shared between sessions", () => {
    const session = makeSessionWithRounds();
    const a = createSessionRecord(session);
    const b = createSessionRecord(session);
    const comparison = compareSessions(a, b);
    expect(comparison.persona_differences.shared).toContain("Alpha Reviewer");
    expect(comparison.persona_differences.shared).toContain("Beta Analyst");
    expect(comparison.persona_differences.only_in_a).toHaveLength(0);
    expect(comparison.persona_differences.only_in_b).toHaveLength(0);
  });

  it("identifies personas only in session A", () => {
    const sessionA = makeSessionWithRounds();
    const personasB = [makePersona("Gamma Expert")];
    const configB: PanelConfig = {
      topic: "Different topic",
      context: "Different context",
      personas: personasB,
      max_rounds: 1,
      moderation: "none",
    };
    const sessionB = createPanelSession(configB);

    const a = createSessionRecord(sessionA);
    const b = createSessionRecord(sessionB);
    const comparison = compareSessions(a, b);

    expect(comparison.persona_differences.only_in_a).toContain("Alpha Reviewer");
    expect(comparison.persona_differences.only_in_a).toContain("Beta Analyst");
    expect(comparison.persona_differences.only_in_b).toContain("Gamma Expert");
    expect(comparison.persona_differences.shared).toHaveLength(0);
  });

  it("returns no rubric shifts when rubric is identical", () => {
    const session = makeSessionWithRounds();
    const a = createSessionRecord(session);
    const b = createSessionRecord(session);
    const comparison = compareSessions(a, b);
    expect(comparison.rubric_shifts).toHaveLength(0);
  });

  it("detects rubric score shifts on shared personas", () => {
    const personasA = [makePersona("Shared Persona", 3)]; // risk = 3
    const personasB = [makePersona("Shared Persona", 8)]; // risk = 8

    const configA: PanelConfig = {
      topic: "Topic A",
      context: "Context A",
      personas: personasA,
      max_rounds: 1,
      moderation: "none",
    };
    const configB: PanelConfig = {
      topic: "Topic B",
      context: "Context B",
      personas: personasB,
      max_rounds: 1,
      moderation: "none",
    };

    const sessionA = createPanelSession(configA);
    const sessionB = createPanelSession(configB);

    const a = createSessionRecord(sessionA);
    const b = createSessionRecord(sessionB);
    const comparison = compareSessions(a, b);

    const riskShift = comparison.rubric_shifts.find(
      (s) => s.persona_name === "Shared Persona" && s.dimension === "risk_appetite"
    );
    expect(riskShift).toBeDefined();
    expect(riskShift?.score_a).toBe(3);
    expect(riskShift?.score_b).toBe(8);
    expect(riskShift?.shift).toBe(5);
  });

  it("records round counts for both sessions", () => {
    const session = makeSessionWithRounds();
    const a = createSessionRecord(session);
    const b = createSessionRecord(session);
    const comparison = compareSessions(a, b);
    expect(comparison.round_count_a).toBe(2);
    expect(comparison.round_count_b).toBe(2);
  });

  it("includes session IDs and topics in the comparison", () => {
    const session = makeSessionWithRounds();
    const a = createSessionRecord(session);
    const b = createSessionRecord(session);
    const comparison = compareSessions(a, b);
    expect(comparison.session_a_id).toBe(a.id);
    expect(comparison.session_b_id).toBe(b.id);
    expect(comparison.topic_a).toBe("AI ethics in financial services");
    expect(comparison.topic_b).toBe("AI ethics in financial services");
  });

  it("captures outcomes in comparison", () => {
    const session = makeSessionWithRounds();
    const a = createSessionRecord(session, { outcome: "Passed gate." });
    const b = createSessionRecord(session, { outcome: "Deferred." });
    const comparison = compareSessions(a, b);
    expect(comparison.outcome_a).toBe("Passed gate.");
    expect(comparison.outcome_b).toBe("Deferred.");
  });
});
