# Newsroom Watch — Evolution Roadmap

| | |
|---|---|
| **Document** | Evolution Roadmap & Backlog |
| **Product** | Newsroom Watch |
| **Version** | 0.3 (draft) |
| **Owner** | victorycross@gmail.com (Brightpath Technologies) |
| **Status** | Draft — for review |
| **Last updated** | 13 June 2026 |
| **Related docs** | Newsroom Watch — BRD; Newsroom Watch — Solution Architecture |

---

## 1. Current state (v0.1)

A working single-host prototype:
- Two beats (Fable/Mythos export control; PwC Canada & competitors AI).
- Parallel reporter desks (headless Claude Code, `sonnet` default) + pure-jq editor.
- Significance floor, 3-day recency window, URL de-dup, official-first ordering.
- Twice-daily Markdown editions + regenerated HTML dashboard to Google Drive;
  rolling Obsidian digest; desktop notification.
- Run history in `history.jsonl`.

## 2. Guiding principles
1. **Human at the helm** — the service assists a human creative; it does not
   publish autonomously (see §6).
2. **Trust before reach** — never trade source-integrity for more coverage.
3. **Cheap by design** — keep curation model-free; bound desk spend.
4. **Localised change** — beats and tuning evolve without touching the editor.
5. **Inspectable** — every decision (significance, recency, dedup) is explicit.

## 3. Roadmap

### Near-term (next)
| Item | Why | Notes |
|---|---|---|
| **Per-beat recency windows** | Fast beats (policy) want 3 days; slower beats (competitor moves) want 14–30 | Add `MAX_AGE_DAYS` per desk |
| **Automated source verification** | Close the hallucination gap without manual spot-checks | A verifier step that fetches each URL and confirms title/claim before publish |
| **Dedup by story, not just URL** | Same story across outlets currently passes as distinct | Cluster by title/canonical link similarity |
| **Edition de-duplication across the day** | Avoid Afternoon repeating Morning | Already partly handled by `seen.json`; formalise |

### Mid-term
| Item | Why |
|---|---|
| **Specialist sub-agent roster** (see §5) | Deeper, authoritative research; live human sources; proactive story discovery |
| **Central hosting** (cron/CI/container) | Remove single-host fragility; reliable editions when the laptop is asleep |
| **Additional delivery channels** | Email and/or Slack/Teams digest alongside Drive |
| **Web-hosted dashboard** | Shareable link with history, filters by beat/significance |
| **Configurable beats via a file** | Manage beats as data (YAML/JSON), not code |
| **Source allow/deny lists** | Bias toward trusted outlets; suppress low-quality ones |

### Long-term
| Item | Why |
|---|---|
| **Second-line QA by Anthropic Fable managed agents** (see §6) | Automated oversight of agent behaviour so the human creative need not be technical |
| **Trend & theme summaries** | Weekly roll-ups across beats, not just item lists |
| **Multi-user / access control** | Team-wide service with roles |
| **Analytics** | Volume/significance trends per beat over time |
| **Feedback loop** | Reader "useful/not useful" signal to tune the significance bar |

## 4. Backlog (unscheduled ideas)
- Slack slash-command to trigger an on-demand edition for a named beat.
- "Briefing pack" export (PDF) for circulation.
- Confidence score per item (source count, official vs secondary).
- Auto-link related items across editions (story timelines).
- Cost dashboard (tokens/run, per beat).
- Retry/backoff for transient search failures.
- Non-English sources with translation.

## 5. Future capability — the specialist sub-agent roster

The newsroom grows from two general "reporter desks" into a roster of
**specialist sub-agents**, each a distinct, configurable role. All of them feed
the same deterministic editor and, ultimately, the human creative (§6).

### 5.1 Research specialists (by domain)
Sub-agents defined by an **area of specialisation** — e.g. architecture,
cybersecurity, entertainment, law, healthcare, finance — rather than a single
news beat.

- **Purpose:** go beyond headline coverage to gather deeper, authoritative
  material on a topic.
- **Sources:** weighted toward authoritative origins — research papers and
  pre-print servers, standards bodies, libraries and archives, official
  registries, primary documents — not just news outlets.
- **Behaviour:** each specialist carries a source-quality rubric for its domain,
  cites primary sources, and distinguishes peer-reviewed / official material
  from secondary commentary.
- **Considerations:** access to gated/academic sources; citation fidelity;
  domain-appropriate significance criteria; respecting licences and paywalls.

### 5.2 Sourcing specialists (human sources & outreach)
Sub-agents that **maintain a current list of human sources** — experts,
insiders, spokespeople, analysts — who can be approached for genuine,
attributable commentary on a story.

- **Purpose:** add real human voices to a story, not just secondary reporting.
- **Capabilities:** keep an up-to-date contact roster per topic (who, expertise,
  relationship, preferred channel, consent status); **draft tailored outreach**
  to the right person for a given story.
- **Channels:** email and text, and — only where circumstances and explicit
  permission allow — **virtual voice** outreach.
- **Guardrails (essential):** outreach is **drafted for human approval, not sent
  autonomously** by default; respect consent, do-not-contact lists, channel
  permissions, frequency limits, and applicable communications/privacy law;
  full audit trail of who was contacted, how, and why.

### 5.3 News-hound agents (proactive story discovery)
Sub-agents that **proactively seek out big stories that may become bigger** —
so a news cycle need not be kicked off manually for a topic.

- **Purpose:** spot early signals and rising stories before they peak.
- **Behaviour:** scan continuously/periodically for emerging, fast-moving, or
  under-reported items on watched topics; estimate "momentum" (likelihood a
  story grows) and surface candidates to the editor and the human creative.
- **Output:** suggested new threads/beats and early alerts — proposals for
  human attention, not auto-published stories.
- **Considerations:** momentum scoring; avoiding hype/false positives; tunable
  sensitivity; tie-in to the per-beat significance bar.

### 5.4 Media-contributor specialists (e.g. human photographers)
Human creators — photographers, videographers, illustrators, artists — held in
the contact roster as **paid contributors** of original imagery and media,
alongside the human commentary sources in §5.2.
- **Purpose:** source original, rights-cleared visual/media content rather than
  relying on stock or uncredited material.
- **Behaviour:** match a story to suitable contributors; brief them; route their
  work to the rights/licensing role (§5.5) for terms and to the human creative
  for selection.

### 5.5 Rights & licensing ("deals") sub-agents
Sub-agents that discover rights-holders and **negotiate real, fair payment terms**
for the use of people's media and art.
- **Purpose:** ensure nothing is used without a cleared, paid licence, and that
  creators are compensated fairly.
- **Capabilities:** identify rights-holders; propose and negotiate terms; draft
  licensing agreements; track usage rights, attribution, and royalties.
- **Guardrails:** agents **negotiate and draft; humans authorise** every deal and
  payment. No use of media/art without a cleared licence. Full audit trail.

### 5.6 Editorial-chief and legal-clerk roles
- **Editor-in-chief ("J. Jonah Jameson") role** — an editorial-standards agent
  that assigns, pushes for sharper angles, enforces house style and the
  significance bar, and gatekeeps quality — **under human authority**. It
  pressures and proposes; the human decides.
- **Legal clerks** — act as **clerks, not counsel**: rights clearance, permission
  and contract drafting, attribution and fair-use/defamation flags, and
  recordkeeping. Genuine legal questions escalate to a human / qualified counsel.

### 5.7 Advertising / sponsorship sub-agents (conditional)
Optional roles for sponsorship sourcing or ad placement, included **only with a
hard editorial–advertising separation**: advertising never influences editorial
selection, significance, or content. Adopt only where it fits the service's
integrity, with clear disclosure of sponsored material.

### 5.8 Translation & localisation specialists
Sub-agents that translate source material and outputs, and localise for a target
audience.
- **Purpose:** widen coverage to non-English sources and make editions readable
  for different audiences/markets.
- **Behaviour:** translate with fidelity checks; preserve meaning, nuance, and
  attribution; flag uncertain translations for human review rather than guessing.

### 5.9 Accessibility specialists
Sub-agents that make outputs accessible by default.
- **Purpose:** ensure every edition and asset is usable by people with
  disabilities.
- **Behaviour:** generate alt-text for images, captions/transcripts for media,
  plain-language alternatives, and screen-reader-friendly structure; check
  against recognised accessibility guidelines (e.g. WCAG) and flag gaps for the
  human creative.

## 6. Operating principle — the newsroom in your pocket (human-in-the-loop)

**The entire "newsroom in your pocket" is explicitly *not* intended for fully
autonomous publication of material online.** A human writer assembles the
agents' work into a finished piece and delivers a compelling message. This is a
deliberate design choice, not a limitation.

- **Elevate the human creative, remove the mundane.** Agents and specialists do
  the legwork — research, sourcing, monitoring, collation — so the human focuses
  on judgement, narrative, and message. The service raises the value of the
  human creative rather than replacing them.
- **Human review is the quality gate.** The human creative reviews the work of
  all sub-agents and specialists before anything is published, so quality and
  integrity are always maintained. Nothing reaches an audience unreviewed.
- **Integrity is the product.** Because a human always assembles and signs off
  the final message, the service's credibility is preserved — agents inform, the
  human decides and authors.
- **Future: second-line QA by Anthropic Fable managed agents.** A future layer
  of Anthropic Fable managed agents performs **second-line quality checks on all
  agent behaviours and activities** — verifying sourcing, flagging anomalies,
  and auditing agent conduct — so that the human creative does **not** need to be
  technically savvy to trust the pipeline. This automates the *oversight* of the
  agents while keeping *editorial authorship* firmly human.

This principle governs the whole roadmap: new agent types (§5) expand what the
newsroom can gather and draft, but the **publish** step remains human, and
automated oversight (not automated publishing) is how we scale trust.

## 7. Open questions
- Hosting target for central runs (CI runner, small VM, container schedule)?
- Preferred team delivery channel (email vs Slack/Teams vs Drive-only)?
- Should the significance bar differ per beat?
- For sourcing specialists: consent capture, contact-data storage, and the
  approval workflow for outreach (and any voice channel) — what are the rules?
- Retention policy for editions, history, and source contact data?

## 8. Definition of "v1.0"
- Human-in-the-loop review gate formalised; no autonomous publication.
- Per-beat recency + automated source verification in place.
- At least one specialist sub-agent type (research, sourcing, or news-hound)
  in pilot.
- Centrally hosted; editions reliably delivered twice daily without a laptop.
- Beats managed as configuration; a shareable dashboard for the team.

## 9. Values & ethical principles (shared by every role)

Every sub-agent and specialist — present and future — operates under the same
set of values. New roles inherit these; they are not optional.

1. **Human AND —** an intentionally open tagline; the second word is left to the
   moment (machine, art, community, craft…). Whatever follows, a human is always
   in it. The system is a partnership: agents amplify the human creative, they do
   not replace them. Authorship, judgement, and the final message stay human.
2. **Human authorship & oversight.** No autonomous publication. A human
   assembles, reviews, and signs off; nothing reaches an audience unreviewed.
3. **Fair compensation & creator respect.** People's media, art, and
   contributions are licensed and **paid for fairly**; nothing is used without a
   cleared licence and proper attribution.
4. **Consent & privacy.** Human sources and contributors are engaged with
   consent; honour do-not-contact; respect privacy and communications law.
5. **Truth & sourcing integrity.** No fabrication; cite real sources; verify
   before publishing.
6. **Editorial independence.** Advertising and sponsorship never influence
   editorial selection, significance, or content; sponsored material is
   disclosed.
7. **Accessibility & inclusion.** Outputs are accessible by default and can be
   localised/translated faithfully for their audience.
8. **Transparency & auditability.** Every contact, deal, payment, and editorial
   decision is logged and reviewable.
9. **Lawfulness.** Operate within applicable law — copyright, privacy,
   communications, and advertising standards.
10. **Oversight, not automation, of judgement.** Future Anthropic Fable managed
    agents automate *oversight* of agent behaviour (so the human need not be
    technical) — never authorship or publishing.
