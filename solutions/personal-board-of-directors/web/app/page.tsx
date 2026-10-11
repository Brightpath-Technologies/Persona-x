import Link from "next/link";

const SERVICES = [
  {
    href: "/board",
    number: "01",
    name: "Personal Board of Directors",
    category: "Personal & business use",
    headline: "A panel of advisors for every decision that matters.",
    description:
      "Eight AI advisors — each with a distinct role-based perspective — analyse your situation and deliver structured, honest guidance. From career crossroads to business strategy, your board provides the clarity you need to move forward with confidence.",
    steps: [
      "Describe your decision",
      "Refine with probing questions",
      "Hear from each advisor",
      "Receive your board brief",
    ],
    cta: "Start a Session →",
  },
  {
    href: "/business-case",
    number: "02",
    name: "Business Case Builder",
    category: "Articulate your vision",
    headline: "Turn your thinking into a compelling business case.",
    description:
      "Walk through seven key interview questions with expert advisors providing constructive input at every step. The result is a polished, first-person business case you can use to align stakeholders, secure buy-in, and move your project forward.",
    steps: [
      "Select your advisory panel",
      "Answer 7 key questions",
      "Receive expert input on each answer",
      "Generate your business case",
    ],
    cta: "Build a Case →",
  },
  {
    href: "/decision-engine",
    number: "03",
    name: "Software Team Advisor",
    category: "Viability & gap analysis",
    headline: "A specialist software team for your next project.",
    description:
      "Assemble the right mix of specialists — from architecture and security to UX and brand — and get a unified brief on the viability of your idea. The Founder joins last to chart the path forward with a strategic, forward-looking vision.",
    steps: [
      "Describe your project",
      "Select (or auto-select) specialists",
      "Receive individual expert responses",
      "Get a team brief with Founder's vision",
    ],
    cta: "Consult the Team →",
  },
];

export default function HomePage() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="mb-10 pt-2">
        <h2 className="text-3xl font-serif text-board-text mb-3 leading-snug">
          AI advisory tools for decisions that matter.
        </h2>
        <p className="text-base text-board-text-secondary leading-relaxed max-w-2xl">
          Persona-X by BrightPath Technologies turns structured AI personas into practical advisory frameworks. Choose a tool below to get started.
        </p>
      </div>

      {/* Service cards */}
      <div className="space-y-5">
        {SERVICES.map((service) => (
          <div
            key={service.href}
            className="rounded-2xl border border-board-border bg-board-surface overflow-hidden"
          >
            <div className="px-6 pt-6 pb-5">
              {/* Header row */}
              <div className="flex items-start gap-3 mb-4">
                <span className="mt-0.5 shrink-0 text-xs font-bold tabular-nums text-board-accent bg-board-accent/10 rounded-full px-2 py-0.5">
                  {service.number}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-board-text leading-tight">
                      {service.name}
                    </h3>
                    <span className="rounded-full border border-board-border px-2 py-0.5 text-[10px] font-medium text-board-text-tertiary uppercase tracking-wide">
                      {service.category}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-board-text-secondary">
                    {service.headline}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-board-text-secondary leading-relaxed mb-5">
                {service.description}
              </p>

              {/* Steps */}
              <div className="flex flex-wrap gap-x-0 gap-y-1 mb-6 items-center">
                {service.steps.map((step, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span className="text-xs text-board-text-tertiary">{step}</span>
                    {i < service.steps.length - 1 && (
                      <span className="text-board-border text-xs mx-1" aria-hidden>→</span>
                    )}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <Link
                href={service.href}
                className="inline-flex rounded-xl bg-board-accent px-5 py-2.5 text-sm font-semibold text-board-accent-contrast transition-opacity hover:opacity-90"
              >
                {service.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
