# Newsroom Watch — Solution Architecture

| | |
|---|---|
| **Document** | Solution / Technical Architecture |
| **Product** | Newsroom Watch |
| **Version** | 0.3 (draft) |
| **Owner** | victorycross@gmail.com (Brightpath Technologies) |
| **Status** | Draft — for review |
| **Last updated** | 13 June 2026 |
| **Related docs** | Newsroom Watch — BRD; Newsroom Watch — Evolution Roadmap |

---

## 1. Overview

Newsroom Watch is a scheduled, single-host automation modelled on a newsroom:
independent **reporter desks** gather news per beat, and a deterministic **wire
editor** curates their filings into a published edition and a dashboard. Model
work is confined to the desks; all curation is plain data processing.

## 2. Architecture diagram

```
                       launchd (07:00, 13:00, 19:00) ┐
                                                  ▼
                            fable-mythos-watch.sh (orchestrator)
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 ▼                                 ▼                                 │
        Desk: Export control              Desk: PwC & competitors        (add more desks here)
        headless `claude -p`              headless `claude -p`
        --model sonnet, WebSearch         --model sonnet, WebSearch
        → JSON array (per beat)           → JSON array (per beat)
                 └────────────────┬────────────────┘
                                  ▼
                       WIRE EDITOR  (pure jq, no model)
            collate → recency filter (≤ N days) → significance floor
                  → de-dupe by URL → order (official, significance) → cap
                                  │
        ┌─────────────────────────┼───────────────────────────┬───────────────┐
        ▼                         ▼                           ▼               ▼
  Edition .md → Drive     Dashboard.html → Drive      Obsidian digest     macOS notify
                                  ▲
                          history.jsonl (run log) ── feeds the dashboard
```

## 3. Components

### 3.1 Orchestrator (`scripts/fable-mythos-watch.sh`)
Bash script run by launchd. Determines the edition (Morning/Afternoon/Final from
the clock), launches the desks in parallel, runs the editor, publishes outputs,
records history, and regenerates the dashboard. Fails safe: a broken desk
yields an empty filing rather than aborting the run.

### 3.2 Reporter desks (sub-agents)
Each beat is a separate **headless `claude -p` process** — an isolated agent
context with web search enabled. Desks run concurrently and write a JSON array
to a per-beat file. Design choices:
- **Model:** `sonnet` by default for well-grounded, cited results; `haiku`
  available for lower cost.
- **Bounded work:** `--max-turns` and a max-items cap per desk.
- **Anti-fabrication contract:** prompts require multiple searches, real citable
  URLs, ISO publication dates, and "omit if unsure"; empty is preferred over
  invented.

Parallel processes were chosen over in-process sub-agents for isolation,
robustness, and a clean "add a desk = add a process" extension model.

### 3.3 Wire editor (pure jq)
A single deterministic transform over the combined filings:
1. **Collate** all desk arrays.
2. **Recency filter** — drop items whose ISO `published` date is older than
   `MAX_AGE_DAYS` (default 3).
3. **Significance floor** — drop below `SIGNIFICANCE_FLOOR` (default `medium`).
4. **De-duplicate** by URL, and against `seen.json` from prior runs.
5. **Order** — official first, then significance (high→low).
6. **Cap** at `MAX_ITEMS`.

No model is used here, so the most logic-heavy stage is zero-cost and fully
reproducible.

### 3.4 Publishers
- **Edition** — Markdown grouped by beat, written to the Google Drive folder.
- **Dashboard** — self-contained `Dashboard.html` regenerated each run from
  `history.jsonl` (totals, per-beat counts, editions, recent releases).
- **Obsidian digest** — rolling local archive (append-only).
- **Notification** — one macOS notification per edition.

## 4. Data model

### 4.1 News item
```json
{
  "title": "string",
  "url": "https://…",
  "source": "string",
  "summary": "1–2 sentences",
  "published": "YYYY-MM-DD",
  "official": true,
  "significance": "high|medium|low",
  "beat": "added by the editor"
}
```

### 4.2 Persisted state (`~/.fable-mythos-watch/`)
| File | Purpose |
|---|---|
| `seen.json` | URLs already published (de-dup memory) |
| `history.jsonl` | One record per run: ts, edition, date, per-beat filed counts, published items |
| `desk-*.json` | Latest raw filing per desk (debugging) |
| `watch.log` | Timestamped run log |

### 4.3 Run record (history)
```json
{ "ts":"…Z", "edition":"Morning", "date":"YYYY-MM-DD",
  "filed": {"<beat>": <count>, …}, "published": [ <items> ] }
```

## 5. Scheduling & deployment
- **launchd** agent (`com.persona-x.fable-mythos-watch.plist`) runs at 07:00,
  13:00, and 19:00 local via `StartCalendarInterval`, plus once at load.
- Auth via the operator's existing Claude Code login (no separate API key).
- Explicit `PATH` set in the agent (launchd does not inherit the login shell).

## 6. Configuration (environment variables)
| Variable | Default | Effect |
|---|---|---|
| `REPORTER_MODEL` | `sonnet` | Desk model (`haiku` for lower cost) |
| `DESK_MAX_TURNS` | `12` | Per-desk turn cap |
| `DESK_MAX_ITEMS` | `6` | Per-desk item cap |
| `SIGNIFICANCE_FLOOR` | `medium` | Minimum significance kept |
| `MAX_AGE_DAYS` | `3` | Recency window |
| `MAX_ITEMS` | `12` | Items per edition after collation |
| `PUBLISH_EMPTY` | `true` | Publish on quiet days |
| `GDRIVE_DIR` | (path) | Drive output folder |

## 7. Quality, trust & verification
- Prompts enforce search-grounded, citable, recent items only.
- Stronger default model reduces hallucination risk.
- All items are source-linked for human audit; desk filings are retained.
- **Known gap:** automated source verification is not yet built in (items are
  spot-checked manually today). See roadmap.

## 8. Failure modes & handling
| Failure | Behaviour |
|---|---|
| Desk invocation fails | Logged; empty filing; run continues |
| Desk returns invalid JSON | Logged; treated as empty |
| Drive folder unavailable | Logged; edition skipped for Drive; local digest still updates |
| No new items | Quiet-day edition (if `PUBLISH_EMPTY`); dashboard still refreshed |

## 9. Observability
- `watch.log` for per-run, per-desk tracing.
- `Dashboard.html` for at-a-glance state (runs, beats, editions, releases).
- `history.jsonl` as the queryable system of record.

## 10. Security & privacy
- Reads public web only; writes only to the owner's Drive and local vault.
- No secrets stored; relies on existing Claude Code session auth.
- Outputs may be shared with the team via Drive — treat as internal.

## 11. Constraints & technical debt
- macOS-only (osascript/launchd); single host; single user.
- Recency depends on model-reported publication dates.
- Drive integration in some environments lacks update/delete (new files rather
  than in-place updates).

## 12. Extensibility
Add a beat by adding a `*_PROMPT`, a `BEAT_NAMES` entry, a `run_desk` call, and
its file in the collation — the editor and dashboard pick it up unchanged.

## 13. Future agent roster (planned)

The current "reporter desk" is the first of several sub-agent **roles**. All
roles file into the same deterministic editor and, ultimately, the human
creative (§14). Roles are configurable and isolated, consistent with the
"add a role = add a process" model.

| Role | Purpose | Sources / channels | Output |
|---|---|---|---|
| **Reporter desk** (current) | News coverage per beat | Public web search | Ranked items |
| **Research specialist** (by domain: architecture, cybersecurity, entertainment, …) | Deeper, authoritative material | Research papers, libraries, standards bodies, primary documents | Cited, primary-source briefs |
| **Sourcing specialist** | Maintain live human-source roster; draft outreach | Contact roster; drafts via email/text/(permitted) virtual voice | Outreach drafts for human approval + contact log |
| **News-hound** | Proactively detect rising stories | Continuous/periodic scanning + momentum scoring | Early-signal candidates / suggested beats |
| **Media-contributor specialist** | Source original, rights-cleared media | Human photographers/illustrators/videographers (paid contributors) | Briefed assets → rights role + human selection |
| **Rights & licensing ("deals")** | Negotiate fair, real payment for media/art | Rights-holders; licence drafts | Negotiated terms + licence drafts (human authorises) |
| **Editor-in-chief ("J.J. Jameson")** | Enforce standards, angle, significance bar | Internal (the desks' output) | Assignments, critiques, gatekeeping (human decides) |
| **Legal clerk** | Clearance & compliance support (clerk, not counsel) | Rights/permissions, attribution, fair-use/defamation checks | Cleared/flagged items; escalations to humans |
| **Advertising/sponsorship** (conditional) | Sponsorship sourcing/placement | Advertisers/sponsors | Proposals — strictly separated from editorial |
| **Translation & localisation** | Translate sources/outputs faithfully | Non-English sources; target locales | Translations with fidelity flags |
| **Accessibility** | Make outputs accessible by default | The edition + assets | Alt-text, captions/transcripts, plain-language, WCAG checks |

Architectural notes:
- **Research specialists** carry a domain source-quality rubric and prioritise
  primary/peer-reviewed material; must respect licences and paywalls.
- **Sourcing specialists** introduce a **contacts store** (who, expertise,
  channel, consent status) and an **outreach-draft** artefact. Sending is
  gated on human approval; all contact is logged; consent/do-not-contact,
  channel permissions, frequency limits, and comms/privacy law are enforced.
  Virtual voice is only available where circumstances and explicit permission
  allow.
- **News-hounds** add a **momentum score** and feed candidates to the editor and
  the human creative; they propose, they do not auto-publish.
- **Rights & licensing** agents negotiate and draft; **humans authorise** every
  deal and payment. Introduces a **rights/licence ledger** (rights-holder, terms,
  payment, attribution, usage scope) feeding an audit trail.
- **Editor-in-chief / legal-clerk** roles are advisory and gatekeeping under
  human authority; legal clerks escalate genuine legal questions to humans.
- **Advertising** roles, if adopted, are isolated behind an
  **editorial–advertising separation** boundary and never read or influence the
  significance/selection logic.
- **Translation** and **accessibility** roles act as post-processors over the
  edited content: translation preserves meaning/attribution and flags
  uncertainty; accessibility enriches assets (alt-text, captions, transcripts)
  and checks against guidelines before the human review gate.

## 14. Human-in-the-loop & governance

The pipeline is **agent-assisted, human-authored**. This is an architectural
control, not just a policy:

- **Publish is a human step.** No finished material is published to an audience
  without a human writer assembling and signing off (see BRD §13). Agent outputs
  are inputs to a human, never a direct-to-audience channel.
- **Review gate.** The human creative reviews all sub-agent / specialist output
  before publication; this gate sits between "agents produce" and "audience
  receives".
- **Outreach gate.** Sourcing-specialist outreach is drafted, queued, and
  released only on human approval (with consent and audit controls).
- **Future — second-line QA (Anthropic Fable managed agents).** A managed-agent
  oversight layer audits agent behaviours and activities (sourcing integrity,
  anomaly detection, conduct), so the human creative need not be technically
  savvy to trust the pipeline. This automates *oversight of agents*, never
  *authorship* or *publishing*.

## 15. Shared values & ethical principles

Every role inherits one set of values (full statement in BRD §15): **Human AND —**
an open-ended tagline (whatever follows, a human is always in it; partnership,
not replacement); human authorship & oversight; **fair
compensation** and creator respect; consent & privacy; sourcing integrity;
**editorial independence** from advertising; accessibility & inclusion;
transparency & auditability; lawfulness; and oversight (not automation) of
judgement. These are enforced as controls — e.g. the human review gate, the
outreach gate, the rights/licence ledger, and the editorial–advertising
separation boundary — not merely stated as policy.
