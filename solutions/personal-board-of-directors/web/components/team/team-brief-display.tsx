"use client";

import { useTeamContext } from "@/lib/team-context";
import { ROLE_BADGE_COLORS, DEFAULT_BADGE_COLOR } from "@/lib/constants";
import { ExportDropdown } from "@/components/export-dropdown";
import { downloadFullBriefMarkdown, downloadFullBriefText, printFullBrief } from "@/lib/export";

function verdictColour(rec: string): string {
  switch (rec) {
    case "go":
      return "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400";
    case "conditional_go":
      return "border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400";
    case "no_go":
      return "border-red-300 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400";
    default:
      return "border-board-border bg-board-surface text-board-text";
  }
}

function verdictLabel(rec: string): string {
  switch (rec) {
    case "go":
      return "Go";
    case "conditional_go":
      return "Conditional Go";
    case "no_go":
      return "No Go";
    default:
      return rec;
  }
}

function strengthBadge(strength: string): string {
  switch (strength) {
    case "strong":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
    case "moderate":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
    case "weak":
      return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400";
    default:
      return "bg-board-bg text-board-text-secondary";
  }
}

export function TeamBriefDisplay() {
  const {
    teamBrief,
    projectBrief,
    resources,
    restartSession,
    setStep,
    responses,
    improveBrief,
    improvingBrief,
    founderVisionContent,
    founderVisionLoading,
    founderVisionComplete,
    getFounderVision,
  } = useTeamContext();

  if (!teamBrief) {
    return (
      <div className="text-center py-12 text-board-text-tertiary text-sm">
        Team Brief is not yet available.
      </div>
    );
  }

  const { alignment, critical_risks, build_priorities, unknowns, verdict } = teamBrief;
  const founderBadgeColor = ROLE_BADGE_COLORS["integrator"] ?? DEFAULT_BADGE_COLOR;

  const briefExportData = {
    projectBrief,
    resources,
    responses,
    teamBrief,
    founderVisionContent,
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header with Improve + Export buttons */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <ExportDropdown
            options={[
              { label: "Print / Save as PDF", onClick: () => printFullBrief(briefExportData) },
              { label: "Download .md", onClick: () => downloadFullBriefMarkdown(briefExportData) },
              { label: "Download .txt", onClick: () => downloadFullBriefText(briefExportData) },
            ]}
          />
          <button
            onClick={() => improveBrief()}
            disabled={improvingBrief}
            className="rounded-lg border border-board-border bg-board-surface px-3 py-1.5 text-xs font-medium text-board-text-secondary transition-colors hover:border-board-accent/40 hover:text-board-text disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {improvingBrief ? "Improving…" : "Improve ✦"}
          </button>
        </div>
      </div>

      {/* Verdict */}
      <div className={`rounded-xl border p-6 ${verdictColour(verdict.recommendation)}`}>
        <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">
          Team Verdict
        </p>
        <p className="text-3xl font-bold mb-3">{verdictLabel(verdict.recommendation)}</p>
        <p className="text-sm leading-relaxed">{verdict.summary}</p>
        {verdict.conditions.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-2">
              Conditions
            </p>
            <ul className="space-y-1">
              {verdict.conditions.map((c, i) => (
                <li key={i} className="text-xs">• {c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Alignment */}
      <div className="rounded-xl border border-board-border bg-board-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-board-text">Team Alignment</h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${strengthBadge(alignment.strength)}`}
          >
            {alignment.strength}
          </span>
        </div>
        {alignment.areas.length > 0 ? (
          <ul className="space-y-1.5">
            {alignment.areas.map((area, i) => (
              <li key={i} className="flex gap-2 text-sm text-board-text-secondary">
                <span className="text-board-accent mt-0.5 shrink-0">✓</span>
                <span>{area}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-board-text-tertiary italic">No strong alignment areas identified.</p>
        )}
      </div>

      {/* Critical risks */}
      {critical_risks.length > 0 && (
        <div className="rounded-xl border border-board-border bg-board-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-board-border">
            <h3 className="text-sm font-semibold text-board-text">Critical Risks</h3>
          </div>
          <div className="divide-y divide-board-border">
            {critical_risks.map((r, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-xs font-medium text-board-text-tertiary rounded-full bg-board-bg px-2 py-0.5 border border-board-border shrink-0">
                    {r.raised_by}
                  </span>
                </div>
                <p className="text-sm font-medium text-board-text mb-0.5">{r.risk}</p>
                <p className="text-xs text-board-text-secondary">{r.implication}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Build priorities */}
      {build_priorities.length > 0 && (
        <div className="rounded-xl border border-board-border bg-board-surface p-5">
          <h3 className="text-sm font-semibold text-board-text mb-3">Build Priorities</h3>
          <ol className="space-y-2">
            {build_priorities.map((p, i) => (
              <li key={i} className="flex gap-3 text-sm text-board-text-secondary">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-board-accent/10 text-xs font-bold text-board-accent">
                  {i + 1}
                </span>
                <span className="mt-0.5">{p}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Unknowns */}
      {unknowns.length > 0 && (
        <div className="rounded-xl border border-board-border bg-board-surface p-5">
          <h3 className="text-sm font-semibold text-board-text mb-3">Open Questions</h3>
          <ul className="space-y-1.5">
            {unknowns.map((u, i) => (
              <li key={i} className="flex gap-2 text-sm text-board-text-secondary">
                <span className="text-board-text-tertiary mt-0.5 shrink-0">?</span>
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setStep("team_review")}
          disabled={responses.length === 0}
          className="flex-1 rounded-xl border border-board-border px-4 py-2.5 text-sm font-medium text-board-text-secondary transition-colors hover:bg-board-surface disabled:opacity-40"
        >
          ← Review Responses
        </button>
        <button
          onClick={restartSession}
          className="flex-1 rounded-xl border border-board-border px-4 py-2.5 text-sm font-medium text-board-text-secondary transition-colors hover:bg-board-surface"
        >
          New Project
        </button>
      </div>

      {/* Founder Vision section */}
      <div className="pt-2">
        <div className="border-t border-board-border mb-6" />

        {!founderVisionLoading && !founderVisionComplete && (
          <div>
            <div className="mb-4">
              <h3 className="text-base font-semibold text-board-text mb-1">Founder&apos;s Vision</h3>
              <p className="text-sm text-board-text-secondary">
                Invite the Founder to review the specialist case and chart the path forward.
              </p>
            </div>
            <button
              onClick={() => getFounderVision()}
              className="w-full rounded-xl bg-board-accent px-6 py-3 text-sm font-semibold text-board-accent-contrast transition-opacity hover:opacity-90"
            >
              Get Founder&apos;s Vision →
            </button>
          </div>
        )}

        {(founderVisionLoading || founderVisionComplete) && (
          <div
            className={[
              "rounded-xl border p-5",
              founderVisionComplete
                ? "border-board-accent/30 bg-board-accent/5"
                : "border-board-border bg-board-surface",
            ].join(" ")}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-board-text">Founder</span>
              <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${founderBadgeColor}`}>
                integrator
              </span>
              {founderVisionLoading && (
                <span className="h-3 w-3 rounded-full border-2 border-board-accent/40 border-t-board-accent animate-spin ml-1" />
              )}
            </div>
            <p className="text-sm text-board-text-secondary whitespace-pre-wrap leading-relaxed">
              {founderVisionContent}
              {founderVisionLoading && founderVisionContent && (
                <span className="inline-block w-0.5 h-4 bg-board-text-secondary ml-0.5 animate-blink" />
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
