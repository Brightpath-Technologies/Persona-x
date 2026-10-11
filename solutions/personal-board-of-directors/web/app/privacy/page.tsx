export default function PrivacyPolicyPage() {
  return (
    <div className="animate-fade-in max-w-2xl">
      <h2 className="text-3xl font-serif text-board-text mb-2">Privacy Policy</h2>
      <p className="text-xs text-board-text-tertiary mb-10">Effective date: March 2026 · BrightPath Technologies, Toronto, Ontario, Canada</p>

      <div className="space-y-8 text-sm text-board-text-secondary leading-relaxed">

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">1. Introduction</h3>
          <p>
            BrightPath Technologies (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) is committed to protecting the personal information of individuals who interact with our websites, including <strong className="text-board-text">advisors.brightpathtechnology.io</strong> and <strong className="text-board-text">brightpathtechnology.io</strong>. This policy describes how we collect, use, and protect personal information in accordance with the <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA) and applicable Ontario privacy legislation.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">2. Information We Collect</h3>
          <p className="mb-3">We collect personal information only to the extent necessary to provide our services:</p>
          <ul className="space-y-2 pl-4">
            <li><strong className="text-board-text">Contact information</strong> — name, email address, organisation name, and message content submitted via our enquiry form.</li>
            <li><strong className="text-board-text">Technical data</strong> — IP address, browser type, device type, and pages visited, collected automatically by our hosting providers (Vercel, GitHub Pages) for operational and security purposes.</li>
            <li><strong className="text-board-text">Tool inputs</strong> — information you enter into the Persona-X AI advisory tools. See Section 5 for important details.</li>
          </ul>
          <p className="mt-3">We do not use tracking pixels, third-party advertising networks, or behavioural analytics tools.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">3. How We Use Your Information</h3>
          <ul className="space-y-2 pl-4">
            <li>To respond to your enquiry or service request.</li>
            <li>To deliver and improve our services.</li>
            <li>To comply with applicable legal obligations.</li>
          </ul>
          <p className="mt-3">
            We do not send unsolicited commercial electronic messages. Any communications we send are consistent with Canada&rsquo;s Anti-Spam Legislation (CASL) and require your express or implied consent.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">4. Sharing Your Information</h3>
          <p className="mb-3">We do not sell, trade, or rent your personal information. We may share information with:</p>
          <ul className="space-y-2 pl-4">
            <li><strong className="text-board-text">Infrastructure providers</strong> — Vercel, Inc. (hosting for advisors.brightpathtechnology.io) and GitHub, Inc. (hosting for brightpathtechnology.io), each under applicable data processing agreements.</li>
            <li><strong className="text-board-text">Legal authorities</strong> — where required by applicable law, court order, or government regulation.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">5. Artificial Intelligence Tools</h3>
          <p className="mb-3">
            The Persona-X advisory tools on advisors.brightpathtechnology.io use artificial intelligence provided by Anthropic, PBC (United States). Information you enter into these tools is transmitted to Anthropic&rsquo;s API for processing and is subject to <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-board-accent underline hover:opacity-80">Anthropic&rsquo;s Privacy Policy</a>.
          </p>
          <p className="font-medium text-board-text">
            Do not enter sensitive personal information, financial account credentials, health information, or confidential business data into these tools.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">6. Your Rights Under PIPEDA</h3>
          <p className="mb-3">You have the right to:</p>
          <ul className="space-y-2 pl-4">
            <li>Access the personal information we hold about you.</li>
            <li>Request correction of inaccurate or incomplete information.</li>
            <li>Withdraw consent to our collection and use of your information (subject to legal or contractual obligations).</li>
            <li>Lodge a complaint with the <a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer" className="text-board-accent underline hover:opacity-80">Office of the Privacy Commissioner of Canada</a>.</li>
          </ul>
          <p className="mt-3">To exercise these rights, use our <a href="/contact" className="text-board-accent underline hover:opacity-80">contact form</a>.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">7. Data Retention</h3>
          <p>
            Enquiry form submissions are retained for up to 24 months for legitimate business purposes and then securely deleted. Technical/server logs are retained for up to 90 days by our hosting providers.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">8. Security</h3>
          <p>
            We implement reasonable administrative and technical safeguards appropriate to the sensitivity of the information collected. All data in transit is encrypted via TLS/HTTPS. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">9. Contact Us</h3>
          <p>
            To exercise your privacy rights or ask questions about this policy, please use our <a href="/contact" className="text-board-accent underline hover:opacity-80">contact form</a>. We will respond within a reasonable time and in any event within 30 days.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">10. Changes to This Policy</h3>
          <p>
            We may update this policy from time to time. The effective date at the top of this page will reflect the date of the most recent revision. Continued use of our websites following an update constitutes acceptance of the revised policy.
          </p>
        </section>

      </div>
    </div>
  );
}
