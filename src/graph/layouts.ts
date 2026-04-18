import type { Graph, LayoutPoint, LayoutResult } from "./types.js";

/**
 * Minimal force-directed layout.
 * No external dependencies. Deterministic when seed is supplied.
 *
 * Nodes repel each other with a Coulomb-like force; connected nodes
 * attract via a Hooke-like spring. After iterations converge, positions
 * are normalised to a unit box.
 */

export interface ForceLayoutOptions {
  iterations?: number;
  repulsion?: number;
  attraction?: number;
  damping?: number;
  seed?: number;
}

export function forceDirectedLayout<N, E>(
  graph: Graph<N, E>,
  options: ForceLayoutOptions = {}
): LayoutResult {
  const iterations = options.iterations ?? 200;
  const repulsion = options.repulsion ?? 0.05;
  const attraction = options.attraction ?? 0.01;
  const damping = options.damping ?? 0.85;
  const rand = mulberry32(options.seed ?? 42);

  const count = graph.nodes.length;
  if (count === 0) {
    return {
      points: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    };
  }

  const positions = new Map<string, { x: number; y: number }>();
  const velocities = new Map<string, { vx: number; vy: number }>();

  for (const node of graph.nodes) {
    positions.set(node.id, { x: rand() * 2 - 1, y: rand() * 2 - 1 });
    velocities.set(node.id, { vx: 0, vy: 0 });
  }

  for (let step = 0; step < iterations; step++) {
    for (const a of graph.nodes) {
      const pa = positions.get(a.id)!;
      const va = velocities.get(a.id)!;

      let fx = 0;
      let fy = 0;

      for (const b of graph.nodes) {
        if (a.id === b.id) continue;
        const pb = positions.get(b.id)!;
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        const distSq = dx * dx + dy * dy + 0.001;
        const dist = Math.sqrt(distSq);
        const force = repulsion / distSq;
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      for (const edge of graph.edges) {
        const other =
          edge.source === a.id
            ? edge.target
            : edge.target === a.id && !graph.directed
              ? edge.source
              : null;
        if (!other) continue;
        const pb = positions.get(other);
        if (!pb) continue;
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const weight = edge.weight ?? 1;
        fx += dx * attraction * weight;
        fy += dy * attraction * weight;
      }

      va.vx = (va.vx + fx) * damping;
      va.vy = (va.vy + fy) * damping;
    }

    for (const node of graph.nodes) {
      const p = positions.get(node.id)!;
      const v = velocities.get(node.id)!;
      p.x += v.vx;
      p.y += v.vy;
    }
  }

  const points: LayoutPoint[] = graph.nodes.map((n) => {
    const p = positions.get(n.id)!;
    return { id: n.id, x: p.x, y: p.y };
  });

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  return {
    points,
    bounds: {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    },
  };
}

/**
 * Simple seedable PRNG (mulberry32). Keeps layout deterministic per seed.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
