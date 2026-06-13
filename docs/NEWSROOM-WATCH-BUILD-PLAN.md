# Newsroom Watch — Prioritised Build Plan & Open Decisions

| | |
|---|---|
| **Document** | Prioritised Build Plan + Open Decisions (with recommendations) |
| **Product** | Newsroom Watch |
| **Version** | 0.1 (draft) — companion to Persona Contracts v0.4; extends Roadmap v0.3 |
| **Owner** | victorycross@gmail.com (Brightpath Technologies) |
| **Status** | Draft — for review |
| **Last updated** | 13 June 2026 |
| **Design assumption** | **v1.0 = single-operator personal tool**, feature-rich. Scope confirmed to include: trust + hosting core, sourcing + outreach, news-hound, and rights/media — all built for one operator (you = operator + human creative). |

---

## 1. Where we are (today)

A working single-host prototype (`fable-mythos-watch.sh` + launchd):
two reporter desks → pure-jq wire editor → twice-daily Markdown editions + regenerated HTML dashboard to Drive + rolling Obsidian digest + macOS notification + `history.jsonl`. Auth via the desktop Claude Code session; cost bounded by capped turns/items and a model-free editor.

## 2. Shape of the plan

Five phases. Each lists **what unlocks it**, **quick wins (hours–day)** vs **bigger bets (days–week)**, and **what it unlocks downstream**. Phases 0–3 constitute **v1.0**; Phase 4 is post-v1.0.

The ordering principle (from the Roadmap's "trust before reach"): **make the spine trustworthy and hostable first, then add the roster.** Sourcing/deals are powerful but every one of them depends on the gates and stores being solid — so they come after the trust core, not before.

---

### Phase 0 — Housekeeping & generalisation *(quick wins; ~1–2 days)*

| Item | Win/Bet | Unlocks |
|---|---|---|
| **Rename** `fable-mythos-watch*` → `newsroom-watch*` (script, plist, `~/.newsroom-watch/`) | Quick | The topic-agnostic use-case story stops being undercut by the filename (C6). |
| **Beats-as-config** (`beats.yaml`: prompt, per-beat window, per-beat floor, allow/deny) | Bet (small) | Turning on a use case = editing data, not code. Foundation for everything per-beat. |
| **Per-beat recency window + per-beat significance floor** | Quick (once beats.yaml exists) | Fast policy beats (3 days) and slow sector beats (14–30) coexist. |
| **Undated-item handling** (C3): tag `published:null`, keep, surface last | Quick | Recency promise becomes honest; nothing silently bypasses the filter. |
| **`Filing` envelope + generic role runner** (generalise `run_desk`) | Bet | Research / news-hound / any role files the same way; the editor reads `NewsItem[]` filings uniformly. The single most leveraged refactor. |

**Exit:** beats are config; any role can file; recency is honest; naming is clean.

---

### Phase 1 — Trust core *(the spine; ~3–5 days)*

| Item | Win/Bet | Unlocks |
|---|---|---|
| **Automated source verification** (fetch each URL, confirm it resolves and the title/claim matches; set `verified` + `verifier_note`) | Bet | Closes the hallucination gap (BRD O3) without manual spot-checks; precursor to Second-line QA. |
| **Story-level de-dup** (`cluster_id` by canonical-link/title similarity) | Bet | Afternoon stops repeating Morning across outlets; cleaner editions. |
| **Formalise the review gate** (C2): editions written as `DRAFT — for human review`; "distribution" defined as the human action; an explicit approve step | Quick | The "no autonomous publication" principle is now visible in the artefact, not just policy. |
| **Source allow/deny lists wired into desks** | Quick | Bias toward trusted outlets; suppress junk. |
| **Confidence score** (source count + official weighting) | Quick | Feeds verification + the editor's ordering. |

**Exit:** every published item is verified or visibly flagged; editions are explicitly drafts; curation is trustworthy.

---

### Phase 2 — Hosting & reach *(reliability; ~2–4 days)*

| Item | Win/Bet | Unlocks |
|---|---|---|
| **Central hosting** (small always-on VM/container + cron) | Bet | Editions run when the laptop is asleep (Roadmap risk). **Important:** a headless server can't use the desktop session login — it needs `ANTHROPIC_API_KEY`. That changes the cost model from "reuse my session" to "metered API spend" (still bounded by capped turns/items). Decide deliberately (Open Decisions). You already have a DigitalOcean droplet planned for `research.brightpathtechnology.io` — co-host here. |
| **Email digest to self** (Gmail) alongside Drive | Quick | A push channel you actually read; foundation for any future team channel. |
| **Web-hosted dashboard** (shareable link, filter by beat/significance) | Bet | Removes the Drive fixed-name overwrite issue (C8); shareable when you want it. |

**Exit:** twice-daily editions land reliably without the Mac; you get a digest you read; the dashboard is a link.

---

### Phase 3 — The roster (the selected v1.0 specialists) *(~1–2 weeks, incremental)*

Stand up the human-facing stores first, then the roles that depend on them. Each role files via the Phase-0 envelope and terminates at its gate.

| Step | Item | Unlocks |
|---|---|---|
| 3a | **Airtable stores**: contacts roster, rights/licence ledger, approval queues (views) | The review/approve surfaces every side-channel needs. Do this before the roles that write to them. |
| 3b | **News-hound** (faster tick, deterministic momentum, candidates → editor + suggested beats) | Proactive discovery; cycles start themselves. Lowest-risk roster role (read-only, no gate) — good first. |
| 3c | **Research specialist** (on-demand deep briefs, primary sources) | Depth behind a headline; feeds the Editor-in-chief. |
| 3d | **Editor-in-chief persona** (Persona-x) over the draft edition | Sharper angles + standards discipline before the human sees it. (Persona YAML already sketched.) |
| 3e | **Sourcing specialist + OUTREACH GATE** (Gmail drafts; consent/DNC/frequency in the roster) | Real human voices — drafted, you approve + send. |
| 3f | **Media-contributor + Rights & licensing + DEALS GATE** (ledger; human authorises pay) | Original, paid, rights-cleared media; fair-pay value made real. |
| 3g | **Legal clerk** on flagged items (clearance/escalation) | Exposure caught before the human gate. |

**Exit (this is v1.0):** all of the above, single-operator, with Airtable + Gmail + Drive as the human surfaces and the three gates live and audited.

---

### Phase 4 — Post-v1.0

| Item | Why |
|---|---|
| **Translation & localisation** | Non-English sources; localised editions. |
| **Accessibility pass** | WCAG-aligned editions by default. |
| **Second-line QA (managed agents)** | Read-only audit of agent behaviour so trust scales without you being technical. Start as a scheduled audit agent; adopt managed agents when available. |
| **Advertising/sponsorship** | Only if ever wanted; hard separation + disclosure (recommended *excluded* — see Open Decisions). |
| **Trend/theme weekly roll-ups; feedback loop; cost dashboard** | Roadmap backlog; nice-to-haves once the spine is mature. |

---

## 3. v1.0 definition (reconciled)

Extends Roadmap §8 with the confirmed scope:

- Human-in-the-loop review gate **formalised and visible** (drafts labelled; explicit approve).
- **Per-beat recency + automated source verification** in place.
- **Beats managed as configuration**; a **shareable dashboard**.
- **Centrally hosted**; editions reliable without the laptop.
- The selected roster **live**: news-hound, research, editor-in-chief (persona), sourcing + outreach gate, media + rights + deals gate, legal clerk.
- Human-facing stores in **Airtable** (contacts roster, rights ledger, approval queues); outreach as **Gmail drafts**; editions on **Drive**.

---

## 4. Quick wins vs bigger bets (at a glance)

**Quick wins (do first, high leverage/low cost):** rename; per-beat dials; undated-item fix; draft-labelling the editions; source allow/deny; email digest to self; confidence score.

**Bigger bets (sequence deliberately):** the `Filing` envelope refactor (Phase 0 — unlocks the whole roster); source verification + story-level dedup (Phase 1); central hosting + the API-key cost shift (Phase 2); the Airtable stores + each gated role (Phase 3).

---

## 5. Open decisions (each with a recommendation)

> These are yours to set. Defaults below are what I'd choose for a single-operator v1.0; nothing is locked.

### 5.1 Hosting
**Options:** stay on Mac+launchd · small always-on VM/container+cron · CI runner.
**Recommendation:** **Phases 0–1 stay on Mac+launchd** (zero new infra; fast iteration). **Phase 2 move to the small DigitalOcean droplet you already plan for `research.brightpathtechnology.io`**, on cron, using `ANTHROPIC_API_KEY`. Accept metered (but capped) API spend as the price of reliability-without-the-laptop. Keep the Mac path working as a fallback.

### 5.2 Delivery channels
**Options:** Drive-only · + email · + Slack/Teams.
**Recommendation:** keep **Drive as the draft surface**; add a **Gmail email digest to yourself** in Phase 2 (a channel you actually read). Defer Slack/Teams until there's a team (not v1.0). The dashboard becomes a shareable link in Phase 2.

### 5.3 Sourcing-outreach consent/approval policy + voice channel
**Recommendation (conservative by design):**
- **Consent:** record `consent_status` + `do_not_contact` per contact in the roster; only `opted_in` / `prior_relationship` contacts get drafted outreach by default; `cold` requires an explicit human decision per message.
- **Channels:** **email by default** (Gmail draft → you approve → you send). **Text only** with explicit per-contact permission.
- **Voice:** **defer — do not build synthetic/virtual voice outreach in v1.0.** Consent and comms-law complexity is high and the payoff is low for a personal tool; revisit only with explicit per-contact permission and a clear legal basis.
- **Frequency:** cap (e.g. max 1 contact / person / 30 days) enforced in the roster.
- **Audit:** every draft, decision, and send logged; nothing sent without your click.

### 5.4 Per-beat recency windows
**Recommendation:** **yes, per-beat** (Phase 0 via `beats.yaml`). Defaults: fast policy beats **3 days**; competitor/sector beats **14–30 days**; event/launch beats **short + high-frequency**. The global `MAX_AGE_DAYS` becomes the fallback when a beat doesn't set its own.

### 5.5 Data retention
**Recommendation:**
- **Editions + `history.jsonl`:** keep **indefinitely** (cheap; audit and timeline value).
- **Raw desk filings (`desk-*.json`):** **30 days** (debug only).
- **`watch.log`:** **90 days**, then rotate.
- **Contacts roster:** keep **until a DNC or erasure request**, then honour deletion promptly (privacy value).
- **Outreach log + rights/licence ledger:** keep **indefinitely** (audit/legal/fair-pay record).
- **Verification cache:** **90 days** (re-verify on demand).

### 5.6 Advertising / sponsorship
**Recommendation:** **exclude from v1.0.** Keep the **editorial–advertising separation boundary in the architecture** so it *can* be added cleanly later, but build nothing. If ever adopted: hard isolation (no read path to selection/significance) + mandatory disclosure + human commercial approval. For a personal intelligence tool, advertising adds governance surface with little upside now.

---

## 6. First concrete sprint (if you want to start tomorrow)

A tight, shippable slice that proves the generalised design end-to-end:

1. Rename to `newsroom-watch` + add `beats.yaml` (Phase 0).
2. Refactor `run_desk` → role runner emitting the `Filing` envelope (Phase 0).
3. Label editions `DRAFT — for human review` + fix undated handling (Phase 0/1).
4. Add the source-verification step (Phase 1).
5. Add the **news-hound** as the first envelope-based non-desk role (Phase 3b) — read-only, no gate, lowest risk, immediate value.

That sequence touches the spine (0/1), proves the envelope with a real second role (news-hound), and leaves you with a trustworthier, topic-agnostic watcher before any gate or store work begins.
