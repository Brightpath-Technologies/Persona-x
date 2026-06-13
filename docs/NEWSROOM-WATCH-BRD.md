# Newsroom Watch — Business Requirements Document (BRD)

| | |
|---|---|
| **Document** | Business Requirements Document |
| **Product** | Newsroom Watch |
| **Version** | 0.1 (draft) |
| **Owner** | victorycross@gmail.com (Brightpath Technologies) |
| **Status** | Draft — for review |
| **Last updated** | 13 June 2026 |
| **Related docs** | Newsroom Watch — Solution Architecture; Newsroom Watch — Evolution Roadmap; Newsroom Watch — Executive Summary |

---

## 1. Purpose

This document defines the business requirements for **Newsroom Watch**, an
automated intelligence service that monitors the web for significant
developments on a defined set of topics ("beats"), curates them with explicit
significance ratings, and publishes a twice-daily briefing plus a live
dashboard to Google Drive.

It exists so the team can stay current on fast-moving AI policy and competitor
developments without manual scanning, and so the curation logic is explicit,
inspectable, and improvable over time.

## 2. Background

AI policy and the competitive consulting landscape are moving quickly. Two
needs prompted this build:

1. A live event (the June 2026 US export-control action against Anthropic's
   Fable 5 / Mythos 5 models) that needed close, ongoing tracking.
2. A standing need to watch **PwC Canada and its competitors** for material AI
   developments relevant to positioning and strategy.

A prototype already exists (a shell-based "newsroom" using headless Claude Code
plus jq). This BRD captures the requirements that prototype is meeting and the
ones that will guide its evolution into a team-grade service.

## 3. Objectives & success measures

| # | Objective | Success measure |
|---|---|---|
| O1 | Stay current on defined beats with minimal manual effort | Two editions/day delivered on schedule with no manual steps |
| O2 | Surface only what matters | ≥ 80% of published items rated useful by readers; routine noise excluded |
| O3 | Be trustworthy | 0 fabricated items/links published; every item cites a real source |
| O4 | Be cheap to run | Per-run model spend bounded and predictable; editing stage is zero-cost |
| O5 | Be evolvable | A new beat can be added in minutes without redesign |

## 4. Stakeholders

| Role | Interest |
|---|---|
| Owner / sponsor | Direction, beats, significance bar, sign-off |
| Readers (team) | Receive and act on the briefings and dashboard |
| Operator | Installs, configures, and maintains the service |
| (Future) Platform owner | Hosts the service centrally for the team |

## 5. Scope

### In scope (current)
- Two beats: (1) Fable/Mythos export-control story incl. direct Anthropic
  releases; (2) PwC Canada and competitors — significant AI developments.
- Parallel "reporter" agents per beat; deterministic editorial curation.
- Significance rating (high/medium/low) and official-release flagging.
- Recency window (default 3 days) and de-duplication against prior runs.
- Twice-daily Markdown editions + a regenerated HTML dashboard to Google Drive.
- A rolling local digest (Obsidian) and a desktop notification.

### Out of scope (current)
- Primary-source verification beyond public web reporting.
- Centralised/multi-user hosting and access control.
- Delivery channels other than Google Drive / desktop notification / Obsidian.
- Non-English sources and translation.
- Sentiment or trend analytics beyond significance tagging.

## 6. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR1 | The system shall cover multiple configurable beats, each researched independently. | Must |
| FR2 | Each beat shall return structured items: title, URL, source, summary, publication date, official flag, significance. | Must |
| FR3 | The system shall only include items found via web search with a real, citable URL; it shall never fabricate items or links. | Must |
| FR4 | The system shall exclude items older than a configurable recency window (default 3 days). | Must |
| FR5 | The system shall de-duplicate against previously published items. | Must |
| FR6 | The system shall drop items below a configurable significance floor (default "medium"). | Must |
| FR7 | The system shall order results with official releases and higher-significance items first. | Must |
| FR8 | The system shall publish a Morning and an Afternoon edition each day, grouped by beat. | Must |
| FR9 | The system shall deliver editions and a status dashboard to Google Drive. | Must |
| FR10 | The system shall maintain a run history sufficient to render the dashboard (beats run, items filed vs published, editions). | Must |
| FR11 | The system shall publish an edition even on a quiet news cycle (configurable). | Should |
| FR12 | The system shall keep a rolling local archive of everything published. | Should |
| FR13 | The system shall notify the operator/reader when an edition is published. | Should |
| FR14 | The significance bar, recency window, model, and beats shall be configurable without code changes to the editor. | Should |

## 7. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR1 | **Cost** — model usage bounded per run (small model option, capped turns/items); the curation/editing stage incurs no model cost. |
| NFR2 | **Reliability** — a failed or malformed desk must not abort the run; the run degrades gracefully to the desks that succeeded. |
| NFR3 | **Trust** — anti-fabrication controls in prompts; outputs are source-linked and auditable. |
| NFR4 | **Transparency** — every item carries a significance rating and source; run history is inspectable. |
| NFR5 | **Maintainability** — adding/removing a beat is a localised change; the editor is provider-agnostic. |
| NFR6 | **Portability** — runs unattended on a single machine using existing Claude Code auth (no separate API key). |
| NFR7 | **Privacy** — reads only public web sources; writes only to the owner's own Drive/vault. |

## 8. Assumptions
- The operator has an authenticated Claude Code CLI and `jq` available.
- Google Drive for Desktop (or equivalent sync) is installed on the run host.
- Public web coverage exists for the configured beats.

## 9. Constraints
- Current implementation is macOS-specific (uses `osascript`/`launchd`).
- Significance and recency depend on model judgement and the accuracy of
  reported publication dates.
- Single-host, single-user; not yet hardened for team-wide reliability.

## 10. Dependencies
- Claude Code CLI (headless) with web search.
- `jq` for the editorial stage.
- Google Drive for delivery; Obsidian (optional) for the local archive.

## 11. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Model hallucinates an item/link | Erodes trust | Anti-fabrication prompts; default to a stronger model; source-linking; spot verification |
| Significant-but-old news missed by short window | Coverage gap | Configurable window; consider per-beat windows |
| Single host goes idle/offline | Missed editions | Roadmap: central hosting |
| Source paywalls/blocking | Thin summaries | Multiple sources per beat; official releases prioritised |
| Quiet beats look "broken" | Confusion | Publish-empty editions with an explicit note |

## 12. Acceptance criteria
- Two editions/day are produced on schedule and delivered to Drive.
- Every published item has a working source link and a significance rating.
- No item older than the configured window appears.
- A reader can open the dashboard and see, at a glance, beats covered, editions
  published, and recent releases.
- Adding a new beat requires only a new prompt + roster entry (no editor change).

## 13. Glossary
- **Beat** — a topic area covered by one reporter agent.
- **Desk / reporter** — the independent agent that researches one beat.
- **Wire editor** — the deterministic step that collates, filters, de-dupes,
  rates, and orders items.
- **Edition** — a scheduled briefing (Morning/Afternoon).
- **Official release** — an item published by the organisation the story is about.
- **Significance** — high/medium/low materiality rating.
