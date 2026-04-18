import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  personaToYaml,
  readPersonaFile,
  writePersonaFile,
  yamlToPersona,
} from "../../src/utils/yaml.js";
import type { PersonaFile } from "../../src/schema/persona.js";

function samplePersona(): PersonaFile {
  return {
    metadata: {
      name: "Sample Analyst",
      type: "designed",
      owner: "Tests",
      version: "1.0.0",
      last_updated: "2026-04-18",
      audience: "Test consumers",
    },
    purpose: {
      description: "Validates YAML round-tripping for tests.",
      invoke_when: ["Running the YAML test suite"],
      do_not_invoke_when: ["Live persona generation"],
    },
    bio: {
      background: "Test-only persona used in unit tests.",
      perspective_origin: "Created to exercise serialisation paths.",
    },
    panel_role: {
      contribution_type: "test",
      expected_value: "Ensures YAML utilities work",
      failure_modes_surfaced: ["Schema drift"],
    },
    rubric: {
      risk_appetite: { score: 4, note: "Balanced conservative tendency" },
      evidence_threshold: { score: 7, note: "Wants two independent data points" },
      tolerance_for_ambiguity: { score: 5, note: "Accepts moderate gaps" },
      intervention_frequency: { score: 6, note: "Steps in on weak claims" },
      escalation_bias: { score: 4, note: "Prefers to resolve locally" },
      delivery_vs_rigour_bias: { score: 6, note: "Leans toward rigour" },
    },
    reasoning: {
      default_assumptions: ["Stated intent is the real intent"],
      notices_first: ["Missing data"],
      systematically_questions: ["Best-case scenarios"],
      under_pressure: "Prioritises precision over speed.",
    },
    interaction: {
      primary_mode: "questions",
      challenge_strength: "moderate",
      silent_when: ["No material stake"],
      handles_poor_input: "Asks a clarifying question before proceeding.",
    },
    boundaries: {
      will_not_engage: ["Personal attacks"],
      will_not_claim: ["Expertise outside testing"],
      defers_by_design: ["Domain specialists"],
    },
    invocation: {
      include_when: ["Test coverage assessment"],
      exclude_when: ["Production deployment"],
    },
  };
}

describe("YAML serialisation", () => {
  it("round-trips a valid persona through personaToYaml and yamlToPersona", () => {
    const persona = samplePersona();
    const yaml = personaToYaml(persona);
    const result = yamlToPersona(yaml);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(persona);
  });

  it("includes a comment header with name and version", () => {
    const yaml = personaToYaml(samplePersona());
    expect(yaml.startsWith("#")).toBe(true);
    expect(yaml).toContain("Sample Analyst");
    expect(yaml).toContain("1.0.0");
  });

  it("returns errors on malformed YAML", () => {
    const result = yamlToPersona(":: not yaml ::");
    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it("reports schema errors with field paths", () => {
    const invalid = stringifyJSONLikeYaml({ metadata: { name: "" } });
    const result = yamlToPersona(invalid);
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.includes("metadata"))).toBe(true);
  });
});

describe("persona file I/O", () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "persona-x-yaml-"));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes and reads back a persona file", async () => {
    const persona = samplePersona();
    const path = join(dir, "test.yaml");
    await writePersonaFile(path, persona);
    const loaded = await readPersonaFile(path);
    expect(loaded.success).toBe(true);
    expect(loaded.data).toEqual(persona);

    const raw = await readFile(path, "utf-8");
    expect(raw).toContain("Sample Analyst");
  });

  it("returns an error when the file does not exist", async () => {
    const result = await readPersonaFile(join(dir, "nope.yaml"));
    expect(result.success).toBe(false);
    expect(result.errors?.[0]).toMatch(/Failed to read/);
  });
});

/**
 * Minimal YAML-like serialiser for the malformed-input test.
 * Doesn't cover real YAML edge cases — only enough to build a
 * deliberately-invalid persona document.
 */
function stringifyJSONLikeYaml(obj: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object") {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        lines.push(`  ${k}: ${JSON.stringify(v)}`);
      }
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  return lines.join("\n");
}
