import Link from "next/link";
import {
  getNewsrooms,
  getBeats,
  getEditions,
  getWire,
  getMonthSpend,
} from "@/lib/data";
import { createNewsroom } from "@/app/actions";
import RunButton from "@/components/RunButton";
import { createClient } from "@/lib/supabase/server";
import Landing from "@/components/Landing";

export const dynamic = "force-dynamic";

/** Dual-mode root: signed-out visitors see the public landing; the Editor sees the dashboard. */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <Landing />;
  return <Dashboard searchParams={searchParams} />;
}

async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n } = await searchParams;
  const rooms = await getNewsrooms();

  if (rooms.length === 0) return <FoundNewsroom />;

  const room = rooms.find((r) => r.id === n) ?? rooms[0];
  const [beats, editions, wire, spend] = await Promise.all([
    getBeats(room.id),
    getEditions(room.id),
    getWire(room.id),
    getMonthSpend(room.id),
  ]);

  const totalTokens = spend.inputTokens + spend.outputTokens;
  const pct = Math.min(100, Math.round((totalTokens / room.token_budget) * 100));
  const published = editions.filter((e) => e.status === "published");

  return (
    <div className="space-y-8">
      {rooms.length > 1 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {rooms.map((r) => (
            <Link
              key={r.id}
              href={`/?n=${r.id}`}
              className={`rounded-full border px-3 py-1 ${
                r.id === room.id
                  ? "border-brass-600 text-brass-400"
                  : "border-ink-700 text-paper-300 hover:text-paper-50"
              }`}
            >
              {r.name}
            </Link>
          ))}
        </div>
      )}

      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-700 pb-5">
        <div>
          <h2 className="font-serif text-2xl text-paper-50">{room.name}</h2>
          {room.masthead && (
            <p className="text-sm text-paper-300">{room.masthead}</p>
          )}
        </div>
        <RunButton
          endpoint="/api/editions/run"
          body={{ newsroomId: room.id }}
          idle="Run an edition →"
          busy="Assembling…"
          doneTemplate="Assembled with {items} item(s)."
        />
      </section>

      {/* Budget cockpit */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Beats" value={beats.filter((b) => b.active).length} />
        <Stat label="On the wire" value={wire.length} />
        <Stat label="Published" value={published.length} />
        <Stat label="Filed this month" value={spend.filed} />
      </section>

      <section className="rounded-lg border border-ink-700 bg-ink-900/40 p-4">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-paper-500">
          <span>Column inches · {totalTokens.toLocaleString()} tokens</span>
          <span>{pct}% of budget</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-800">
          <div
            className={`h-full ${pct > 90 ? "bg-red-500/80" : "bg-brass-600"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      {/* Beat health */}
      <section>
        <SectionHead>The desks</SectionHead>
        <div className="grid gap-3 sm:grid-cols-2">
          {beats.map((b) => (
            <div
              key={b.id}
              className="rounded-lg border border-ink-700 bg-ink-900/40 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg text-paper-50">{b.name}</h3>
                <span
                  className={`text-[10px] uppercase tracking-wide ${
                    b.active ? "text-brass-400" : "text-paper-500"
                  }`}
                >
                  {b.active ? "staffed" : "idle"}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-paper-300">
                {b.brief}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-paper-500">
                  {b.recency_days}d window · floor {b.significance_floor}
                </span>
                <RunButton
                  endpoint="/api/desks/run"
                  body={{ beatId: b.id }}
                  idle="File"
                  busy="Researching…"
                  doneTemplate="Filed {filed} of {found}."
                  className="rounded border border-ink-600 px-2.5 py-1 text-xs text-paper-200 hover:border-brass-600 hover:text-brass-400 disabled:opacity-50"
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm">
          <Link href="/newsroom" className="text-brass-400 hover:text-brass">
            Manage the newsroom →
          </Link>
        </p>
      </section>

      {/* Latest editions */}
      <section>
        <SectionHead>Latest editions</SectionHead>
        {editions.length === 0 ? (
          <p className="text-sm text-paper-300">
            No editions yet — run the desks, then assemble an edition.
          </p>
        ) : (
          <ul className="divide-y divide-ink-800 rounded-lg border border-ink-700">
            {editions.slice(0, 6).map((e) => (
              <li key={e.id} className="flex items-center justify-between p-3">
                <Link
                  href={`/editions/${e.id}`}
                  className="font-serif text-paper-100 hover:text-paper-50"
                >
                  {e.title}
                </Link>
                <span className="text-[11px] uppercase tracking-wide text-paper-500">
                  {e.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-4">
      <div className="font-serif text-2xl text-paper-50">{value}</div>
      <div className="text-[11px] uppercase tracking-widest text-paper-500">
        {label}
      </div>
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 border-b border-ink-800 pb-2 text-xs uppercase tracking-widest text-brass-400">
      {children}
    </h2>
  );
}

function FoundNewsroom() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-10">
      <h2 className="font-serif text-2xl text-paper-50">Found your newsroom</h2>
      <p className="text-sm text-paper-300">
        Name your newsroom and we&apos;ll seat two starter desks. You&apos;re the
        Editor-in-Chief.
      </p>
      <form action={createNewsroom} className="space-y-3">
        <input
          name="name"
          required
          placeholder="e.g. BrightPath Intelligence"
          className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
        />
        <input
          name="masthead"
          placeholder="Masthead / tagline (optional)"
          className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
        />
        <button className="w-full rounded-sm bg-navy px-3 py-2.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-navy-soft">
          Open the newsroom
        </button>
      </form>
    </div>
  );
}
