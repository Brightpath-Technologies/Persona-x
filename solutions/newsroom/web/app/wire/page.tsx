import Link from "next/link";
import { getNewsrooms, getWire } from "@/lib/data";
import { spikeFiling } from "@/app/actions";
import { rankFilings } from "@/lib/wire-editor";
import RunButton from "@/components/RunButton";
import { VerificationBadge, VerifyControls } from "@/components/Verification";

export const dynamic = "force-dynamic";

export default async function WirePage({
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
  const wire = rankFilings(await getWire(room.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink-700 pb-4">
        <div>
          <h2 className="font-serif text-2xl text-paper-50">The Wire</h2>
          <p className="text-sm text-paper-300">
            Filed stories awaiting your call. File more, spike the noise, then
            assemble an edition.
          </p>
        </div>
        <RunButton
          endpoint="/api/editions/run"
          body={{ newsroomId: room.id }}
          idle="Assemble edition →"
          busy="Assembling…"
          doneTemplate="Edition with {items} item(s)."
        />
      </div>

      {wire.length === 0 ? (
        <p className="text-sm text-paper-300">
          The wire is quiet. Send a desk out from{" "}
          <Link href="/newsroom" className="text-brass-400 hover:text-brass">
            the newsroom
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {wire.map((f) => (
            <li
              key={f.id}
              className="rounded-lg border border-ink-700 bg-ink-900/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
                    <span className="text-brass-600">{f.beat_name}</span>
                    <SigTag sig={f.significance} />
                    {f.official && (
                      <span className="rounded bg-brass-600/15 px-1.5 py-0.5 text-brass-400">
                        official
                      </span>
                    )}
                    {!f.published_at && (
                      <span className="text-paper-500">undated</span>
                    )}
                    <VerificationBadge state={f.verification} />
                  </div>
                  <h3 className="font-serif text-lg leading-snug text-paper-50">
                    {f.headline}
                  </h3>
                  <p className="mt-1 text-sm text-paper-300">{f.summary}</p>
                  <div className="mt-2 text-[11px] text-paper-500">
                    {f.source ?? "unknown source"}
                    {f.published_at ? ` · ${f.published_at}` : ""}
                    {f.url && (
                      <>
                        {" · "}
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brass-400 hover:text-brass"
                        >
                          source
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <form action={spikeFiling}>
                    <input type="hidden" name="filingId" value={f.id} />
                    <button className="rounded border border-ink-600 px-2 py-1 text-xs text-paper-400 hover:border-red-500/60 hover:text-red-400">
                      Spike
                    </button>
                  </form>
                  <VerifyControls filingId={f.id} current={f.verification} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SigTag({ sig }: { sig: "low" | "medium" | "high" }) {
  const map = {
    high: "bg-red-500/10 text-red-700",
    medium: "bg-amber-500/15 text-amber-700",
    low: "bg-ink-800 text-paper-400",
  } as const;
  return (
    <span className={`rounded px-1.5 py-0.5 ${map[sig]}`}>{sig}</span>
  );
}
