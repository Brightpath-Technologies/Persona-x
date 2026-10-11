/**
 * Shared constants for the Board of Directors app.
 */

/** Anthropic model used for all LLM calls */
export const LLM_MODEL = "claude-sonnet-4-6";

/** Tailwind classes for contribution-type role badges */
export const ROLE_BADGE_COLORS: Record<string, string> = {
  integrator: "bg-board-accent/15 text-board-accent border-board-accent/25",
  challenger: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25",
  "sense-checker": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  advocate: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/25",
};

export const DEFAULT_BADGE_COLOR =
  "bg-board-text-tertiary/15 text-board-text-secondary border-board-text-tertiary/25";
