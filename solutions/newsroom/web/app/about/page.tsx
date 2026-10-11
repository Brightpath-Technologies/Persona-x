import Link from "next/link";
import type { Metadata } from "next";
import { getFeaturedPublicNewsroom } from "@/lib/data";
import SubscribeForm from "@/components/SubscribeForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How it works · The Newsroom",
  description:
    "How The Newsroom uses AI for research while humans make the judgements — and how contributors are credited and paid.",
};

export default async function AboutPage() {
  const room = await getFeaturedPublicNewsroom();

  return (
    <div className="mx-auto max-w-2xl space-y-10 py-4">
      <header>
        <p className="text-[11px] uppercase tracking-[0.32em] text-grey">
          How it works
        </p>
        <h1 className="mt-2 font-display text-4xl font-light text-paper-50">
          AI does the legwork. Humans make the calls.
        </h1>
      </header>

      <Section title="The principle">
        <p>
          This newsroom is built on a simple rule, borrowed from Vaughn Tan:{" "}
          <em>
            don&apos;t outsource your subjective value judgements to an AI — and
            if you do, state the reason explicitly.
          </em>{" "}
          AI is excellent at gathering, transforming, and pattern-matching
          information. It cannot decide what is true, what matters, or what is
          worth your attention. Those are human jobs, and we keep them human.
        </p>
      </Section>

      <Section title="The workflow">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong>Desks research.</strong> AI reporters search the live web on
            each beat, file cited stories, and rate their significance.
          </li>
          <li>
            <strong>The wire is edited.</strong> A human editor reviews every
            filing — keeping, spiking, and assembling them into a draft edition.
          </li>
          <li>
            <strong>The board challenges.</strong> An editorial board pushes back
            on the draft for accuracy, significance, and risk.
          </li>
          <li>
            <strong>A human signs off.</strong> Nothing publishes without an
            editor stating, in their own words, why it is fit to publish. That
            rationale is recorded and shown as provenance on the article.
          </li>
        </ol>
      </Section>

      <Section title="Accountability">
        <p>
          Every article carries its provenance — researched by AI, selected and
          verified by a named human. We publish{" "}
          <strong>corrections</strong> openly and can withdraw an edition without
          erasing the record. Responsibility stays with people, not the tool.
        </p>
      </Section>

      <Section title="Real people, credited and paid">
        <p>
          The desks are AI, but original reporting, expertise, copy editing,
          photography, and art are human work. Contributors are{" "}
          <strong>attributed on the page</strong> and{" "}
          <strong>fairly compensated</strong> — recognising that meaning-making
          and craft have value the machine cannot supply.
        </p>
      </Section>

      <Section title="Following along">
        <p>
          Read editions on the web, subscribe by email for new editions in your
          inbox, or follow the RSS feed. You can unsubscribe at any time.
        </p>
      </Section>

      {room && (
        <section className="rounded-xl border border-line bg-paper-100/40 p-6 text-center">
          <h2 className="font-display text-xl font-light text-paper-50">
            Subscribe to {room.name}
          </h2>
          <div className="mx-auto mt-4 max-w-md">
            <SubscribeForm slug={room.slug} />
          </div>
          <p className="mt-3 text-xs text-grey">
            or follow by{" "}
            <Link
              href={`/read/${room.slug}/rss`}
              className="text-navy hover:underline"
            >
              RSS
            </Link>{" "}
            ·{" "}
            <Link href={`/read/${room.slug}`} className="text-navy hover:underline">
              read the latest
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-light text-navy">{title}</h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-grey">
        {children}
      </div>
    </section>
  );
}
