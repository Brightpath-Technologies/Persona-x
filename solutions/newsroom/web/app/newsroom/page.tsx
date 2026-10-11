import { getNewsrooms, getBeats, getArchivedBeats } from "@/lib/data";
import {
  createBeat,
  toggleBeat,
  setBeatCadence,
  archiveBeat,
  restoreBeat,
  deleteBeat,
} from "@/app/actions";
import { STAFFABLE_MODELS, modelLabel } from "@/lib/pricing";
import {
  BEAT_CATEGORIES,
  CADENCE_OPTIONS,
  cadenceLabel,
} from "@/lib/categories";
import RunButton from "@/components/RunButton";
import type { Beat } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewsroomPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n } = await searchParams;
  const rooms = await getNewsrooms();
  if (rooms.length === 0) {
    return <p className="text-sm text-paper-300">Found a newsroom first.</p>;
  }
  const room = rooms.find((r) => r.id === n) ?? rooms[0];
  const [beats, archived] = await Promise.all([
    getBeats(room.id),
    getArchivedBeats(room.id),
  ]);

  return (
    <div className="space-y-8">
      <div className="border-b border-ink-700 pb-4">
        <h2 className="font-serif text-2xl text-paper-50">The Newsroom</h2>
        <p className="text-sm text-paper-300">
          A beat is the topic; its desk is the agent that covers it. Hire desks,
          set a re-check cadence, and tune each one. Desks file to the wire.
        </p>
      </div>

      <section className="space-y-3">
        {beats.length === 0 && (
          <p className="text-sm text-paper-300">
            No desks yet — hire one below.
          </p>
        )}
        {beats.map((b) => (
          <div
            key={b.id}
            className="rounded-lg border border-ink-700 bg-ink-900/40 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-lg text-paper-50">{b.name}</h3>
                  {b.category && (
                    <span className="rounded-full border border-ink-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-paper-400">
                      {b.category}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-paper-300">{b.brief}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] uppercase tracking-wide text-paper-500">
                  <span>{b.recency_days}-day window</span>
                  <span>floor: {b.significance_floor}</span>
                  <span>{modelLabel(b.model)}</span>
                  <span>cadence: {cadenceLabel(b.cadence_hours)}</span>
                  {b.last_run_at && (
                    <span>
                      last run{" "}
                      {new Date(b.last_run_at).toLocaleDateString("en-AU")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <RunButton
                    endpoint="/api/desks/run"
                    body={{ beatId: b.id }}
                    idle="File now"
                    busy="Researching…"
                    doneTemplate="Filed {filed}."
                    className="rounded border border-brass-600 px-2.5 py-1 text-xs text-brass-400 hover:bg-brass-600/15 disabled:opacity-50"
                  />
                  <form action={toggleBeat}>
                    <input type="hidden" name="beatId" value={b.id} />
                    <input type="hidden" name="active" value={String(b.active)} />
                    <button className="rounded border border-ink-600 px-2.5 py-1 text-xs text-paper-300 hover:text-paper-50">
                      {b.active ? "Stand down" : "Staff"}
                    </button>
                  </form>
                  <form action={archiveBeat}>
                    <input type="hidden" name="beatId" value={b.id} />
                    <button className="rounded border border-ink-600 px-2.5 py-1 text-xs text-paper-400 hover:text-paper-100">
                      Archive
                    </button>
                  </form>
                </div>
                <form
                  action={setBeatCadence}
                  className="flex items-center gap-1"
                >
                  <input type="hidden" name="beatId" value={b.id} />
                  <select
                    name="cadence_hours"
                    defaultValue={String(b.cadence_hours ?? 0)}
                    className="rounded border border-ink-700 bg-ink-900 px-2 py-1 text-[11px] text-paper-300"
                  >
                    {CADENCE_OPTIONS.map((c) => (
                      <option key={c.hours} value={c.hours}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button className="rounded border border-ink-600 px-2 py-1 text-[11px] text-paper-300 hover:text-paper-50">
                    set cadence
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Hire a desk */}
      <section className="rounded-lg border border-ink-700 bg-ink-900/40 p-5">
        <h3 className="mb-3 font-serif text-lg text-paper-50">
          Hire a desk for a new beat
        </h3>
        <form action={createBeat} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="newsroomId" value={room.id} />
          <input
            name="name"
            required
            placeholder="Beat name (e.g. Competitor moves)"
            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm sm:col-span-2"
          />
          <textarea
            name="brief"
            required
            rows={2}
            placeholder="Standing assignment — what should this desk watch for?"
            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm sm:col-span-2"
          />
          <label className="text-xs text-paper-300">
            Category
            <select
              name="category"
              defaultValue=""
              className="mt-1 w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            >
              <option value="">— none —</option>
              {BEAT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-paper-300">
            Re-check cadence
            <select
              name="cadence_hours"
              defaultValue="0"
              className="mt-1 w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            >
              {CADENCE_OPTIONS.map((c) => (
                <option key={c.hours} value={c.hours}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-paper-300">
            Recency window (days)
            <input
              name="recency_days"
              type="number"
              defaultValue={7}
              min={1}
              max={60}
              className="mt-1 w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-paper-300">
            Significance floor
            <select
              name="significance_floor"
              defaultValue="medium"
              className="mt-1 w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label className="text-xs text-paper-300 sm:col-span-2">
            Model
            <select
              name="model"
              defaultValue="claude-opus-4-8"
              className="mt-1 w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            >
              {STAFFABLE_MODELS.map((m) => (
                <option key={m} value={m}>
                  {modelLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded-sm bg-navy px-3 py-2.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-navy-soft sm:col-span-2">
            Hire the desk
          </button>
        </form>
      </section>

      {/* Archived */}
      {archived.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-widest text-paper-500">
            Archived desks
          </h3>
          {archived.map((b: Beat) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-900/20 px-4 py-2.5"
            >
              <div className="min-w-0">
                <span className="text-sm text-paper-300">{b.name}</span>
                {b.category && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-paper-500">
                    {b.category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <form action={restoreBeat}>
                  <input type="hidden" name="beatId" value={b.id} />
                  <button className="rounded border border-ink-600 px-2.5 py-1 text-xs text-paper-300 hover:text-paper-50">
                    Restore
                  </button>
                </form>
                <form action={deleteBeat}>
                  <input type="hidden" name="beatId" value={b.id} />
                  <button className="rounded border border-ink-700 px-2.5 py-1 text-xs text-paper-500 hover:border-red-500/60 hover:text-red-400">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
