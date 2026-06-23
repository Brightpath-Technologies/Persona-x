/**
 * Graph module entry point.
 * Import as: import { createGraph, toMermaid } from "persona-x/graph";
 *
 * Deliberately free of any Persona-x type. Can be copied into another
 * project without modification.
 */

export type {
  Graph,
  GraphNode,
  GraphEdge,
  LayoutPoint,
  LayoutResult,
} from "./types.js";

export {
  createGraph,
  addNode,
  addEdge,
  removeNode,
  mergeGraphs,
  neighbours,
} from "./builders.js";

export { forceDirectedLayout } from "./layouts.js";
export type { ForceLayoutOptions } from "./layouts.js";

export { toMermaid, toDot, toJSON, fromJSON } from "./export.js";
