"use client";

import { useTeamContext } from "@/lib/team-context";

const PLACEHOLDER =
  `Describe the software project you want the team to evaluate. Be specific about what you want to build, the problem it solves, and your target users.\n\nExample: "We want to build a mobile app that helps freelancers track their time and invoice clients automatically. The app should integrate with Xero and support multiple currencies."`;

export function ProjectInput() {
  const {
    projectBrief,
    setProjectBrief,
    resources,
    setResources,
    autoSelectLoading,
    autoSelectPersonas,
    setStep,
  } = useTeamContext();

  const hasContent = projectBrief.trim().length > 0;

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-serif text-board-text mb-1">
        Describe Your Project
      </h2>
      <p className="text-sm text-board-text-secondary mb-6">
        Tell us what you&apos;re building and we&apos;ll auto-select the most relevant team members, or choose them yourself.
      </p>

      <textarea
        className="w-full rounded-xl border border-board-border bg-board-surface px-4 py-3 text-sm text-board-text placeholder-board-text-tertiary focus:outline-none focus:ring-2 focus:ring-board-accent/40 resize-none transition-shadow"
        rows={8}
        maxLength={5000}
        placeholder={PLACEHOLDER}
        value={projectBrief}
        onChange={(e) => setProjectBrief(e.target.value)}
        aria-label="Project description"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-board-text-tertiary">
        <span>{projectBrief.length.toLocaleString()} / 5,000 characters</span>
      </div>

      {/* Optional resource fields */}
      <div className="mt-5">
        <p className="text-xs text-board-text-tertiary uppercase tracking-wide mb-3">
          Available resources (optional)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Budget", field: "budget" as const, placeholder: "e.g. $50k, limited, TBD" },
            { label: "Team", field: "team" as const, placeholder: "e.g. 2 developers, solo founder" },
            { label: "Specialties", field: "specialties" as const, placeholder: "e.g. React, Node.js, ML expertise" },
            { label: "Existing tools", field: "existingTools" as const, placeholder: "e.g. AWS, Xero, existing CRM" },
          ].map(({ label, field, placeholder }) => (
            <div key={field}>
              <label className="block text-xs text-board-text-tertiary mb-1">{label}</label>
              <input
                type="text"
                className="w-full rounded-lg border border-board-border bg-board-surface px-3 py-2 text-sm text-board-text placeholder-board-text-tertiary focus:outline-none focus:ring-2 focus:ring-board-accent/40"
                placeholder={placeholder}
                value={resources[field]}
                onChange={(e) => setResources({ ...resources, [field]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => autoSelectPersonas()}
        disabled={!hasContent || autoSelectLoading}
        className="mt-6 w-full rounded-xl bg-board-accent px-6 py-3 text-sm font-semibold text-board-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {autoSelectLoading ? (
          <>
            <span className="h-3 w-3 rounded-full border-2 border-board-accent-contrast/40 border-t-board-accent-contrast animate-spin" />
            Selecting team…
          </>
        ) : (
          "Auto-Select Team →"
        )}
      </button>

      <div className="mt-3 text-center">
        <button
          onClick={() => setStep("persona_select")}
          className="text-xs text-board-text-tertiary underline hover:text-board-text-secondary transition-colors"
        >
          or select manually →
        </button>
      </div>
    </div>
  );
}
