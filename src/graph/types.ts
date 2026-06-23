/**
 * Generic Graph Types
 *
 * Zero Persona-x coupling. Plain nodes and edges with optional
 * free-form `data` payloads for consumers who need extra context.
 */

export interface GraphNode<T = unknown> {
  id: string;
  label?: string;
  data?: T;
}

export interface GraphEdge<T = unknown> {
  source: string;
  target: string;
  label?: string;
  weight?: number;
  data?: T;
}

export interface Graph<NodeData = unknown, EdgeData = unknown> {
  nodes: GraphNode<NodeData>[];
  edges: GraphEdge<EdgeData>[];
  directed: boolean;
}

export interface LayoutPoint {
  id: string;
  x: number;
  y: number;
}

export interface LayoutResult {
  points: LayoutPoint[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}
