import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEdition,
  getEditionCredits,
  getEditionFilings,
  getContributors,
  type Credit,
} from "@/lib/data";
import { addCredit, setContributionStatus } from "@/app/actions";
import { CONTRIBUTOR_ROLES, roleLabel } from "@/lib/roles";
import EditionEditor from "@/components/EditionEditor";
import RunButton from "@/components/RunButton";
import PublishPanel from "@/components/PublishPanel";
import CorrectionForm from "@/components/CorrectionForm";
import { VerificationBadge, VerifyControls } from "@/components/Verification";
import type { BoardReview, Contributor, Filing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const edition = await getEdition(id);
  if (!edition) notFound();

  const review = edition.board_review as BoardReview | null;
  const [credits, roster, storyFilings] = await Promise.all([
    getEditionCredits(id),
    getContributors(edition.newsroom_id),
    getEditionFilings(id),
  ]);
  const published = edition.status === "published";
  const deferred = edition.status === "deferred";
  const cancelled = edition.status === "cancelled";
  const archived = edition.archived_at != null;

  const stories = storyFilings.filter((f) => f.status !== "spiked");
  const unverified = stories.filter(
    (f) => f.verification === "unverified"
  ).length;
  const flagged = stories.filter((f) => f.verification === "flagged").length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <article>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link href="/editions" className="text-xs text-paper-400 hover:text-paper-100">
            ← Editions
          </Link>
          <span className="text-[10px] uppercase tracking-widest text-brass-600">
            {edition.status.replace("_", " ")}
            {archived ? " · archived" : ""}
          </span>
        </div>

        {/* Provenance — who/what made this, transparently */}
        <div className="mb-5 rounded-md border border-ink-800 bg-ink-900/40 p-3 text-xs text-paper-400">
          Researched by AI desks · selected, verified, edited &amp; signed off by
          a human editor.
          {edition.editor_note && (
            <div className="mt-1 text-paper-300">
              <span className="text-paper-500">Sign-off rationale:</span> “
              {edition.editor_note}”
            </div>
          )}
        </div>

        {edition.corrections.length > 0 && (
          <div className="mb-5 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
            <div className="text-[11px] uppercase tracking-widest text-amber-300">
              Corrections
            </div>
            <ul className="mt-1 space-y-1 text-sm text-paper-200">
              {edition.corrections.map((c, i) => (
                <li key={i}>
                  <span className="text-paper-500">
                    {new Date(c.at).toLocaleDateString("en-AU")}:
                  </span>{" "}
                  {c.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        <EditionEditor
          editionId={edition.id}
          title={edition.title}
          body={edition.body ?? ""}
          canEdit={!published && !cancelled}
        />
      </article>

      <aside className="space-y-5">
        <Panel title="Editorial desk">
          {cancelled ? (
            <div className="space-y-3 text-sm">
              <p className="text-paper-300">
                Cancelled — its stories were returned to the wire.
              </p>
              <RunButton
                endpoint={`/api/editions/${edition.id}/state`}
                body={{ action: "resume" }}
                idle="Reopen as draft"
                busy="…"
                doneTemplate="Reopened."
                className="w-full rounded border border-ink-600 px-3 py-1.5 text-xs text-paper-300 hover:text-paper-50 disabled:opacity-50"
              />
            </div>
          ) : deferred ? (
            <div className="space-y-3 text-sm">
              <p className="text-paper-300">
                Deferred — held for a later edition.
              </p>
              <RunButton
                endpoint={`/api/editions/${edition.id}/state`}
                body={{ action: "resume" }}
                idle="Resume editing"
                busy="…"
                doneTemplate="Resumed."
                className="w-full rounded-md border border-brass-600 bg-brass-600/10 px-3 py-2 text-sm font-medium text-brass-400 hover:bg-brass-600/20 disabled:opacity-50"
              />
            </div>
          ) : !published ? (
            <div className="space-y-3">
              <RunButton
                endpoint={`/api/editions/${edition.id}/review`}
                idle="Convene the board"
                busy="The board is reading…"
                doneTemplate="Consensus: {review.consensus}."
                className="w-full rounded-md border border-ink-600 px-3 py-2 text-sm text-paper-200 hover:border-brass-600 hover:text-brass-400 disabled:opacity-50"
              />
              <PublishPanel
                editionId={edition.id}
                unverified={unverified}
                flagged={flagged}
              />
              <div className="flex gap-2 border-t border-ink-800 pt-3">
                <RunButton
                  endpoint={`/api/editions/${edition.id}/state`}
                  body={{ action: "defer" }}
                  idle="Defer"
                  busy="…"
                  doneTemplate="Deferred."
                  className="flex-1 rounded border border-ink-600 px-2 py-1.5 text-xs text-paper-300 hover:text-paper-50 disabled:opacity-50"
                />
                <RunButton
                  endpoint={`/api/editions/${edition.id}/state`}
                  body={{ action: "cancel" }}
                  idle="Cancel edition"
                  busy="…"
                  doneTemplate="Cancelled — {released} returned to wire."
                  className="flex-1 rounded border border-ink-700 px-2 py-1.5 text-xs text-paper-400 hover:border-red-500/60 hover:text-red-400 disabled:opacity-50"
                />
              </div>
              <p className="text-[11px] text-paper-500">
                No relevant news? Defer to hold for later, or cancel to release
                the stories back to the wire.
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-paper-300">
                Signed off
                {edition.published_at
                  ? ` ${new Date(edition.published_at).toLocaleString("en-AU")}`
                  : ""}
                .
              </p>
              <RunButton
                endpoint={`/api/editions/${edition.id}/send`}
                idle="Send to subscribers"
                busy="Sending…"
                doneTemplate="Sent to {sent}/{subscribers}."
                className="w-full rounded-md border border-brass-600 bg-brass-600/10 px-3 py-2 text-sm font-medium text-brass-400 hover:bg-brass-600/20 disabled:opacity-50"
              />
              <div className="flex gap-2 text-xs">
                <a
                  href={`/api/editions/${edition.id}/export?format=md`}
                  className="flex-1 rounded border border-ink-600 px-2 py-1.5 text-center text-paper-200 hover:border-brass-600"
                >
                  Export .md
                </a>
                <a
                  href={`/api/editions/${edition.id}/export?format=html`}
                  className="flex-1 rounded border border-ink-600 px-2 py-1.5 text-center text-paper-200 hover:border-brass-600"
                >
                  Export .html
                </a>
              </div>
              <RunButton
                endpoint={`/api/editions/${edition.id}/archive`}
                idle={archived ? "Unarchive" : "Archive"}
                busy="…"
                doneTemplate="Updated."
                className="w-full rounded border border-ink-600 px-3 py-1.5 text-xs text-paper-300 hover:text-paper-50 disabled:opacity-50"
              />
              {edition.last_sent_at && (
                <p className="text-[11px] text-paper-500">
                  Last sent{" "}
                  {new Date(edition.last_sent_at).toLocaleString("en-AU")}.
                </p>
              )}
            </div>
          )}
        </Panel>

        {stories.length > 0 && (
          <Panel
            title="Verification"
            right={`${stories.length - unverified - flagged}/${stories.length} verified`}
          >
            <p className="mb-2 text-[11px] text-paper-500">
              Confirm each story before publishing — ideally a second source.
              {unverified > 0 && ` ${unverified} unverified.`}
              {flagged > 0 && ` ${flagged} flagged.`}
            </p>
            <ul className="space-y-2">
              {stories.map((f: Filing) => (
                <li key={f.id} className="text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 text-paper-200">{f.headline}</span>
                    <VerificationBadge state={f.verification} />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="truncate text-[11px] text-paper-500">
                      {f.source ?? "no source"}
                      {!f.url && " · no URL"}
                    </span>
                    {!published && !cancelled && (
                      <VerifyControls
                        filingId={f.id}
                        current={f.verification}
                        editionId={edition.id}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {published && (
          <Panel title="Issue a correction">
            <CorrectionForm editionId={edition.id} />
          </Panel>
        )}

        {review && (
          <Panel title="The board" right={`consensus: ${review.consensus}`}>
            <ul className="space-y-3">
              {review.verdicts.map((v) => (
                <li key={v.persona} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-paper-100">{v.persona}</span>
                    <VerdictTag v={v.verdict} />
                  </div>
                  <p className="mt-0.5 text-xs text-paper-300">{v.rationale}</p>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel title="Human contributors">
          <CreditsLedger
            credits={credits}
            roster={roster}
            newsroomId={edition.newsroom_id}
            editionId={edition.id}
          />
        </Panel>
      </aside>
    </div>
  );
}

function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-brass-400">
          {title}
        </h3>
        {right && (
          <span className="text-[10px] uppercase tracking-wide text-paper-400">
            {right}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function CreditsLedger({
  credits,
  roster,
  newsroomId,
  editionId,
}: {
  credits: Credit[];
  roster: Contributor[];
  newsroomId: string;
  editionId: string;
}) {
  const owed = new Map<string, number>();
  for (const c of credits) {
    if (c.amount && c.status !== "paid") {
      owed.set(c.currency, (owed.get(c.currency) ?? 0) + Number(c.amount));
    }
  }

  return (
    <div className="space-y-3">
      {credits.length === 0 ? (
        <p className="text-xs text-paper-400">
          No human contributors credited yet. The desks are AI; original
          reporting, expertise, and photography are humans&apos; work — credit
          and compensate them here.
        </p>
      ) : (
        <ul className="space-y-2">
          {credits.map((c) => (
            <li key={c.id} className="text-sm">
              <div className="flex items-center justify-between">
                <span className="font-serif text-paper-100">
                  {c.contributor.name}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-paper-500">
                  {roleLabel(c.role)}
                </span>
              </div>
              {c.description && (
                <p className="text-xs text-paper-300">{c.description}</p>
              )}
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-paper-400">
                  {c.amount != null
                    ? `${c.currency} ${Number(c.amount).toFixed(2)}`
                    : "no fee set"}{" "}
                  · <span className="uppercase">{c.status}</span>
                </span>
                <form action={setContributionStatus} className="flex gap-1">
                  <input type="hidden" name="contributionId" value={c.id} />
                  <input type="hidden" name="editionId" value={editionId} />
                  {c.status !== "agreed" && (
                    <StatusBtn value="agreed">agree</StatusBtn>
                  )}
                  {c.status !== "paid" && (
                    <StatusBtn value="paid">mark paid</StatusBtn>
                  )}
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {owed.size > 0 && (
        <p className="border-t border-ink-800 pt-2 text-xs text-paper-300">
          Outstanding:{" "}
          {[...owed.entries()]
            .map(([cur, amt]) => `${cur} ${amt.toFixed(2)}`)
            .join(" · ")}
        </p>
      )}

      <form action={addCredit} className="space-y-2 border-t border-ink-800 pt-3">
        <input type="hidden" name="newsroomId" value={newsroomId} />
        <input type="hidden" name="editionId" value={editionId} />
        <input
          name="name"
          required
          list="roster-names"
          placeholder="Contributor name (pick from roster or type new)"
          className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs"
        />
        <datalist id="roster-names">
          {roster.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
        <div className="flex gap-2">
          <select
            name="role"
            className="rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs"
          >
            {CONTRIBUTOR_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <input
            name="amount"
            type="number"
            step="0.01"
            placeholder="fee"
            className="w-20 rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs"
          />
          <input
            name="currency"
            defaultValue="CAD"
            className="w-16 rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs"
          />
        </div>
        <input
          name="description"
          placeholder="What they contributed (the byline)"
          className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs"
        />
        <button className="w-full rounded border border-brass-600 px-2 py-1.5 text-xs text-brass-400 hover:bg-brass-600/15">
          Credit contributor
        </button>
      </form>
    </div>
  );
}

function StatusBtn({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <button
      name="status"
      value={value}
      className="rounded border border-ink-600 px-1.5 py-0.5 text-[10px] text-paper-300 hover:border-brass-600 hover:text-brass-400"
    >
      {children}
    </button>
  );
}

function VerdictTag({ v }: { v: "publish" | "hold" | "revise" }) {
  const map = {
    publish: "text-brass-400",
    hold: "text-red-300",
    revise: "text-amber-300",
  } as const;
  return (
    <span className={`text-[10px] uppercase tracking-wide ${map[v]}`}>{v}</span>
  );
}
