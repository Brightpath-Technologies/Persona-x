# Newsroom Watch — Consolidated Design & Persona Contracts

| | |
|---|---|
| **Document** | Consolidated Design + Persona Input/Output Contracts |
| **Product** | Newsroom Watch ("a newsroom in your pocket") |
| **Version** | 0.4 (draft) — supersedes the scattered roster definitions in Architecture §13, Roadmap §5, BRD §14 |
| **Owner** | victorycross@gmail.com (Brightpath Technologies) |
| **Status** | Draft — for review |
| **Last updated** | 13 June 2026 |
| **Audience** | The owner (operator + human creative), and any future build collaborator |
| **Related docs** | Executive Summary; BRD v0.3; Architecture v0.3; Roadmap v0.3; Use-Cases v0.1; **Build Plan v0.1** (companion) |
| **Design assumptions** | v1.0 is a **single-operator personal tool** (you are operator *and* human creative); human-facing data lives in Airtable + Gmail drafts + Google Drive; machine state stays as local files. See §0.1. |

---

## 0. How to read this document

This is the single synthesis the kickoff asked for. It does four things:

1. **Reconciles** all the v0.3 docs into one design and resolves the inconsistencies between them (§1).
2. **Specifies an input/output contract for every one of the 14 roles** ("personas") using the agreed template (§3).
3. Defines the **shared schemas, hand-offs, gates, and data stores** the roster implies (§2, §4, §5).
4. Recommends **whether each role should also be a Persona-x persona definition**, and sketches one (§6).

The **prioritised build plan** and the **open decisions (with recommendations)** live in the companion `NEWSROOM-WATCH-BUILD-PLAN.md` so this document stays a stable design reference.

### 0.1 Assumptions made (stated, then moved past)

- **Single operator.** You are both the operator and the human creative. No multi-tenancy, no per-seat access control in v1.0. Data stores are chosen for one person, not a SaaS.
- **Stores follow your connected tools.** Machine state stays as JSON/JSONL files under `~/.newsroom-watch/`; the *human-facing* stores (contacts roster, rights/licence ledger, approval queues) are recommended as **Airtable** bases; outreach is drafted into **Gmail drafts**; editions and the dashboard go to **Google Drive**. This matches the MCP connections you already run and gives you review/approve surfaces for free.
- **"Anthropic Fable managed agents" is a forward-looking placeholder** for a managed second-line-QA layer. Until such a product exists, the same role is fulfilled by a scheduled, read-only audit agent (§3.13). Nothing in v1.0 depends on it.
- **"Fable 5 / Mythos 5" are the names inside the live export-control beat**, not the QA product. Kept distinct here.

---

## 1. Consolidated design (the synthesis)

### 1.1 One-paragraph restatement

Newsroom Watch is a scheduled, low-cost service modelled on an old newsroom. Independent **reporter desks** (one per beat) gather news; a deterministic, model-free **wire editor** curates their filings (de-dupe, recency, significance floor, official-first ordering, cap); the result is a **draft edition** plus a live dashboard. A **human creative reviews and signs off** before anything reaches an audience — nothing auto-publishes. Around this spine sits a roster of specialist roles (research, sourcing, news-hound, media, rights, editorial-chief, legal-clerk, translation, accessibility, second-line QA) that all file into the same editor and, ultimately, the same human gate, under one shared set of values ("Human AND").

### 1.2 The canonical pipeline (extended for the full roster)

```
        launchd / cron (07:00, 15:00, + news-hound on a faster tick)
                              │
                              ▼
                  Orchestrator (run controller)
                              │
   ┌──────────────┬───────────┼───────────┬──────────────────┐
   ▼              ▼           ▼           ▼                  ▼
Reporter      Reporter    News-hound   Research          (add roles)
desk: beat A  desk: beat B (momentum)   specialist (on demand)
   │              │           │           │
   └──── Filings (NewsItem[] / Candidate[] / ResearchBrief[]) ────┐
                                                                  ▼
                        WIRE EDITOR  (pure jq — no model)
        collate → drop seen → significance floor → recency → de-dupe
              → order (official, significance) → cap  →  Edition Set
                                                                  │
                    ┌─────────────────────────────────────────────┤
                    ▼                     ▼                        ▼
        Editor-in-chief review    Legal-clerk clearance   Accessibility / Translation
        (angle, standards)        (flags, escalations)    (alt-text, captions, locale)   [Phase 3–4]
                    └───────────────────┬─────────────────────────┘
                                        ▼
                          ╔═══════════════════════════╗
                          ║   HUMAN REVIEW GATE        ║  ← the human creative
                          ║   (the only publish gate)  ║     reviews, edits, signs off
                          ╚═══════════════════════════╝
                                        │
        ┌───────────────┬───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼               ▼
  Edition .md→Drive  Dashboard→Drive  Obsidian digest  Email digest   Audience
  (DRAFT label)      (history.jsonl)  (rolling)        (to self)      (HUMAN action)

   Side channels, each ending at a human gate (never auto-executed):
     Sourcing → OutreachDraft ─→ [OUTREACH GATE] ─→ human approves ─→ send + log
     Media/Rights → LicenceDraft ─→ [DEALS GATE] ─→ human authorises ─→ execute + ledger
     Second-line QA ─→ trust report ─→ human (read-only oversight of all the above)
```

### 1.3 Inconsistencies found and resolved

| # | Where | The inconsistency | Resolution |
|---|---|---|---|
| C1 | Exec Summary ("reporters run on a **small, inexpensive model** by default") vs Architecture §3.2 / `fable-mythos-watch.sh` (`REPORTER_MODEL` defaults to **`sonnet`**) | The marketing summary claims a small/cheap default; the code defaults to Sonnet for grounding. | **Code + Architecture are canonical: default is Sonnet** (well-grounded, lower hallucination), Haiku available for lower cost. Fix the Exec Summary wording to "a mid-tier model (Sonnet) by default; Haiku available for lower cost." The cost story holds because *turns/items are capped* and *the editor is model-free* — not because the desk model is tiny. |
| C2 | "Nothing auto-publishes" (everywhere) vs the script **writing the edition straight to Drive every run** with no human step in between | Apparent contradiction: the prototype *does* write a file unattended. | **Reframe, don't change the principle.** The Drive edition + dashboard are **drafts for the human**, on a private surface — not "an audience." The review gate sits between *Drive draft* and *any audience-facing distribution* (social, newsletter, client). Resolution is to **label every auto-written edition `DRAFT — for human review`** so the artefact matches the principle. (Build Plan, Phase 1.) |
| C3 | Recency intent ("exclude items older than the window") vs the editor's jq: `select($d == null or $d >= $cutoff)` — **undated items always pass** | Items with no parseable `published` date bypass the recency filter entirely. | **Real behaviour, flag as a decision.** Two valid stances: lenient (keep undated, let the human judge) or strict (drop undated). Recommend **keep-but-tag**: pass undated items but mark `published: null` and surface them last, so the human sees them flagged rather than silently mixed in. (Build Plan, Phase 0.) |
| C4 | jq `rank()` defaults unknown significance to `medium` (`// 2`) | An item missing `significance` is treated as `medium` and can clear a `medium` floor. | Acceptable but make it explicit: **a missing significance ⇒ medium**. Optionally the verifier (Phase 1) can down-rate unverifiable items. Documented, not changed. |
| C5 | Editor-in-chief named "**J.J. Jameson**" (kickoff) vs "**J. Jonah Jameson**" (BRD §14 / Roadmap §5.6) | Cosmetic name drift. | Canonical: **"J. Jonah Jameson"** (the source character). "J.J." is shorthand. |
| C6 | Product name **Newsroom Watch** vs script/launchd/state-dir all named **`fable-mythos-watch`** | The implementation is named after the first beat, but the product is topic-agnostic (Use-Cases doc). | **Cosmetic but worth a rename** to `newsroom-watch.sh` / `~/.newsroom-watch/` / `com.brightpath.newsroom-watch.plist` so the use-case story (charity, real-estate, etc.) isn't undercut by the filename. Breaking for the state dir, so do it as a clean Phase 0 task. Nothing in this design depends on the old name. |
| C7 | Use-Cases doc is **v0.1** while BRD/Architecture/Roadmap are **v0.3** | Version drift. | Bump Use-Cases to v0.3 on next edit; no content conflict. |
| C8 | Architecture §11: some Drive environments "lack update/delete" vs dashboard written with `cat >` (overwrite) to a fixed filename | In those environments the fixed-name dashboard may duplicate rather than update. | Editions are unique per `date + edition` so they're fine; only the dashboard has a fixed name. Acceptable today; the **web-hosted dashboard** (Phase 2) removes the issue. |

None of these are blockers; C2 and C3 are the two worth acting on early because they touch the core "no auto-publish / sourced & recent" promises.

### 1.4 The full role roster, in one place

| # | Role | Kind | Status | Files into | Produces |
|---|---|---|---|---|---|
| 1 | **Reporter desk** (per beat) | LLM agent | **Live** | Wire editor | `NewsItem[]` |
| 2 | **Wire editor** | Deterministic (jq) | **Live** | Review gate + publishers | Edition Set + run record |
| 3 | **Research specialist** (by domain) | LLM agent | v1.0 | Editor-in-chief / human | `ResearchBrief` |
| 4 | **Sourcing specialist** | LLM agent | v1.0 | Outreach gate → human | `OutreachDraft` + roster upserts |
| 5 | **News-hound** | LLM + deterministic score | v1.0 | Wire editor + human | `Candidate[]` |
| 6 | **Media-contributor specialist** | LLM agent | v1.0 | Rights role + human | `ContributorBrief` |
| 7 | **Rights & licensing ("deals")** | LLM agent | v1.0 | Deals gate → human | `LicenceDraft` / ledger entry |
| 8 | **Editor-in-chief ("J. Jonah Jameson")** | LLM judgement | v1.0 | Human creative | `EditorReview` |
| 9 | **Legal clerk** | LLM judgement | v1.0 (as-needed) | Human / counsel; rights role | `ClearanceReport` |
| 10 | **Advertising / sponsorship** | LLM agent | **Deferred** (conditional) | Human (commercial), isolated | `SponsorProposal` |
| 11 | **Translation & localisation** | LLM agent | Future | Accessibility / human | `Translation` |
| 12 | **Accessibility** | LLM agent | Future | Review gate | `AccessibilityPass` |
| 13 | **Second-line QA** (managed agents) | LLM audit (read-only) | Future | Human (oversight) | `QAReport` |
| 14 | **The human creative** | **Human** (not an agent) | **Live** | Audience | The finished, signed-off message |

### 1.5 Shared values (the inheritance every role gets)

All roles inherit one value set — restated compactly here; the full statement is BRD §15 / Roadmap §9. New roles **inherit these; they are not re-litigated.**

> **Human AND** (open tagline; a human is always in it) · **Human authorship & oversight** (no autonomous publication) · **Fair compensation & creator respect** · **Consent & privacy** · **Truth & sourcing integrity** · **Editorial independence from advertising** · **Accessibility & inclusion** · **Transparency & auditability** · **Lawfulness** · **Oversight, not automation, of judgement.**

These are enforced as **architectural controls**, not just policy: the review gate, the outreach gate, the deals gate, the rights/licence ledger, and the editorial–advertising separation boundary.

---

## 2. Shared data model & interfaces

### 2.1 `NewsItem` — the canonical currency of the pipeline

The live schema is 8 fields (Architecture §4.1). This design keeps those as the **required core** and adds **optional provenance fields** that downstream roles populate as the system matures. A reporter desk only emits the core; the editor assigns `id` and `beat`; the verifier sets `verified`; the news-hound sets `momentum`; etc.

```jsonc
NewsItem {
  // --- required core (emitted by desks today) ---
  "title":        string,
  "url":          string,          // real, working URL
  "source":       string,
  "summary":      string,          // 1–2 plain sentences
  "published":    string | null,   // "YYYY-MM-DD" (ISO); null if undated (see C3)
  "official":     boolean,         // true only if released by the org the story is about
  "significance": "high" | "medium" | "low",
  "beat":         string,          // tagged by the desk wrapper / editor

  // --- optional provenance (added as roles mature) ---
  "id":           string,          // editor-assigned, = sha1(url); stable dedup key
  "retrieved_at": string,          // ISO 8601 timestamp the item was fetched
  "verified":     boolean,         // set by the source-verification step (Phase 1)
  "verifier_note":string,          // why verified / why flagged
  "confidence":   number,          // 0..1, source count + official weighting
  "momentum":     number,          // 0..1, set by the news-hound
  "cluster_id":   string,          // story-level dedup key (Phase 1)
  "related_ids":  string[],        // links across editions (timelines)
  "lang":         "string"         // BCP-47, e.g. "en", "fr-CA"
}
```

### 2.2 The `Filing` envelope — how every role hands off

Today `run_desk` writes a bare `NewsItem[]`. To let *any* role file into the same orchestrator, generalise to a **Filing envelope**. The wire editor reads `items` from every `Filing` whose payload is `NewsItem[]`; other payloads route to their consumer.

```jsonc
Filing {
  "schema_version": "1.0",
  "role":   "reporter-desk" | "research-specialist" | "news-hound" | ...,
  "run_id": string,                 // ties all filings in one run together
  "produced_at": string,            // ISO 8601
  "beat":   string | null,
  "status": "ok" | "empty" | "error",
  "needs_human": boolean,           // true ⇒ this filing requires a gate decision
  "items":  NewsItem[] | ResearchBrief[] | Candidate[] | OutreachDraft[] | ...,
  "notes":  string | null
}
```

**Design rule:** a failed or malformed role files `{status:"error", items:[]}` and the run continues — the existing "a broken desk yields an empty filing" guarantee (Architecture §3.1) generalises to every role.

### 2.3 The three human gates (state machines)

Every side-channel that touches the outside world (publishing, contacting a person, paying a creator) terminates at a human gate. Each gate is a small state machine with an audit trail.

```
REVIEW GATE   (editions)
  editor_set ──→ in_review ──→ approved_for_distribution ──→ (human distributes)
                          └──→ revised ──→ in_review
                          └──→ rejected

OUTREACH GATE (sourcing)
  draft ──→ pending_human ──→ approved ──→ sent(logged) 
                         └──→ edited ──→ pending_human
                         └──→ rejected

DEALS GATE    (media / rights / payment)
  draft ──→ pending_human ──→ authorised ──→ executed(ledger) ──→ paid(human)
                         └──→ countered ──→ pending_human
                         └──→ rejected
```

Common audit fields on every gated artefact: `created_by` (role), `created_at`, `state`, `decided_by` (human), `decided_at`, `decision_note`, `history[]`.

**Non-negotiable:** no role may transition a gate past `pending_human`/`in_review` on its own. Only the human creative (§3.14) can `approve`, `authorise`, `send`, `pay`, or `distribute`.

---

## 3. Persona input/output contracts

> Each role below follows the kickoff template: *Role & mandate · Domain · Trigger · Inputs · Sources/channels · Process · Outputs (schema + example) · Quality bar · Guardrails · Hand-offs · Tools/permissions/stores · Failure modes.*

---

### 3.1 Reporter desk — *live*

- **Role & mandate.** Cover one beat; file a short, ranked, sourced, recent list of significant items.
- **Domain.** A single beat (one topic/prompt). Independent of every other desk.
- **Trigger.** Scheduled per edition (launchd 07:00 / 15:00); also on-demand (`EDITION=… ./newsroom-watch.sh`).
- **Inputs.** The beat `*_PROMPT`; the shared `JSON_CONTRACT`; dials `REPORTER_MODEL`, `DESK_MAX_TURNS`, `DESK_MAX_ITEMS`, `MAX_AGE_DAYS`; *(Phase 1)* per-beat source allow/deny list. **Reads no prior state** — the desk is stateless; de-dup against `seen.json` happens later in the editor.
- **Sources / channels.** Public web via `WebSearch` only.
- **Process.** Run several varied searches → keep only items found with a real, citable URL → estimate `published` (ISO) → set `official` + `significance` per the beat's rubric → "omit if unsure; empty is preferred over invented" → return at most `DESK_MAX_ITEMS`, newest/official/high first.
- **Outputs.** A raw JSON array of the **`NewsItem` core** (no `beat` — the wrapper tags it). Example:

  ```json
  [
    {"title":"Anthropic responds to export-control suspension","url":"https://www.anthropic.com/news/…","source":"Anthropic Newsroom","summary":"Anthropic published an official statement on the June 12 suspension and outlined next steps.","published":"2026-06-13","official":true,"significance":"high"}
  ]
  ```
- **Quality bar.** Real working URL; within recency; significance graded relative to *routine* releases (high = materially changes the situation / official response; medium = notable new info; low = routine).
- **Guardrails.** Anti-fabrication contract (multiple searches, real URLs, "omit if unsure", `[]` allowed); no source = no item.
- **Hand-offs.** → **Wire editor** (writes `desk-<beat>.json`).
- **Tools / permissions / stores.** Headless `claude -p --allowedTools WebSearch --max-turns N`; writes one file; no network beyond search.
- **Failure modes.** Invocation fails or returns invalid JSON ⇒ wrapper writes `[]`, logs it, run continues.

---

### 3.2 Wire editor — *live, deterministic, non-LLM*

- **Role & mandate.** Turn all filings into one ranked, deduped, floored, capped **Edition Set** — with **no model**, fully reproducibly.
- **Domain.** Curation logic only. Provider-agnostic.
- **Trigger.** Once per run, after every desk/role has filed (`wait`).
- **Inputs.** All `NewsItem[]` filings; `seen.json`; dials `SIGNIFICANCE_FLOOR`, `MAX_AGE_DAYS`→`CUTOFF`, `MAX_ITEMS`. *(Phase 1)* per-beat windows/floors; verifier output.
- **Sources / channels.** None (reads local files).
- **Process — the deterministic transform** (current jq, stated as pseudocode):
  1. **Collate** all desk arrays (`add // []`).
  2. **Drop already-seen** URLs (`index($u) | not` against `seen.json`).
  3. **Significance floor** (`rank(.significance) >= rank($floor)`; unknown ⇒ medium — C4).
  4. **Recency** (`published == null OR published >= CUTOFF` — undated passes today, C3).
  5. **De-dupe** `unique_by(.url)` *(Phase 1: also `cluster_id` for story-level)*.
  6. **Order** `sort_by([official?0:1, 3-rank(significance)])` — official first, then high→low.
  7. **Cap** at `MAX_ITEMS`.
- **Outputs.** `NEW_ITEMS` (the Edition Set, `NewsItem[]`) **and** a **run record** appended to `history.jsonl`:

  ```json
  {"ts":"2026-06-13T15:00:11Z","edition":"Afternoon","date":"2026-06-13",
   "filed":{"Fable/Mythos export control":4,"PwC Canada & competitors (AI)":2},
   "published":[ /* NewsItem[] */ ]}
  ```
- **Quality bar.** Byte-for-byte reproducible from the same inputs; **zero model cost** (the most logic-heavy stage is free).
- **Guardrails.** Deterministic and inspectable; cannot fabricate (it only filters/orders existing items). The single point where the "cheap + explicit curation" promise is kept.
- **Hand-offs.** → **Human review gate** (the Edition Set as a *draft*), → publishers (Drive edition, dashboard, Obsidian, notification).
- **Tools / permissions / stores.** `jq`; reads/writes `seen.json`, `history.jsonl`, `desk-*.json`.
- **Failure modes.** All inputs empty ⇒ quiet-day edition (if `PUBLISH_EMPTY`); upstream bad JSON already coerced to `[]` before it arrives.

> **Persona-x note:** the wire editor must **never** be a Persona-x persona. Its value is determinism; a persona would reintroduce model cost and non-reproducibility.

---

### 3.3 Research specialist (by domain) — *v1.0*

- **Role & mandate.** Go beyond headlines: gather deeper, authoritative material on a topic from **primary sources** and file a cited brief.
- **Domain.** Defined by *specialisation* (cybersecurity, architecture, law, healthcare, finance, entertainment…), not a single news beat. Carries a domain **source-quality rubric**.
- **Trigger.** On-demand — the editor-in-chief or the human requests a deep-dive on a `NewsItem`/beat; optionally a slower scheduled cadence (weekly).
- **Inputs.** Topic/question; the triggering `NewsItem(s)`; the domain source-quality rubric; source allow/deny lists; any prior `ResearchBrief` on the topic.
- **Sources / channels.** Weighted to authority — papers/pre-prints (arXiv, SSRN), standards bodies, official registries, primary filings, libraries/archives — via `WebSearch` + `WebFetch`. **Respects paywalls/licences** (cite, don't scrape gated full-text).
- **Process.** Gather primary sources → weight by authority → extract claims each tied to a citation → mark `source_type` (peer-reviewed/official/preprint/secondary) → record caveats and confidence → never fill gaps with invention.
- **Outputs.** `ResearchBrief`:

  ```jsonc
  ResearchBrief {
    "id": string, "topic": string, "produced_at": string,
    "summary": string,                       // plain-language synthesis
    "key_findings": [
      {"claim": string, "evidence_url": string,
       "source_type": "peer_reviewed"|"official"|"preprint"|"secondary",
       "confidence": number /*0..1*/}
    ],
    "primary_sources": [ {"title": string, "url": string, "publisher": string, "date": string} ],
    "caveats": string[], "lang": "string", "needs_human": boolean
  }
  ```

  *Example finding:* `{"claim":"The directive cites EAR §744 as the legal basis","evidence_url":"https://www.federalregister.gov/…","source_type":"official","confidence":0.9}`
- **Quality bar.** Primary-source citation fidelity; peer-reviewed/official clearly separated from commentary; nothing presented as fact without a resolvable citation.
- **Guardrails.** Citations mandatory; licences/paywalls respected; **research not advice** for regulated domains; low-evidence ⇒ low confidence + flag, never bluff.
- **Hand-offs.** → **Editor-in-chief** (attached to a story) and/or the **human creative**.
- **Tools / permissions / stores.** `WebSearch`, `WebFetch`; source allow/deny + domain rubric store; writes briefs to a `research/` store.
- **Failure modes.** Thin/contradictory sources ⇒ low-confidence brief flagged `needs_human:true`; never fabricates a citation.

---

### 3.4 Sourcing specialist — *v1.0*

- **Role & mandate.** Maintain a live human-source roster and **draft** (never send) tailored outreach so a story can carry a real human voice.
- **Domain.** Per-topic human sources — experts, insiders, spokespeople, analysts.
- **Trigger.** On-demand when a story needs comment; plus a periodic roster freshness check.
- **Inputs.** The story/beat; the **contacts roster** (read); each contact's `consent_status`, `do_not_contact`, `channel_permissions`, last-contacted date + `frequency_cap`; outreach templates.
- **Sources / channels.** The contacts store; drafts via **email (Gmail draft)**, **text** (where permitted), and **virtual voice** only where explicit permission exists (see Open Decisions — recommended **deferred**).
- **Process.** Match the right expert to the story → check `consent` + `do_not_contact` + `frequency_cap` + `channel_permission` → draft a tailored, accurate, respectful message → set `status:"pending_human"` → log the intent. **Never sends.**
- **Outputs.** `OutreachDraft` (+ roster upserts):

  ```jsonc
  OutreachDraft {
    "id": string, "contact_id": string, "story_id": string,
    "channel": "email"|"text"|"voice",
    "subject": string|null, "body": string,
    "rationale": string,                       // why this person, why now
    "consent_status": "opted_in"|"prior_relationship"|"cold",
    "state": "pending_human",                  // OUTREACH GATE
    "created_by": "sourcing-specialist", "created_at": string
  }
  ```
- **Quality bar.** Right expert for the story; message accurate and courteous; complies with consent + frequency + channel rules.
- **Guardrails.** **OUTREACH GATE** — drafted only; human approves the send. Honour `do_not_contact`, consent, channel permissions, frequency caps, and comms/privacy law; full audit of who/how/why. Voice only with explicit per-contact permission.
- **Hand-offs.** → **Human creative** (approve / edit / send). On approval a sender executes and logs to the outreach log.
- **Tools / permissions / stores.** Contacts roster (Airtable); **Gmail MCP `create_draft` only** (no send); templates; outreach log.
- **Failure modes.** No consent / on DNC ⇒ no draft, flag instead. No suitable contact ⇒ propose finding one (still human-approved); never cold-contacts outside policy.

---

### 3.5 News-hound — *v1.0*

- **Role & mandate.** Proactively detect rising stories on watched topics and surface scored **candidates** — propose, never publish.
- **Domain.** Early-signal detection across the watched topic space.
- **Trigger.** Scheduled on a **faster tick** than editions (e.g. hourly) on a cheap model; or continuous.
- **Inputs.** Watched topics/beats; sensitivity/momentum params; known/seen stories; prior candidates.
- **Sources / channels.** `WebSearch` and (where available) social/trend signals.
- **Process.** Scan for emerging / fast-moving / under-reported items → compute a **momentum** score (velocity of coverage, source count, recency, official involvement) → dedupe against known stories → surface candidates and suggest new beats. Momentum is **explainable** (the signals are returned, not just the number).
- **Outputs.** `Candidate[]` (a `NewsItem` subset + momentum):

  ```jsonc
  Candidate {
    "id": string, "title": string, "url": string, "source": string,
    "summary": string, "first_seen": string,
    "momentum": number /*0..1*/,
    "signals": {"velocity": number, "source_count": number, "official_involved": boolean},
    "suggested_beat": string|null,
    "state": "candidate"
  }
  ```
- **Quality bar.** Precision over recall, tuned by sensitivity; avoid hype/false positives; the score must be justifiable from `signals`.
- **Guardrails.** Proposes to the editor and human; **never auto-publishes**; sourcing integrity (real URLs only).
- **Hand-offs.** → **Wire editor** (candidates can be promoted into the edition set) and → **human** (suggested new beats).
- **Tools / permissions / stores.** `WebSearch`; a **deterministic momentum scorer** (keep the maths model-free where possible); a candidates store.
- **Failure modes.** Too noisy ⇒ raise the threshold; nothing rising ⇒ empty filing.

> **Persona-x note:** the *scoring* should stay deterministic, but the "is this worth a human's attention?" judgement can optionally be expressed as a Persona-x persona (a "nose for news" stance). Partial fit — see §6.

---

### 3.6 Media-contributor specialist — *v1.0*

- **Role & mandate.** Source **original, rights-cleared** media from human contributors (paid), instead of stock or uncredited material.
- **Domain.** Photographers, illustrators, videographers, artists held in the roster as paid contributors.
- **Trigger.** On-demand when a story needs original imagery/media.
- **Inputs.** Story brief; contributor roster; indicative budget guidance.
- **Sources / channels.** Contributor roster; briefs drafted via email.
- **Process.** Match a suitable contributor to the story → draft a brief (scope, usage, deadline, indicative budget) → route to **Rights & licensing** for terms and to the **human** for selection. Drafts only.
- **Outputs.** `ContributorBrief`:

  ```jsonc
  ContributorBrief {
    "id": string, "contributor_id": string, "story_id": string,
    "brief": string, "usage_scope": string, "deadline": string,
    "indicative_budget": string, "state": "pending_human"
  }
  ```
- **Quality bar.** Suitable contributor; clear scope; fair indicative pay.
- **Guardrails.** Fair pay; consent; drafts for approval; **no media used without a cleared licence** (handed to §3.7).
- **Hand-offs.** → **Rights & licensing** (terms) + **human** (selection).
- **Tools / permissions / stores.** Contributor roster (part of contacts store); email draft; link to rights ledger.
- **Failure modes.** No suitable contributor ⇒ propose sourcing one; never substitutes uncredited/stock as if original.

---

### 3.7 Rights & licensing ("deals") — *v1.0*

- **Role & mandate.** Identify rights-holders and **draft fair, real payment terms + licences**; the human authorises every deal and payment.
- **Domain.** Licensing of people's media and art.
- **Trigger.** On-demand when media/art is to be used.
- **Inputs.** Asset/media reference; rights-holder info; required usage scope; budget guidance; the **rights/licence ledger** (read).
- **Sources / channels.** Rights-holders (via drafted comms); licence templates.
- **Process.** Identify the rights-holder → determine required usage rights → draft a licence + **fair payment** terms → record proposed terms → queue for human authorisation. Negotiates/drafts; **does not commit**.
- **Outputs.** `LicenceDraft` / ledger entry:

  ```jsonc
  LicenceDraft {
    "id": string, "asset_id": string, "rights_holder": string,
    "usage_scope": string, "term": string,
    "fee": string, "attribution": string, "royalty": string|null,
    "state": "pending_human",                  // DEALS GATE
    "audit": [ {"at": string, "by": string, "action": string} ]
  }
  ```
- **Quality bar.** Fair, real payment; complete usage scope; correct attribution.
- **Guardrails.** **DEALS GATE** — drafts/negotiates; **humans authorise every deal + payment**; no use without a cleared licence; full audit in the ledger.
- **Hand-offs.** → **Human** (authorise) → on authorisation the licence executes and payment is made by the human/finance; ledger updated.
- **Tools / permissions / stores.** Rights/licence ledger (Airtable); licence templates; email draft. **Payment is human/out-of-band** — no agent moves money.
- **Failure modes.** Rights unclear ⇒ flag, do **not** use the asset; escalate to the legal clerk.

---

### 3.8 Editor-in-chief ("J. Jonah Jameson") — *v1.0*

- **Role & mandate.** Enforce editorial standards, angle, house style, and the significance bar; assign and critique — **under human authority** (it pressures and proposes; the human decides).
- **Domain.** Editorial judgement over the whole edition.
- **Trigger.** Each edition (after the wire editor, before the human gate); on-demand for assignments.
- **Inputs.** The editor's Edition Set; the **house style guide**; the significance policy; the beats; attached `ResearchBrief`s and `Candidate`s.
- **Process.** Review the set for angle/sharpness/standards → push for stronger angles → flag weak/borderline items → propose assignments (to research/sourcing/media) → recommend a running order → write an editor's note. All **advisory**.
- **Outputs.** `EditorReview`:

  ```jsonc
  EditorReview {
    "edition_id": string, "produced_at": string,
    "recommendations": [
      {"item_id": string,
       "verdict": "lead"|"keep"|"cut"|"needs_more",
       "note": string,
       "assignment": {"role": string, "ask": string} | null}
    ],
    "editors_note": string,
    "proposed_order": string[]                 // item_ids
  }
  ```
- **Quality bar.** House style upheld; significance discipline; angle quality raised, not just preserved.
- **Guardrails.** Advisory/gatekeeping **under human authority**; no autonomous publish; sourcing integrity.
- **Hand-offs.** → **Human creative** (final decision); assignments fan out to research/sourcing/media.
- **Tools / permissions / stores.** Read access to all filings; house style store; LLM (judgement).
- **Failure modes.** Over-aggressive cuts ⇒ human overrides; always defers to the human.

> **Persona-x note:** this is the **prime Persona-x persona** — its value *is* a judgement stance, which maps cleanly onto the six-dimension rubric. Sketched in full in §6.2.

---

### 3.9 Legal clerk — *v1.0 (as-needed)*

- **Role & mandate.** Clearance support — rights/permissions, attribution, fair-use/defamation/privacy flags. **A clerk, not counsel**; escalates genuine legal questions.
- **Domain.** Pre-publication legal exposure checks.
- **Trigger.** On items with exposure (named individuals, strong claims, third-party media), before the human gate.
- **Inputs.** The item/asset/draft; attribution data; the rights ledger; jurisdiction context; the flag ruleset.
- **Process.** Check attribution completeness → flag potential fair-use/defamation/privacy issues → verify a licence exists for any third-party media → record a clearance status → **escalate** real legal questions to a human/qualified counsel.
- **Outputs.** `ClearanceReport`:

  ```jsonc
  ClearanceReport {
    "item_id": string, "produced_at": string,
    "status": "cleared"|"flagged"|"escalated",
    "flags": [ {"type":"defamation"|"fair_use"|"privacy"|"attribution"|"licence",
                "severity":"low"|"medium"|"high", "note": string} ],
    "escalation": {"to":"human","reason": string} | null
  }
  ```
- **Quality bar.** Catch real exposure; minimise false alarms; **never gives legal advice**.
- **Guardrails.** Clerk-not-counsel; escalate on uncertainty (fail safe to human); lawfulness; everything logged.
- **Hand-offs.** → **Human / counsel** (escalations); → **Rights & licensing** (licence gaps).
- **Tools / permissions / stores.** Rights ledger; attribution store; flag ruleset; LLM.
- **Failure modes.** Uncertain ⇒ **escalate** (never silently clears).

> **Persona-x note:** good secondary persona fit (a "boundary-setter" stance, cf. the example `ethical-boundary-guardian.yaml`). See §6.

---

### 3.10 Advertising / sponsorship — *deferred (conditional)*

- **Role & mandate.** Source sponsorship/placement **with a hard editorial–advertising separation** and clear disclosure. **Recommended excluded from v1.0** (Open Decisions).
- **Domain.** Commercial, entirely outside editorial.
- **Trigger.** On-demand, **only if adopted**.
- **Inputs.** Sponsorship inventory; disclosure rules. **Has no read path to** significance/selection logic, `seen.json`, or `history` beyond already-published output.
- **Process.** Source sponsors → draft proposals → attach disclosure text → keep wholly isolated from editorial.
- **Outputs.** `SponsorProposal`:

  ```jsonc
  SponsorProposal {
    "id": string, "sponsor": string, "placement": string,
    "terms": string, "disclosure_text": string, "state": "pending_human"
  }
  ```
- **Quality bar.** Fit; mandatory disclosure; zero editorial influence.
- **Guardrails.** **EDITORIAL–ADVERTISING SEPARATION boundary** — never reads or influences significance/selection; all sponsored content disclosed; human approves commercially.
- **Hand-offs.** → **Human** (commercial decision), on a separate track from the editorial chain.
- **Tools / permissions / stores.** Isolated store; explicitly **no** access to editor/seen/history.
- **Failure modes.** Any attempt to influence selection is structurally impossible (no read path).

---

### 3.11 Translation & localisation — *future*

- **Role & mandate.** Faithfully translate sources/outputs and localise; **flag uncertainty** rather than guess.
- **Trigger.** Post-edit, when non-English sources or a target locale are involved.
- **Inputs.** Source text/item; target locale; glossary; fidelity threshold.
- **Process.** Translate preserving meaning, nuance, and **attribution** → score fidelity → flag low-confidence segments for human review.
- **Outputs.** `Translation { "item_id", "target_locale", "translated_fields", "fidelity": number, "flags": string[], "needs_human": boolean }`.
- **Quality bar.** Meaning and attribution preserved; low-fidelity flagged, never published silently.
- **Guardrails.** Fidelity flags; attribution preserved; human reviews the uncertain.
- **Hand-offs.** → **Accessibility** / **human**.
- **Tools / permissions / stores.** LLM; glossary store.
- **Failure modes.** Low fidelity ⇒ flag, don't ship.

---

### 3.12 Accessibility — *future*

- **Role & mandate.** Make every edition and asset **accessible by default** (alt-text, captions/transcripts, plain-language, screen-reader structure; WCAG-aligned).
- **Trigger.** Post-edit, before the human review gate.
- **Inputs.** The edition + assets; a WCAG checklist.
- **Process.** Generate alt-text and captions/transcripts → produce a plain-language alternative → check structure against WCAG → flag gaps for the human.
- **Outputs.** `AccessibilityPass { "edition_id", "alt_texts":[{"asset_id","text"}], "transcripts":[…], "plain_language": string, "wcag_findings":[{"criterion","status","note"}], "needs_human": boolean }`.
- **Quality bar.** Accessible by default; gaps surfaced, not hidden.
- **Guardrails.** Accessibility & inclusion value enforced; flags for the human.
- **Hand-offs.** → **Human review gate**.
- **Tools / permissions / stores.** LLM; WCAG ruleset.
- **Failure modes.** Can't caption a media type ⇒ flag for the human.

---

### 3.13 Second-line QA (Anthropic Fable managed agents) — *future*

- **Role & mandate.** Audit **agent behaviour** — sourcing integrity, anomaly detection, conduct/compliance — so a **non-technical human can trust the pipeline**. Oversight, never authorship.
- **Trigger.** Continuous/periodic over the run history, filings, and gate logs.
- **Inputs.** `history.jsonl`; filings; outreach log; rights ledger; gate decisions; verification cache. **Read-only.**
- **Process.** Verify cited URLs resolve and match → detect fabrication/anomalies → confirm consent/DNC were honoured → confirm the ad–editorial boundary held → confirm **no autonomous send/publish** occurred → produce a trust report + alerts.
- **Outputs.** `QAReport`:

  ```jsonc
  QAReport {
    "period": string, "produced_at": string,
    "checks": [ {"name": string, "status":"pass"|"warn"|"fail",
                 "evidence": string, "note": string} ],
    "anomalies": string[], "alerts": string[]
  }
  ```
- **Quality bar.** Catches real integrity violations; explainable; low false-alarm rate.
- **Guardrails.** **Oversight not authorship** — audits agents, never writes or publishes; strictly read-only over the stores.
- **Hand-offs.** → **Human** (trust report). An alert may *recommend* pausing a role, but a human confirms.
- **Tools / permissions / stores.** Read access to all stores/logs; a managed-agent platform (future). Until then, a scheduled read-only audit agent fills the role.
- **Failure modes.** If QA itself fails ⇒ degrade to a manual audit; **never silently blocks** the pipeline.

---

### 3.14 The human creative — *the authority and the publish gate (not an agent)*

- **Role & mandate.** Assemble the agents' work into a finished message, exercise judgement, and **be the only actor that publishes, sends, authorises, or pays.** This is the keystone control, not a step.
- **Receives.** The draft edition (`.md` on Drive) + dashboard; the `EditorReview`; `ResearchBrief`s; news-hound `Candidate`s; the **approval queues** — `OutreachDraft`s, `LicenceDraft`s, `ClearanceReport`s; and (later) accessibility/translation passes and the `QAReport`.
- **Reviews / edits.** Significance calls, angle, wording, ordering; accepts/overrides editor recommendations.
- **Approves.** Each gated item individually — outreach sends, licence/payment authorisations, the final distribution.
- **Publishes.** To the audience (their action), with disclosure where sponsored.
- **Authority.** The **only** role that can cross the review, outreach, and deals gates. Every gate terminates here.
- **Tools / permissions / stores.** Google Drive (editions/dashboard); **Airtable** approval views (queues, roster, ledger); **Gmail** (send approved drafts); the dashboard; optionally an email digest to self.
- **Why a human, not an agent.** "Integrity is the product." Because a human always assembles and signs off, credibility is preserved by design (BRD §13).

---

## 4. Data stores the roster implies

For a **single-operator** tool, split stores by audience: **machine state** stays as files; **human-facing review/approval surfaces** go to Airtable; **drafts** to Gmail; **outputs** to Drive.

| Store | Purpose | Recommended form | Written by | Read by | Status |
|---|---|---|---|---|---|
| `history.jsonl` | One record per run (dashboard system-of-record) | Local JSONL | Wire editor | Dashboard, QA | **Live** |
| `seen.json` | Published-URL de-dup memory | Local JSON | Editor | Editor | **Live** |
| `desk-*.json` | Latest raw filing per role (debug) | Local JSON | Role wrappers | Editor, debug | **Live** |
| `watch.log` | Timestamped run log | Local log | Orchestrator | Operator, QA | **Live** |
| `beats.yaml` | Beats/roles as config (prompts, per-beat window/floor, allow/deny) | Local YAML | Human | Orchestrator | v1.0 (Phase 0) |
| Source allow/deny | Bias to trusted outlets; suppress low-quality | Local YAML | Human | Desks, research | v1.0 (Phase 1) |
| Verification cache | URL→{resolved, title-match, checked_at} | Local JSON/SQLite | Verifier | Editor, QA | v1.0 (Phase 1) |
| Candidates | News-hound rising-story candidates | Local JSON | News-hound | Editor, human | v1.0 |
| **Contacts roster** | Human sources + media contributors (who, expertise, channel, **consent**, DNC, last-contacted, frequency cap) | **Airtable base** | Sourcing/media; human | Sourcing/media; human | v1.0 |
| Outreach log | Every draft + decision + send (audit) | Airtable / append-only | Sourcing; sender | Human, QA | v1.0 |
| **Rights/licence ledger** | Rights-holder, usage scope, fee, attribution, royalty, payment status (audit) | **Airtable base** | Rights/media | Human, legal, QA | v1.0 |
| Approval queues | Pending review/outreach/deals items for the human | **Airtable views** | Roles | Human | v1.0 |
| House style guide | Editorial standards for the EIC | Local Markdown | Human | Editor-in-chief | v1.0 |
| `research/` | Stored `ResearchBrief`s | Local files | Research specialist | EIC, human | v1.0 |
| QA reports | Trust reports / alerts | Local files / Airtable | Second-line QA | Human | Future |

> **Why Airtable for the human-facing three:** you already run the Airtable MCP. Putting the contacts roster, the rights/licence ledger, and the approval queues there gives you ready-made review/approve UIs, comment threads, and an audit trail — without building a console. Editions stay on Drive; outreach stays as Gmail drafts you approve and send. (See Build Plan, Open Decisions.)

---

## 5. Hand-off map (who consumes whom)

```
Reporter desks ─┐
News-hound ─────┼─→ WIRE EDITOR ─→ Editor-in-chief ─→  ┐
Research spec ──┘        │            (advisory)        │
                        │         Legal clerk ─────────┤→ HUMAN REVIEW GATE ─→ human distributes
                        │         Accessibility ───────┤        (the human creative)
                        │         Translation ─────────┘
                        └─→ Drive draft + dashboard + digest

Sourcing spec ─→ OutreachDraft ─→ OUTREACH GATE ─→ human ─→ send + outreach log
Media spec ───→ ContributorBrief ─┐
Rights/deals ─→ LicenceDraft ─────┴→ DEALS GATE ─→ human ─→ execute + ledger + (human) pay
Advertising ──→ SponsorProposal ─→ human (commercial, isolated)        [deferred]
Second-line QA ─→ QAReport ─→ human (read-only oversight of everything above)   [future]
```

---

## 6. Persona-x tie-in — recommendation + one sketch

### 6.1 Recommendation

Persona-x persona definitions are built for **adversarial panel deliberation**: their schema (`purpose.invoke_when` / `do_not_invoke_when`, `panel_role.failure_modes_surfaced`, and the **six-dimension rubric** — `risk_appetite`, `evidence_threshold`, `tolerance_for_ambiguity`, `intervention_frequency`, `escalation_bias`, `delivery_vs_rigour_bias`) describes a *judgement stance*, not a production transform. So:

| Newsroom Watch role | Express as… | Why |
|---|---|---|
| **Editor-in-chief** | ✅ **Persona-x persona** (primary) | Its entire value is a judgement stance; the rubric fits perfectly (high `evidence_threshold`, high `intervention_frequency`, `delivery_vs_rigour_bias` toward rigour). |
| **Legal clerk** | ✅ Persona-x persona (secondary) | A boundary-setter (cf. `ethical-boundary-guardian.yaml`): high `escalation_bias`, low `tolerance_for_ambiguity`. |
| **Second-line QA** | ✅ Persona-x persona (auditor) | An adversarial auditor stance over agent behaviour; rubric captures its scepticism. |
| **News-hound** (the "is this worth attention?" call only) | ◑ Partial | The *score* stays deterministic; only the editorial-instinct judgement is persona-shaped. Optional. |
| **Research specialist** | ◑ Light | Has a source-quality rubric but is mostly an I/O transform; the **functional contract is the better fit**, with the rubric as a config field. |
| **Reporter desk, Wire editor, Sourcing, Media, Rights, Translation, Accessibility, Advertising** | ❌ **Functional I/O contract** | These are production/compliance roles. Their value is the I/O transform + guardrails, which §3 already captures. The wire editor must *never* be a persona (determinism). |
| **Human creative** | ❌ Not a persona | A person, not an agent. (The Editor-in-chief persona is the *encoding of the standards the human steers*.) |

**Best of both:** dual-express only the three judgement roles (EIC, legal clerk, QA). Then they can *also* sit on a Persona-x review panel over a draft edition — e.g. run the draft through the Decision Engine with the Editor-in-chief + Sceptical-Investor + Ethical-Boundary-Guardian personas as a "morning conference." Everything else stays a functional contract.

### 6.2 Sketched persona (delivered)

`examples/newsroom/editor-in-chief.yaml` — a full Persona-x persona definition for the Editor-in-chief, in the canonical schema shape (`metadata / purpose / bio / panel_role / rubric / reasoning / interaction / communication`), is included in this change set as the worked example. The other two (legal clerk, QA auditor) follow the same pattern when you want them.

---

## 7. What changes in the prototype to honour this design (pointers; detail in the Build Plan)

- **C2 →** label auto-written editions `DRAFT — for human review`; define "distribution" as the human action.
- **C3 →** tag undated items `published:null`, keep them, surface them last.
- **C6 →** rename `fable-mythos-watch*` → `newsroom-watch*` (cosmetic, clean Phase 0).
- **Filing envelope →** generalise `run_desk` into a role runner that emits §2.2 envelopes, so research / news-hound / etc. file the same way.
- **Stores →** stand up the Airtable contacts roster, rights ledger, and approval queues; keep machine state as files.

The ordered path, quick-wins-vs-big-bets, and the open decisions (hosting, channels, outreach/voice policy, per-beat recency, retention, advertising) — each with a recommendation — are in **`NEWSROOM-WATCH-BUILD-PLAN.md`**.
