import { describe, expect, it } from "vitest";
import {
  buildSectionGenerationProvenance,
  createPipelineState,
  recordPopulation,
} from "../../src/engine/population/pipeline.js";
import { createDiscoveryState } from "../../src/engine/discovery/discovery.js";
import { SectionGenerationRecordSchema } from "../../src/schema/persona.js";

/**
 * Provenance / section-generation tracking tests.
 * Verifies that the pipeline captures provider and model metadata
 * and that the output validates against the schema.
 */

describe("section-generation provenance", () => {
  it("captures provider + model when recordPopulation receives them", () => {
    let state = createPipelineState(createDiscoveryState());
    state = recordPopulation(
      state,
      "purpose",
      "direct_input",
      { description: "x", invoke_when: ["a"], do_not_invoke_when: ["b"] },
      {
        confidence: "high",
        source_signals: [],
        provider: "human",
        model: "n/a",
      },
    );
    state = recordPopulation(
      state,
      "rubric",
      "inference",
      {},
      {
        confidence: "medium",
        source_signals: ["discomfort_triggers"],
        provider: "ollama",
        model: "llama3.1:8b",
      },
    );

    const provenance = buildSectionGenerationProvenance(state);
    expect(provenance).toHaveLength(2);
    expect(provenance[0]).toMatchObject({
      section: "purpose",
      provider: "human",
      model: "n/a",
      method: "direct_input",
      confidence: "high",
    });
    expect(provenance[1]).toMatchObject({
      section: "rubric",
      provider: "ollama",
      model: "llama3.1:8b",
      method: "inference",
    });
  });

  it("defaults missing provider to 'human' for direct_input, 'unknown' otherwise", () => {
    let state = createPipelineState(createDiscoveryState());
    state = recordPopulation(
      state,
      "purpose",
      "direct_input",
      {},
      {
        confidence: "high",
        source_signals: [],
      },
    );
    state = recordPopulation(
      state,
      "rubric",
      "inference",
      {},
      {
        confidence: "low",
        source_signals: [],
      },
    );

    const provenance = buildSectionGenerationProvenance(state);
    expect(provenance[0]!.provider).toBe("human");
    expect(provenance[0]!.model).toBe("n/a");
    expect(provenance[1]!.provider).toBe("unknown");
    expect(provenance[1]!.model).toBe("unknown");
  });

  it("stamps an ISO timestamp automatically", () => {
    let state = createPipelineState(createDiscoveryState());
    state = recordPopulation(
      state,
      "purpose",
      "direct_input",
      {},
      {
        confidence: "high",
        source_signals: [],
      },
    );
    const ts = state.records[0]!.timestamp!;
    expect(() => new Date(ts).toISOString()).not.toThrow();
  });

  it("output validates against SectionGenerationRecordSchema", () => {
    let state = createPipelineState(createDiscoveryState());
    state = recordPopulation(
      state,
      "rubric",
      "inference",
      {},
      {
        confidence: "high",
        source_signals: ["discomfort_triggers"],
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
      },
    );
    const provenance = buildSectionGenerationProvenance(state);
    for (const record of provenance) {
      expect(() => SectionGenerationRecordSchema.parse(record)).not.toThrow();
    }
  });
});
