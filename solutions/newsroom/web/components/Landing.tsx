import Link from "next/link";
import { getFeaturedPublicNewsroom } from "@/lib/data";
import SubscribeForm from "@/components/SubscribeForm";

/**
 * Public landing page for signed-out visitors. Explains the approach and lets
 * readers subscribe — the front door that was missing. Features the most recent
 * public newsroom for "read the latest" + subscribe.
 */
export default async function Landing() {
  const room = await getFeaturedPublicNewsroom();

  return (
    <div className="space-y-16 py-4">
      {/* Hero */}
      <section className="text-center">
        <p className="text-[11px] uppercase tracking-[0.32em] text-grey">
          A newsroom where AI does the legwork and humans make the calls
        </p>
        <h1 className="mt-3 font-display text-4xl font-light leading-tight text-paper-50 sm:text-5xl">
          Twice-daily intelligence,
          <br />
          researched by AI &amp; signed off by people.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-grey">
          AI desks scour the live web for what&apos;s significant on the beats
          that matter. A human editor decides what&apos;s true, what matters, and
          what gets published — and credits and pays the people whose expertise,
          reporting, and photography shape the story.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {room && (
            <Link
              href={`/read/${room.slug}`}
              className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90"
            >
              Read the latest →
            </Link>
          )}
          <Link
            href="/about"
            className="rounded-md border border-line px-4 py-2 text-sm text-navy hover:bg-paper-100"
          >
            How it works
          </Link>
        </div>
      </section>

      {/* Subscribe */}
      {room ? (
        <section className="mx-auto max-w-lg rounded-xl border border-line bg-paper-100/40 p-6 text-center">
          <h2 className="font-display text-xl font-light text-paper-50">
            Subscribe to {room.name}
          </h2>
          {room.masthead && (
            <p className="mt-1 text-sm text-grey">{room.masthead}</p>
          )}
          <p className="mt-1 text-xs text-grey">
            New editions in your inbox. Unsubscribe anytime · or follow by{" "}
            <Link
              href={`/read/${room.slug}/rss`}
              className="text-navy hover:underline"
            >
              RSS
            </Link>
            .
          </p>
          <div className="mx-auto mt-4 max-w-md">
            <SubscribeForm slug={room.slug} />
          </div>
        </section>
      ) : (
        <section className="text-center text-sm text-grey">
          No public newsroom is live yet — check back soon.
        </section>
      )}

      {/* How it works */}
      <section className="grid gap-6 sm:grid-cols-3">
        {[
          {
            n: "1",
            h: "Desks research",
            p: "AI reporters search the live web on each beat, file cited stories, and rate their significance — the low-judgement legwork.",
          },
          {
            n: "2",
            h: "Humans decide",
            p: "An editor reviews the wire, an editorial board challenges it, and nothing publishes without a human sign-off and stated rationale.",
          },
          {
            n: "3",
            h: "People are credited",
            p: "Writers, copy editors, photographers, and experts are attributed on the page and fairly compensated for their work.",
          },
        ].map((c) => (
          <div
            key={c.n}
            className="rounded-xl border border-line bg-white p-5"
          >
            <div className="font-display text-2xl font-light text-navy">
              {c.n}
            </div>
            <h3 className="mt-1 font-medium text-paper-50">{c.h}</h3>
            <p className="mt-1 text-sm text-grey">{c.p}</p>
          </div>
        ))}
      </section>

      <section className="text-center">
        <Link href="/about" className="text-sm text-navy hover:underline">
          Read more about the approach →
        </Link>
      </section>
    </div>
  );
}
