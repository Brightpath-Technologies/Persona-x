import { getNewsrooms, getAnalytics } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n } = await searchParams;
  const rooms = await getNewsrooms();
  if (rooms.length === 0) {
    return <p className="text-sm text-grey">Found a newsroom first.</p>;
  }
  const room = rooms.find((r) => r.id === n) ?? rooms[0];
  const a = await getAnalytics(room.id);

  return (
    <div className="space-y-8">
      <div className="border-b border-line pb-4">
        <h2 className="font-display text-2xl font-light text-paper-50">
          Readership
        </h2>
        <p className="text-sm text-grey">
          What readers actually do — opens, clicks, reads, and how the list is
          growing.
        </p>
      </div>

      {/* Subscriber growth */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active subscribers" value={a.subscribers.active} />
        <Stat label="New this month" value={a.subscribers.newThisMonth} />
        <Stat label="Unsubscribed" value={a.subscribers.unsubscribed} muted />
        <Stat label="Email off" value={a.subscribers.emailOff} muted />
      </section>

      {/* Engagement totals */}
      <section>
        <SectionHead>Engagement (all-time)</SectionHead>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Email opens" value={a.totals.opens} />
          <Stat label="Link clicks" value={a.totals.clicks} />
          <Stat label="Page reads" value={a.totals.views} />
        </div>
      </section>

      {/* Most read */}
      <section>
        <SectionHead>By edition · most read first</SectionHead>
        {a.perEdition.length === 0 ? (
          <p className="text-sm text-grey">
            No engagement yet. Publish and send an edition, and reads will show
            here.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="bg-paper-100/40 text-[11px] uppercase tracking-wide text-grey">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Edition</th>
                  <th className="px-3 py-2 text-right font-medium">Reads</th>
                  <th className="px-3 py-2 text-right font-medium">Opens</th>
                  <th className="px-3 py-2 text-right font-medium">Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {a.perEdition.map((e) => (
                  <tr key={e.editionId}>
                    <td className="px-4 py-2 text-paper-100">{e.title}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-navy">
                      {e.views}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-grey">
                      {e.opens}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-grey">
                      {e.clicks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11px] text-grey">
          Opens &amp; clicks are tracked in emailed editions; reads are tracked
          on the public page. Email open-tracking is approximate (some clients
          block images).
        </p>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div
        className={`font-display text-2xl ${muted ? "text-grey" : "text-navy"}`}
      >
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-widest text-grey">
        {label}
      </div>
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 border-b border-line pb-2 text-xs uppercase tracking-widest text-navy">
      {children}
    </h3>
  );
}
