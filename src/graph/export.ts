import type { Graph } from "./types.js";

/**
 * Graph serialisation.
 * Mermaid and DOT for diagram rendering; JSON for round-tripping.
 */

export function toMermaid<N, E>(graph: Graph<N, E>): string {
  const lines: string[] = [];
  lines.push(graph.directed ? "graph TD" : "graph LR");

  for (const node of graph.nodes) {
    const label = node.label ?? node.id;
    lines.push(`  ${safeId(node.id)}["${escapeLabel(label)}"]`);
  }

  const connector = graph.directed ? "-->" : "---";
  for (const edge of graph.edges) {
    const s = safeId(edge.source);
    const t = safeId(edge.target);
    if (edge.label) {
      lines.push(`  ${s} ${connector}|${escapeLabel(edge.label)}| ${t}`);
    } else {
      lines.push(`  ${s} ${connector} ${t}`);
    }
  }

  return lines.join("\n");
}

export function toDot<N, E>(graph: Graph<N, E>): string {
  const kind = graph.directed ? "digraph" : "graph";
  const connector = graph.directed ? "->" : "--";
  const lines: string[] = [`${kind} G {`];

  for (const node of graph.nodes) {
    const label = node.label ?? node.id;
    lines.push(`  "${escapeDot(node.id)}" [label="${escapeDot(label)}"];`);
  }

  for (const edge of graph.edges) {
    const attrs: string[] = [];
    if (edge.label) attrs.push(`label="${escapeDot(edge.label)}"`);
    if (edge.weight !== undefined) attrs.push(`weight=${edge.weight}`);
    const tail = attrs.length > 0 ? ` [${attrs.join(", ")}]` : "";
    lines.push(
      `  "${escapeDot(edge.source)}" ${connector} "${escapeDot(edge.target)}"${tail};`
    );
  }

  lines.push("}");
  return lines.join("\n");
}

export function toJSON<N, E>(graph: Graph<N, E>): string {
  return JSON.stringify(graph, null, 2);
}

export function fromJSON<N = unknown, E = unknown>(raw: string): Graph<N, E> {
  const parsed = JSON.parse(raw) as Graph<N, E>;
  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error("Invalid graph JSON: missing nodes or edges array");
  }
  if (typeof parsed.directed !== "boolean") {
    throw new Error("Invalid graph JSON: directed must be a boolean");
  }
  return parsed;
}

function safeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_]/g, "_");
}

function escapeLabel(label: string): string {
  return label.replace(/"/g, "'");
}

function escapeDot(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
