export default function TermsOfUsePage() {
  return (
    <div className="animate-fade-in max-w-2xl">
      <h2 className="text-3xl font-serif text-board-text mb-2">Terms of Use</h2>
      <p className="text-xs text-board-text-tertiary mb-10">Effective date: March 2026 · BrightPath Technologies, Toronto, Ontario, Canada</p>

      <div className="space-y-8 text-sm text-board-text-secondary leading-relaxed">

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">1. Acceptance of Terms</h3>
          <p>
            By accessing or using <strong className="text-board-text">brightpathtechnology.io</strong> or <strong className="text-board-text">advisors.brightpathtechnology.io</strong> (collectively, the &ldquo;Sites&rdquo;), you agree to be bound by these Terms of Use. If you do not agree, please do not use the Sites.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">2. About BrightPath Technologies</h3>
          <p>
            BrightPath Technologies is a technology consulting and advisory business operated from Toronto, Ontario, Canada. The Sites provide information about our consulting services and host the Persona-X AI-powered advisory tools (&ldquo;Tools&rdquo;).
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">3. AI Advisory Disclaimer</h3>
          <p className="mb-3">
            The Persona-X Tools generate outputs using artificial intelligence models. <strong className="text-board-text">These outputs are informational only and do not constitute professional legal, financial, accounting, medical, or other regulated professional advice.</strong>
          </p>
          <p className="mb-3">
            AI-generated content may contain errors, omissions, or inaccuracies. BrightPath Technologies makes no representations as to the accuracy, completeness, or suitability of any AI output for any particular purpose.
          </p>
          <p>
            You are solely responsible for any decisions you make in reliance on these outputs. Always consult a qualified professional for advice specific to your circumstances.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">4. Acceptable Use</h3>
          <p className="mb-3">You agree not to:</p>
          <ul className="space-y-2 pl-4">
            <li>Use the Sites or Tools for any unlawful purpose or in violation of applicable Canadian federal or Ontario provincial law.</li>
            <li>Attempt to circumvent, disable, or interfere with security features or access controls.</li>
            <li>Input personal health information, financial account credentials, government identification numbers, or other highly sensitive personal data into the AI Tools.</li>
            <li>Use automated means (bots, scrapers) to access or collect data from the Sites without prior written consent.</li>
            <li>Reproduce, resell, or create derivative works based on our Tools or content without written authorisation.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">5. Intellectual Property</h3>
          <p>
            All content, software, tools, and materials on the Sites — including the Persona-X advisory framework — are the property of BrightPath Technologies or its licensors and are protected by applicable intellectual property laws. Nothing in these Terms grants you any right to use our intellectual property other than as expressly permitted herein.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">6. Third-Party Services</h3>
          <p>
            The Persona-X Tools rely on artificial intelligence provided by Anthropic, PBC. Your use of these Tools is also subject to Anthropic&rsquo;s terms of service and privacy policy. BrightPath Technologies is not responsible for the availability, accuracy, or conduct of third-party services.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">7. No Warranty</h3>
          <p>
            The Sites and Tools are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Sites will be uninterrupted, error-free, or free of harmful components.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">8. Limitation of Liability</h3>
          <p>
            To the maximum extent permitted by the laws of Ontario, BrightPath Technologies shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of, or inability to use, the Sites or Tools. Our aggregate liability to you for any claim arising from these Terms shall not exceed the amounts, if any, paid by you to BrightPath Technologies in the twelve (12) months preceding the claim.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">9. Governing Law and Dispute Resolution</h3>
          <p>
            These Terms are governed by and construed in accordance with the laws of the Province of Ontario and the federal laws of Canada applicable therein, without regard to conflict of law principles. Any dispute arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Ontario.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">10. Changes to These Terms</h3>
          <p>
            We may update these Terms from time to time. The effective date at the top of this page reflects the most recent revision. Your continued use of the Sites following any update constitutes your acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-board-text mb-2">11. Contact</h3>
          <p>
            Questions about these Terms? Please use our <a href="/contact" className="text-board-accent underline hover:opacity-80">contact form</a>.
          </p>
        </section>

      </div>
    </div>
  );
}
