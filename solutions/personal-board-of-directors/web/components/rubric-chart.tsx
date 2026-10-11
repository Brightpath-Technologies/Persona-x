"use client";

import type { PersonaProfile } from "@/lib/types";

const DIMENSION_LABELS: Record<string, string> = {
  risk_appetite: "Risk Appetite",
  evidence_threshold: "Evidence Threshold",
  tolerance_for_ambiguity: "Ambiguity Tolerance",
  intervention_frequency: "Intervention Freq.",
  escalation_bias: "Escalation Bias",
  delivery_vs_rigour_bias: "Delivery vs Rigour",
};

// Bronze accent at varying opacities
const BAR_OPACITIES: Record<string, string> = {
  risk_appetite: "bg-board-accent",
  evidence_threshold: "bg-board-accent/80",
  tolerance_for_ambiguity: "bg-board-accent/70",
  intervention_frequency: "bg-board-accent/60",
  escalation_bias: "bg-board-accent/50",
  delivery_vs_rigour_bias: "bg-board-accent/40",
};

interface RubricChartProps {
  rubric: PersonaProfile["rubric"];
}

export function RubricChart({ rubric }: RubricChartProps) {
  const dimensions = Object.entries(rubric) as [
    keyof typeof DIMENSION_LABELS,
    { score: number; note: string },
  ][];

  return (
    <div className="space-y-2.5">
      {dimensions.map(([key, { score, note }]) => (
        <div key={key} className="group">
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="text-board-text-secondary">
              {DIMENSION_LABELS[key] ?? key}
            </span>
            <span className="font-mono text-board-text-tertiary">
              {score}/10
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-board-border overflow-hidden">
            <div
              role="progressbar"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-label={`${DIMENSION_LABELS[key] ?? key}: ${score} out of 10. ${note}`}
              className={`rubric-bar h-full rounded-full ${BAR_OPACITIES[key] ?? "bg-board-accent"}`}
              style={{ width: `${score * 10}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
