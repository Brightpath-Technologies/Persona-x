# Newsroom Watch — Evolution Roadmap

| | |
|---|---|
| **Document** | Evolution Roadmap & Backlog |
| **Product** | Newsroom Watch |
| **Version** | 0.1 (draft) |
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
1. **Trust before reach** — never trade source-integrity for more coverage.
2. **Cheap by design** — keep curation model-free; bound desk spend.
3. **Localised change** — beats and tuning evolve without touching the editor.
4. **Inspectable** — every decision (significance, recency, dedup) is explicit.

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
| **Central hosting** (cron/CI/container) | Remove single-host fragility; reliable editions when the laptop is asleep |
| **Additional delivery channels** | Email and/or Slack/Teams digest alongside Drive |
| **Web-hosted dashboard** | Shareable link with history, filters by beat/significance |
| **Configurable beats via a file** | Manage beats as data (YAML/JSON), not code |
| **Source allow/deny lists** | Bias toward trusted outlets; suppress low-quality ones |

### Long-term
| Item | Why |
|---|---|
| **Trend & theme summaries** | Weekly roll-ups across beats, not just item lists |
| **Multi-user / access control** | Team-wide service with roles |
| **Analytics** | Volume/significance trends per beat over time |
| **Non-English sources** | Broaden coverage with translation |
| **Feedback loop** | Reader "useful/not useful" signal to tune the significance bar |

## 4. Backlog (unscheduled ideas)
- Slack slash-command to trigger an on-demand edition for a named beat.
- "Briefing pack" export (PDF) for circulation.
- Confidence score per item (source count, official vs secondary).
- Auto-link related items across editions (story timelines).
- Cost dashboard (tokens/run, per beat).
- Retry/backoff for transient search failures.
- Configurable significance rubric per beat.

## 5. Open questions
- Hosting target for central runs (CI runner, small VM, container schedule)?
- Preferred team delivery channel (email vs Slack/Teams vs Drive-only)?
- Should the significance bar differ per beat?
- Retention policy for editions and history?

## 6. Definition of "v1.0"
- Per-beat recency + automated source verification in place.
- Centrally hosted; editions reliably delivered twice daily without a laptop.
- Beats managed as configuration.
- A shareable dashboard the team can open without file access.
