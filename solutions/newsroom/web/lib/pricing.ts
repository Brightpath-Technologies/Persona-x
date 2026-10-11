// Token-budget cockpit. Desks cost "column inches" — we price each run so the
// Editor-in-Chief can see spend against the newsroom's monthly budget.
//
// Prices are USD per 1M tokens (input / output), current as of the model table.

export interface ModelPrice {
  label: string;
  input: number; // $/MTok
  output: number; // $/MTok
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "claude-opus-4-8": { label: "Opus 4.8", input: 5, output: 25 },
  "claude-sonnet-4-6": { label: "Sonnet 4.6", input: 3, output: 15 },
  "claude-haiku-4-5": { label: "Haiku 4.5", input: 1, output: 5 },
};

export const DEFAULT_MODEL = "claude-opus-4-8";

/** Models the Editor may staff a desk with, cheapest column-inches first. */
export const STAFFABLE_MODELS = [
  "claude-haiku-4-5",
  "claude-sonnet-4-6",
  "claude-opus-4-8",
] as const;

export function modelLabel(model: string): string {
  return MODEL_PRICES[model]?.label ?? model;
}

/** USD cost of a single desk run. */
export function runCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const p = MODEL_PRICES[model] ?? MODEL_PRICES[DEFAULT_MODEL];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export function formatUsd(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}
