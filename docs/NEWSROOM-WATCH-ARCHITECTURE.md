# Newsroom Watch — Solution Architecture

| | |
|---|---|
| **Document** | Solution / Technical Architecture |
| **Product** | Newsroom Watch |
| **Version** | 0.1 (draft) |
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
                         launchd (07:00, 15:00)  ┐
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
Bash script run by launchd. Determines the edition (Morning/Afternoon from the
clock), launches the desks in parallel, runs the editor, publishes outputs,
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
- **launchd** agent (`com.persona-x.fable-mythos-watch.plist`) runs at 07:00 and
  15:00 local via `StartCalendarInterval`, plus once at load.
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
