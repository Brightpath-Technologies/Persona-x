import { describe, it, expect } from "vitest";
import {
  createPipelineState,
  getCurrentSection,
  advanceSection,
  isPipelineComplete,
  POPULATION_ORDER,
  generateBuildTrace,
  recordPopulation,
} from "../../src/engine/population/pipeline.js";
import { createDiscoveryState } from "../../src/engine/discovery/discovery.js";

describe("Population Pipeline", () => {
  const discovery = createDiscoveryState();

  it("starts at the first section (purpose)", () => {
    const state = createPipelineState(discovery);
    expect(getCurrentSection(state)).toBe("purpose");
  });

  it("advances through sections in fixed order", () => {
    let state = createPipelineState(discovery);

    for (let i = 0; i < POPULATION_ORDER.length; i++) {
      expect(getCurrentSection(state)).toBe(POPULATION_ORDER[i]);
      state = advanceSection(state);
    }

    expect(getCurrentSection(state)).toBeNull();
  });

  it("tracks completed sections", () => {
    let state = createPipelineState(discovery);
    state = advanceSection(state);
    state = advanceSection(state);

    expect(state.completed_sections).toEqual(["purpose", "panel_role"]);
  });

  it("reports incomplete when required sections are missing", () => {
    const state = createPipelineState(discovery);
    expect(isPipelineComplete(state)).toBe(false);
  });

  it("reports complete when all required sections are populated", () => {
    let state = createPipelineState(discovery);

    // Advance through all required sections
    for (let i = 0; i < 6; i++) {
      state = advanceSection(state);
    }

    expect(isPipelineComplete(state)).toBe(true);
  });

  it("generates a build trace", () => {
    let state = createPipelineState(discovery);
    state = recordPopulation(
      state,
      "purpose",
      "direct_input",
      {},
      {
        confidence: "high",
        source_signals: ["user_stated"],
      },
    );
    state = advanceSection(state);

    const trace = generateBuildTrace(state);
    expect(trace).toContain("Build Trace");
    expect(trace).toContain("purpose");
    expect(trace).toContain("direct_input");
  });
});

describe("Population Order", () => {
  it("follows the fixed population order", () => {
    expect(POPULATION_ORDER[0]).toBe("purpose");
    expect(POPULATION_ORDER[1]).toBe("panel_role");
    expect(POPULATION_ORDER[2]).toBe("rubric");
    expect(POPULATION_ORDER[3]).toBe("reasoning");
    expect(POPULATION_ORDER[4]).toBe("interaction");
    expect(POPULATION_ORDER[5]).toBe("boundaries");
    expect(POPULATION_ORDER[6]).toBe("optional");
  });

  it("has exactly 7 sections (6 required + optional)", () => {
    expect(POPULATION_ORDER.length).toBe(7);
  });
});
