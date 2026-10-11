import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy notice · The Newsroom",
  description: "How The Newsroom handles subscriber data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      <header>
        <p className="text-[11px] uppercase tracking-[0.32em] text-grey">
          Privacy notice
        </p>
        <h1 className="mt-2 font-display text-4xl font-light text-paper-50">
          What we collect, and why
        </h1>
        <p className="mt-2 text-sm text-grey">
          Plain language. This covers email subscriptions to editions published
          on this site.
        </p>
      </header>

      <Section title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Your email address</strong>, when you subscribe.
          </li>
          <li>
            <strong>Engagement signals</strong> — whether an emailed edition was
            opened, whether links in it were clicked, and whether a published
            edition was read on the website. These help us understand what
            readers find useful.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> collect your name, IP address, location, or
          any profile beyond the above.
        </p>
      </Section>

      <Section title="How we use it">
        <p>
          Solely to send you the editions you subscribed to, and to understand,
          in aggregate, which stories land. We don&apos;t build advertising
          profiles.
        </p>
      </Section>

      <Section title="Double opt-in">
        <p>
          When you subscribe we email a confirmation link first. You are not
          added to the list, and receive nothing, until you confirm.
        </p>
      </Section>

      <Section title="Sharing">
        <p>
          We do not sell, rent, or share your data with third parties. Email is
          delivered through our own mail provider purely to send you editions.
        </p>
      </Section>

      <Section title="Your control & retention">
        <p>
          Every email carries a link to manage your preferences or unsubscribe.
          You can turn email off, or remove yourself entirely, at any time. We
          keep your address only while you&apos;re subscribed; unsubscribing
          stops all sending, and you can ask us to delete your record.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions, or want your data removed? Email{" "}
          <a
            href="mailto:david@brightpathtechnology.io"
            className="text-navy hover:underline"
          >
            david@brightpathtechnology.io
          </a>
          .
        </p>
      </Section>

      <p className="border-t border-line pt-4 text-xs text-grey">
        This is a plain-language notice for transparency, not legal advice. It
        may be updated as the service evolves.
      </p>
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
