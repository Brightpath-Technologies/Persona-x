# Newsroom Watch — Business Requirements Document (BRD)

| | |
|---|---|
| **Document** | Business Requirements Document |
| **Product** | Newsroom Watch |
| **Version** | 0.3 (draft) |
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
- **Fully autonomous publication.** The service assists a human writer; it does
  not publish finished material to an audience without human assembly and
  sign-off (see §13).
- Primary-source verification beyond public web reporting.
- Centralised/multi-user hosting and access control.
- Delivery channels other than Google Drive / desktop notification / Obsidian.
- Non-English sources and translation.
- Sentiment or trend analytics beyond significance tagging.
- Specialist research/sourcing/news-hound sub-agents (planned — see §14).

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

## 13. Operating principle — human-in-the-loop & editorial integrity

This is a foundational principle, not a feature toggle.

- **The "newsroom in your pocket" does not publish autonomously.** A human
  writer assembles the agents' work into a finished piece and delivers the
  message. Nothing reaches an audience unreviewed.
- **Elevate the human creative, remove the mundane.** Agents do the legwork
  (research, sourcing, monitoring, collation); the human owns judgement,
  narrative, and message. The service increases the value of the human creative
  rather than replacing them.
- **Human review is the quality gate.** The human creative reviews the work of
  all sub-agents and specialists before publication, so quality and integrity
  are always maintained.
- **Integrity is the product.** Because a human always assembles and signs off
  the final message, the service's credibility is preserved.
- **Future — automated oversight, not automated publishing.** Anthropic Fable
  managed agents will perform second-line quality checks on all agent behaviours
  and activities, so the human creative need not be technically savvy to trust
  the pipeline (see §14 and the Roadmap).

## 14. Future requirements (planned)

| ID | Requirement | Priority |
|---|---|---|
| FUT1 | **Research specialist sub-agents by domain** (e.g. architecture, cybersecurity, entertainment) shall gather from authoritative sources — research papers, libraries, standards bodies, primary documents — and cite primary sources. | Could |
| FUT2 | **Sourcing specialist sub-agents** shall maintain a current roster of human sources per topic and **draft** tailored outreach (email, text, and — only where permitted — virtual voice). Outreach shall be drafted for human approval, not sent autonomously, with consent and audit controls. | Could |
| FUT3 | **News-hound sub-agents** shall proactively detect rising stories on watched topics and surface candidates, so a news cycle need not be started manually. | Could |
| FUT4 | **Second-line QA by Anthropic Fable managed agents** shall audit agent behaviour and outputs so the human creative need not be technical. | Could |
| FUT5 | The human-in-the-loop review gate (§13) shall be explicit in any publishing workflow. | Must (when publishing is added) |
| FUT6 | **Media-contributor specialists** (e.g. human photographers/illustrators) shall be held in the contact roster as paid contributors of original, rights-cleared media. | Could |
| FUT7 | **Rights & licensing sub-agents** shall identify rights-holders and negotiate fair, real payment terms and draft licences for use of people's media and art; humans authorise every deal and payment. | Could |
| FUT8 | An **editor-in-chief ("J. Jonah Jameson") role** shall enforce editorial standards, house style, and the significance bar under human authority. | Could |
| FUT9 | **Legal-clerk sub-agents** shall handle rights clearance, permissions/contract drafting, attribution and fair-use/defamation flags as clerks (not counsel), escalating real legal questions to humans. | Could |
| FUT10 | **Advertising/sponsorship sub-agents** (conditional) shall be adopted only with a hard editorial–advertising separation and disclosure of sponsored material. | Could |
| FUT11 | **Translation & localisation sub-agents** shall translate sources/outputs with fidelity checks and flag uncertain translations for human review. | Could |
| FUT12 | **Accessibility sub-agents** shall make outputs accessible by default (alt-text, captions/transcripts, plain-language, screen-reader-friendly structure; WCAG-aligned). | Could |

## 15. Values & ethical principles (shared by every role)

All sub-agents and specialists — present and future — operate under one set of
values. New roles inherit these; they are not optional.

1. **Human AND machine** — a partnership: agents amplify the human creative;
   authorship and judgement stay human.
2. **Human authorship & oversight** — no autonomous publication; a human
   assembles, reviews, and signs off.
3. **Fair compensation & creator respect** — media, art, and contributions are
   licensed and paid for fairly, with proper attribution; nothing is used
   without a cleared licence.
4. **Consent & privacy** — engage human sources/contributors with consent;
   honour do-not-contact; respect privacy and communications law.
5. **Truth & sourcing integrity** — no fabrication; cite real sources; verify.
6. **Editorial independence** — advertising/sponsorship never sways editorial
   judgement; sponsored material is disclosed.
7. **Accessibility & inclusion** — outputs are accessible by default and can be
   faithfully translated/localised.
8. **Transparency & auditability** — every contact, deal, payment, and editorial
   decision is logged and reviewable.
9. **Lawfulness** — operate within copyright, privacy, communications, and
   advertising law.
10. **Oversight, not automation, of judgement** — future managed-agent QA
    automates oversight of agent behaviour, never authorship or publishing.

## 16. Glossary
- **Beat** — a topic area covered by one reporter agent.
- **Desk / reporter** — the independent agent that researches one beat.
- **Wire editor** — the deterministic step that collates, filters, de-dupes,
  rates, and orders items.
- **Edition** — a scheduled briefing (Morning/Afternoon).
- **Official release** — an item published by the organisation the story is about.
- **Significance** — high/medium/low materiality rating.
