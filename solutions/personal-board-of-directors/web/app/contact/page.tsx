"use client";

import { useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export default function ContactPage() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [form, setForm] = useState({
    name: "",
    email: "",
    organisation: "",
    service: "",
    message: "",
    consent: false,
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.consent) return;
    setFormState("submitting");

    try {
      const res = await fetch("https://formspree.io/f/xbdaeegl", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          organisation: form.organisation,
          service: form.service,
          message: form.message,
        }),
      });
      setFormState(res.ok ? "success" : "error");
    } catch {
      setFormState("error");
    }
  }

  if (formState === "success") {
    return (
      <div className="animate-fade-in max-w-lg mx-auto py-16 text-center">
        <div className="mb-4 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-board-accent/10 text-board-accent text-2xl">✓</span>
        </div>
        <h2 className="text-2xl font-serif text-board-text mb-3">Message received</h2>
        <p className="text-sm text-board-text-secondary mb-8">
          Thank you for getting in touch. We&rsquo;ll respond within one business day.
        </p>
        <button
          onClick={() => { setFormState("idle"); setForm({ name: "", email: "", organisation: "", service: "", message: "", consent: false }); }}
          className="text-xs text-board-text-tertiary hover:text-board-text-secondary transition-colors underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-xl">
      <h2 className="text-3xl font-serif text-board-text mb-2">Get in Touch</h2>
      <p className="text-sm text-board-text-secondary mb-8">
        We respond to all enquiries within one business day.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-board-text-secondary mb-1.5" htmlFor="name">
              Name <span className="text-board-accent">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Your name"
              className="w-full rounded-lg border border-board-border bg-board-surface px-3 py-2 text-sm text-board-text placeholder:text-board-text-tertiary focus:border-board-accent/50 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-board-text-secondary mb-1.5" htmlFor="email">
              Email <span className="text-board-accent">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-board-border bg-board-surface px-3 py-2 text-sm text-board-text placeholder:text-board-text-tertiary focus:border-board-accent/50 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-board-text-secondary mb-1.5" htmlFor="organisation">
            Organisation <span className="text-board-text-tertiary font-normal">(optional)</span>
          </label>
          <input
            id="organisation"
            name="organisation"
            type="text"
            value={form.organisation}
            onChange={handleChange}
            placeholder="Company or organisation name"
            className="w-full rounded-lg border border-board-border bg-board-surface px-3 py-2 text-sm text-board-text placeholder:text-board-text-tertiary focus:border-board-accent/50 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-board-text-secondary mb-1.5" htmlFor="service">
            What can we help with? <span className="text-board-text-tertiary font-normal">(optional)</span>
          </label>
          <select
            id="service"
            name="service"
            value={form.service}
            onChange={handleChange}
            className="w-full rounded-lg border border-board-border bg-board-surface px-3 py-2 text-sm text-board-text focus:border-board-accent/50 focus:outline-none transition-colors"
          >
            <option value="">Select a topic…</option>
            <option>AI &amp; Automation Governance</option>
            <option>Technology Risk &amp; Assurance</option>
            <option>Process Optimisation &amp; Digital Enablement</option>
            <option>Data &amp; Compliance Strategy</option>
            <option>Leadership Coaching</option>
            <option>Persona-X Tools</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-board-text-secondary mb-1.5" htmlFor="message">
            Message <span className="text-board-accent">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            value={form.message}
            onChange={handleChange}
            placeholder="Tell us about your challenge or question…"
            className="w-full resize-none rounded-lg border border-board-border bg-board-surface px-3 py-2 text-sm text-board-text placeholder:text-board-text-tertiary focus:border-board-accent/50 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            required
            checked={form.consent}
            onChange={handleChange}
            className="mt-0.5 h-4 w-4 rounded border-board-border accent-board-accent"
          />
          <label htmlFor="consent" className="text-xs text-board-text-secondary leading-relaxed">
            I have read and agree to the{" "}
            <a href="/privacy" className="text-board-accent underline hover:opacity-80">Privacy Policy</a>.
          </label>
        </div>

        {formState === "error" && (
          <p className="text-xs text-rose-600 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
            Something went wrong. Please try again or email us directly.
          </p>
        )}

        <button
          type="submit"
          disabled={!form.consent || formState === "submitting"}
          className="w-full rounded-xl bg-board-accent px-5 py-3 text-sm font-semibold text-board-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {formState === "submitting" ? "Sending…" : "Send Message →"}
        </button>
      </form>
    </div>
  );
}
