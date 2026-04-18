import { describe, expect, it } from "vitest";
import {
  addEdge,
  addNode,
  createGraph,
  forceDirectedLayout,
  fromJSON,
  mergeGraphs,
  neighbours,
  removeNode,
  toDot,
  toJSON,
  toMermaid,
} from "../../src/graph/index.js";

/**
 * Generic graph module tests. No Persona-x types involved —
 * if this file starts importing PersonaFile or RubricProfile the
 * module has lost its isolation and the tests should fail to compile.
 */

function sample() {
  let g = createGraph<{ kind: string }, { note: string }>(true);
  g = addNode(g, { id: "a", label: "Alpha", data: { kind: "root" } });
  g = addNode(g, { id: "b", label: "Beta", data: { kind: "leaf" } });
  g = addNode(g, { id: "c", label: "Gamma", data: { kind: "leaf" } });
  g = addEdge(g, { source: "a", target: "b", data: { note: "first" } });
  g = addEdge(g, {
    source: "a",
    target: "c",
    label: "labelled",
    weight: 2,
    data: { note: "weighted" },
  });
  return g;
}

describe("graph builders", () => {
  it("creates an empty directed graph by default", () => {
    const g = createGraph();
    expect(g.nodes).toEqual([]);
    expect(g.edges).toEqual([]);
    expect(g.directed).toBe(true);
  });

  it("adds nodes and edges without mutating inputs", () => {
    const g = sample();
    expect(g.nodes).toHaveLength(3);
    expect(g.edges).toHaveLength(2);
    const extended = addNode(g, { id: "d" });
    expect(extended.nodes).toHaveLength(4);
    expect(g.nodes).toHaveLength(3); // original unchanged
  });

  it("rejects duplicate node ids", () => {
    let g = createGraph();
    g = addNode(g, { id: "x" });
    expect(() => addNode(g, { id: "x" })).toThrow(/Duplicate node/);
  });

  it("rejects edges to unknown nodes", () => {
    const g = addNode(createGraph(), { id: "a" });
    expect(() => addEdge(g, { source: "a", target: "missing" })).toThrow(
      /not a known node/
    );
  });

  it("removing a node also removes its edges", () => {
    const g = removeNode(sample(), "a");
    expect(g.nodes.map((n) => n.id)).toEqual(["b", "c"]);
    expect(g.edges).toHaveLength(0);
  });

  it("neighbours respects directedness", () => {
    const directed = sample();
    expect(neighbours(directed, "a").map((n) => n.id).sort()).toEqual([
      "b",
      "c",
    ]);
    expect(neighbours(directed, "b")).toHaveLength(0);

    let undirected = createGraph<null, null>(false);
    undirected = addNode(undirected, { id: "a" });
    undirected = addNode(undirected, { id: "b" });
    undirected = addEdge(undirected, { source: "a", target: "b" });
    expect(neighbours(undirected, "b").map((n) => n.id)).toEqual(["a"]);
  });

  it("mergeGraphs de-duplicates by id, keeping the right-hand copy", () => {
    const a = addNode(createGraph<{ tag: string }, null>(), {
      id: "x",
      data: { tag: "old" },
    });
    const b = addNode(createGraph<{ tag: string }, null>(), {
      id: "x",
      data: { tag: "new" },
    });
    const merged = mergeGraphs(a, b);
    expect(merged.nodes).toHaveLength(1);
    expect(merged.nodes[0]!.data?.tag).toBe("new");
  });
});

describe("graph exports", () => {
  it("produces Mermaid output with nodes and edges", () => {
    const m = toMermaid(sample());
    expect(m).toContain("graph TD");
    expect(m).toContain('a["Alpha"]');
    expect(m).toContain("a --> b");
    expect(m).toContain("a -->|labelled| c");
  });

  it("produces DOT output with escaped labels", () => {
    const d = toDot(sample());
    expect(d.startsWith("digraph G {")).toBe(true);
    expect(d).toContain('"a" [label="Alpha"];');
    expect(d).toContain('"a" -> "b"');
    expect(d).toContain('weight=2');
  });

  it("roundtrips via JSON", () => {
    const g = sample();
    const restored = fromJSON<{ kind: string }, { note: string }>(toJSON(g));
    expect(restored).toEqual(g);
  });

  it("fromJSON rejects malformed input", () => {
    expect(() => fromJSON("{}")).toThrow();
    expect(() => fromJSON('{"nodes":[],"edges":[]}')).toThrow(/directed/);
  });
});

describe("force-directed layout", () => {
  it("produces one layout point per node", () => {
    const layout = forceDirectedLayout(sample(), { iterations: 50 });
    expect(layout.points).toHaveLength(3);
    expect(layout.points.map((p) => p.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("is deterministic for a given seed", () => {
    const g = sample();
    const a = forceDirectedLayout(g, { iterations: 100, seed: 7 });
    const b = forceDirectedLayout(g, { iterations: 100, seed: 7 });
    expect(a.points).toEqual(b.points);
  });

  it("returns empty points for an empty graph", () => {
    const layout = forceDirectedLayout(createGraph());
    expect(layout.points).toEqual([]);
    expect(layout.bounds).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
  });
});
