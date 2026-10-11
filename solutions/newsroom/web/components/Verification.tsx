import { verifyFiling } from "@/app/actions";
import type { Verification } from "@/lib/types";

export function VerificationBadge({ state }: { state: Verification }) {
  const map: Record<Verification, string> = {
    verified: "bg-emerald-500/15 text-emerald-300",
    flagged: "bg-amber-500/15 text-amber-300",
    unverified: "bg-ink-700 text-paper-400",
  };
  const label: Record<Verification, string> = {
    verified: "✓ verified",
    flagged: "⚑ flagged",
    unverified: "unverified",
  };
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${map[state]}`}
    >
      {label[state]}
    </span>
  );
}

/** Verify / flag / reset buttons for a filing (the sourcing-standards gate). */
export function VerifyControls({
  filingId,
  current,
  editionId,
}: {
  filingId: string;
  current: Verification;
  editionId?: string;
}) {
  const Btn = ({
    value,
    label,
    cls,
  }: {
    value: Verification;
    label: string;
    cls: string;
  }) => (
    <form action={verifyFiling}>
      <input type="hidden" name="filingId" value={filingId} />
      {editionId && <input type="hidden" name="editionId" value={editionId} />}
      <input type="hidden" name="verification" value={value} />
      <button
        disabled={current === value}
        className={`rounded border px-1.5 py-0.5 text-[10px] ${cls} disabled:opacity-40`}
      >
        {label}
      </button>
    </form>
  );

  return (
    <div className="flex gap-1">
      <Btn
        value="verified"
        label="Verify"
        cls="border-emerald-600/60 text-emerald-400 hover:bg-emerald-600/10"
      />
      <Btn
        value="flagged"
        label="Flag"
        cls="border-amber-600/60 text-amber-400 hover:bg-amber-600/10"
      />
      {current !== "unverified" && (
        <Btn
          value="unverified"
          label="reset"
          cls="border-ink-600 text-paper-400 hover:text-paper-100"
        />
      )}
    </div>
  );
}
