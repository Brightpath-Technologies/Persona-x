// Common beat categories (for grouping + quick-add) and re-check cadences.

export const BEAT_CATEGORIES = [
  "Technology / AI",
  "Sector risk",
  "Business / Markets",
  "Politics / Policy",
  "Science / Health",
  "Entertainment / Arts",
  "Sport",
  "General interest",
] as const;

export type BeatCategory = (typeof BEAT_CATEGORIES)[number];

/** Cadence presets — hours between automatic re-checks (0 = manual only). */
export const CADENCE_OPTIONS = [
  { hours: 0, label: "Manual only" },
  { hours: 6, label: "Every 6 hours" },
  { hours: 12, label: "Every 12 hours" },
  { hours: 24, label: "Daily" },
  { hours: 72, label: "Every 3 days" },
  { hours: 168, label: "Weekly" },
] as const;

export function cadenceLabel(hours: number | null): string {
  if (!hours) return "Manual";
  return (
    CADENCE_OPTIONS.find((c) => c.hours === hours)?.label ?? `Every ${hours}h`
  );
}

/**
 * Starter briefs for one-click beat creation per category. The editor can edit
 * the brief afterwards; these are sensible defaults, not fixed.
 */
export const CATEGORY_TEMPLATES: Record<string, string> = {
  "Technology / AI":
    "Significant developments in technology and AI relevant to us — major model releases, platform changes, notable launches, and regulation.",
  "Sector risk":
    "Emerging risks in our sector — incidents, failures, regulatory action, and warning signs among peers and competitors.",
  "Business / Markets":
    "Material business and market developments affecting us — deals, results, funding, and shifts among key players.",
  "Politics / Policy":
    "New policy, legislation, and official guidance that affects us, with the substance and the likely impact.",
  "Science / Health":
    "Notable peer-reviewed findings, public-health developments, and clinical or scientific advances relevant to our work.",
  "Entertainment / Arts":
    "Significant developments in entertainment and the arts — major releases, awards, cultural moments, and industry shifts.",
  Sport: "Significant results, transfers, and governance developments in the sport we follow.",
  "General interest":
    "Genuinely significant general-interest stories our audience should not miss.",
};
