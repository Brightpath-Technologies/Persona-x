import type { Graph, GraphEdge, GraphNode } from "./types.js";

/**
 * Pure graph builders. Every function returns a new graph — the input
 * is never mutated. No global state, no classes.
 */

export function createGraph<N = unknown, E = unknown>(
  directed = true,
): Graph<N, E> {
  return { nodes: [], edges: [], directed };
}

export function addNode<N, E>(
  graph: Graph<N, E>,
  node: GraphNode<N>,
): Graph<N, E> {
  if (graph.nodes.some((n) => n.id === node.id)) {
    throw new Error(`Duplicate node id: ${node.id}`);
  }
  return { ...graph, nodes: [...graph.nodes, node] };
}

export function addEdge<N, E>(
  graph: Graph<N, E>,
  edge: GraphEdge<E>,
): Graph<N, E> {
  const sourceExists = graph.nodes.some((n) => n.id === edge.source);
  const targetExists = graph.nodes.some((n) => n.id === edge.target);
  if (!sourceExists) {
    throw new Error(`Edge source "${edge.source}" is not a known node`);
  }
  if (!targetExists) {
    throw new Error(`Edge target "${edge.target}" is not a known node`);
  }
  return { ...graph, edges: [...graph.edges, edge] };
}

export function removeNode<N, E>(graph: Graph<N, E>, id: string): Graph<N, E> {
  return {
    ...graph,
    nodes: graph.nodes.filter((n) => n.id !== id),
    edges: graph.edges.filter((e) => e.source !== id && e.target !== id),
  };
}

export function mergeGraphs<N, E>(a: Graph<N, E>, b: Graph<N, E>): Graph<N, E> {
  const nodeMap = new Map<string, GraphNode<N>>();
  for (const n of a.nodes) nodeMap.set(n.id, n);
  for (const n of b.nodes) nodeMap.set(n.id, n); // b wins on id collision
  return {
    nodes: Array.from(nodeMap.values()),
    edges: [...a.edges, ...b.edges],
    directed: a.directed && b.directed,
  };
}

export function neighbours<N, E>(
  graph: Graph<N, E>,
  id: string,
): GraphNode<N>[] {
  const ids = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.source === id) ids.add(edge.target);
    if (!graph.directed && edge.target === id) ids.add(edge.source);
  }
  return graph.nodes.filter((n) => ids.has(n.id));
}
