import Link from "next/link";
import { getNewsrooms, getSubscribers } from "@/lib/data";
import {
  addSubscriberManual,
  removeSubscriber,
  confirmSubscriber,
} from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function SubscribersPage({
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
  const subs = await getSubscribers(room.id);
  const active = subs.filter((s) => s.status === "active");
  const confirmed = active.filter((s) => s.confirmed_at);
  const pending = active.filter((s) => !s.confirmed_at);
  const emailable = confirmed.filter((s) => s.email_enabled);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="font-display text-2xl font-light text-paper-50">
            Subscribers
          </h2>
          <p className="text-sm text-grey">
            {confirmed.length} confirmed · {pending.length} pending ·{" "}
            {emailable.length} receiving email · {subs.length - active.length}{" "}
            unsubscribed
          </p>
        </div>
        <div className="flex items-center gap-3">
          {room.is_public ? (
            <Link
              href={`/read/${room.slug}`}
              className="text-xs text-navy hover:underline"
            >
              Public subscribe page →
            </Link>
          ) : (
            <span className="text-xs text-grey">
              Make the newsroom public (Editions) to accept sign-ups.
            </span>
          )}
          <a
            href={`/api/subscribers/export?n=${room.id}`}
            className="rounded border border-line px-3 py-1.5 text-xs text-grey hover:text-navy"
          >
            Export CSV
          </a>
        </div>
      </div>

      <form
        action={addSubscriberManual}
        className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3"
      >
        <input type="hidden" name="newsroomId" value={room.id} />
        <input
          name="email"
          type="email"
          required
          placeholder="add a subscriber by email"
          className="min-w-0 flex-1 rounded border border-line bg-white px-3 py-2 text-sm"
        />
        <button className="rounded-md bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy/90">
          Add
        </button>
      </form>

      {subs.length === 0 ? (
        <p className="text-sm text-grey">
          No subscribers yet. Share your public page to collect sign-ups.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {subs.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <span className="text-paper-50">{s.email}</span>
                <span className="ml-2 text-[11px] uppercase tracking-wide text-grey">
                  {s.status !== "active"
                    ? "unsubscribed"
                    : !s.confirmed_at
                      ? "pending"
                      : s.email_enabled
                        ? "confirmed"
                        : "confirmed · email off"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden text-[11px] text-grey sm:block">
                  {new Date(s.created_at).toLocaleDateString("en-AU")}
                </span>
                {s.status === "active" && !s.confirmed_at && (
                  <form action={confirmSubscriber}>
                    <input type="hidden" name="subscriberId" value={s.id} />
                    <button className="rounded border border-line px-2 py-1 text-[11px] text-navy hover:bg-paper-100">
                      Confirm
                    </button>
                  </form>
                )}
                <form action={removeSubscriber}>
                  <input type="hidden" name="subscriberId" value={s.id} />
                  <button className="rounded border border-line px-2 py-1 text-[11px] text-grey hover:border-red-400 hover:text-red-500">
                    Remove
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
