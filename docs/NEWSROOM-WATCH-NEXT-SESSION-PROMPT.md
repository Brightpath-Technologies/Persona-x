# Newsroom Watch — Kickoff Prompt for a New Design Session

*Paste the block below into a new Opus session. It is self-contained but points
at the canonical docs in this repo and in Google Drive.*

---

You are my design partner for a project called **Newsroom Watch** — "a newsroom
in your pocket." I've built a working prototype and a set of design, pitch, and
use-case documents across several fast sessions. Your job in this session is to
**pull everything together into one coherent design and a prioritised plan**,
and to **specify the detailed inputs and outputs of every "persona"** (each
sub-agent / specialist role).

## What Newsroom Watch is

A small, low-cost service that watches the topics I choose ("beats"), curates
only what's significant (with sources), and delivers Morning/Afternoon/Final editions plus
a live dashboard — **assembled and signed off by a human, never auto-published.**
It is modelled on an old newsroom: independent reporter "desks" gather news; a
deterministic editor curates; a human writes the final word.

## What already exists — read these first

GitHub repo **Brightpath-Technologies/Persona-x**, branch
`claude/fable-mythos-watch-script-jrp8ft` (this branch is the canonical, latest
source):
- `scripts/fable-mythos-watch.sh` — the working watcher (parallel headless
  Claude Code "desks" + a pure-jq "wire editor"; publishes editions + an HTML
  dashboard; keeps run history).
- `scripts/com.persona-x.fable-mythos-watch.plist` — launchd schedule (three
  times daily: Morning, Afternoon, Final).
- `scripts/README-fable-mythos-watch.md` — setup & config.
- `docs/NEWSROOM-WATCH-EXECUTIVE-SUMMARY.md`
- `docs/NEWSROOM-WATCH-BRD.md`
- `docs/NEWSROOM-WATCH-ARCHITECTURE.md`
- `docs/NEWSROOM-WATCH-ROADMAP.md`
- `docs/NEWSROOM-WATCH-USE-CASES.md`
- `docs/NEWSROOM-WATCH-PITCH-SCRIPTS.md` and
  `docs/NEWSROOM-WATCH-SOCIAL-CUTDOWNS.md` (pitch material)

Also in Google Drive: a **"Newsroom Watch"** folder (live editions + dashboard)
and a **"Design Docs"** subfolder (copies of the docs above; the repo is newer —
docs are at v0.3 in the repo, some Drive copies are v0.2).

If you can read the repo, start there. If you can't, ask me to paste the specific
docs you need.

## Core concept — keep this fixed so we don't drift

- **Pipeline:** reporter desks (one per beat) → deterministic jq "wire editor"
  (de-dupe by URL, recency window, significance floor, order official + high
  first, cap) → **human review gate** → publish (Markdown editions + HTML
  dashboard to Drive; rolling local digest; notification).
- **Role roster (current + planned)** — see the list to specify below.
- **Governing values ("Human AND" — an intentionally open tagline):** human
  authorship and review, **no autonomous publication**; fair pay and credit for
  creators; consent and privacy; sourcing integrity (no fabrication, cite real
  sources, verify); editorial independence from advertising; accessibility and
  inclusion; transparency and auditability; lawfulness; and a future layer of
  **Anthropic Fable managed agents performing second-line QA on agent behaviour**
  so a non-technical human can trust the pipeline (oversight, never authorship).
- **Use cases beyond the two live beats** (AI export-control story; PwC Canada &
  competitors): charity campaign intelligence, real-estate market research, plus
  B2B competitive intel, GRC/policy watch, community storytelling, investor watch.
  Treat regulated domains as **research/curation, not advice.**

## What I want from this session (deliverables)

1. **Consolidated design** — one synthesis that reconciles all the docs; flag and
   resolve inconsistencies; restate the architecture and the full role roster
   cleanly in one place.
2. **Persona input/output contracts** — for EACH role below, a precise spec using
   the template that follows.
3. **Data & interfaces** — the shared news-item schema; the contracts/hand-offs
   between roles; the human review and approval gates; and the data stores the
   roster implies (e.g. a human-source **contacts roster**, a **rights/licence
   ledger**, the **run history**).
4. **Prioritised next steps / build plan** — an ordered path from today's
   prototype to a v1.0: quick wins vs bigger bets, and what each step unlocks.
5. **Open decisions for me** — choices that need my input (hosting; delivery
   channels; sourcing-outreach consent/approval policy and any voice channel;
   per-beat recency windows; data retention; whether to include advertising),
   each with your recommendation.

### Roles ("personas") to specify

1. **Reporter desk** (per beat) — live
2. **Wire editor** (deterministic, non-LLM) — live
3. **Research specialist** (by domain: architecture, cybersecurity, entertainment,
   … — authoritative sources: papers, libraries, standards bodies, primary docs)
4. **Sourcing specialist** (maintains a live human-source roster; drafts outreach
   via email/text/permitted virtual voice — drafts for human approval)
5. **News-hound** (proactively finds rising stories; momentum scoring)
6. **Media-contributor specialist** (human photographers/illustrators as paid
   contributors)
7. **Rights & licensing ("deals")** (negotiates fair, real payment for media/art;
   drafts licences; human authorises)
8. **Editor-in-chief ("J.J. Jameson")** (standards, angle, significance bar; under
   human authority)
9. **Legal clerk** (clearance, permissions, attribution, fair-use/defamation
   flags; clerk, not counsel; escalates to humans)
10. **Advertising / sponsorship** (conditional; strict editorial–advertising
    separation; disclosure)
11. **Translation & localisation**
12. **Accessibility**
13. **Second-line QA** (future Anthropic Fable managed agents auditing agent
    behaviour)
14. **The human creative** (not an agent — define what they receive, review,
    edit, approve, and publish; they are the authority and the publish gate)

### Per-persona spec template (fill in for every role above)

- **Role & one-line mandate**
- **Domain / specialisation**
- **Trigger** — when and how it runs (scheduled, on-demand, event-driven)
- **Inputs** — config (beat/prompt, dials), context, upstream artefacts, query
  params, source allow/deny lists, prior state it reads
- **Sources / channels** it may use
- **Process** — what it does and the key decisions it makes
- **Outputs** — the exact structured schema it returns (fields + types + format)
  with a short example; for non-LLM roles, the deterministic transform
- **Quality bar / significance criteria**
- **Guardrails & values enforced** — citations, consent, fair pay, approval gates,
  ad–editorial separation, accessibility, etc.
- **Hand-offs** — who/what consumes the output (downstream role or the human)
- **Tools / permissions / data stores** it needs
- **Failure modes & fallback**

## Constraints & principles to honour

- **Human-in-the-loop is non-negotiable** — nothing auto-publishes; outreach,
  deals, and payments are drafted for human approval.
- Keep curation **cheap and deterministic** where possible (the editor uses no
  model).
- New roles **inherit the shared values** without re-litigating them.
- Distinguish **research/curation from advice** for regulated domains
  (property, finance, legal).

## Optional tie-in to consider

This lives in the **Persona-x** repo — a framework for structured *persona
definition files* (purpose, panel role, a six-dimension judgement rubric,
boundaries). Recommend whether each Newsroom Watch role should ALSO be expressed
as a Persona-x persona definition, and if so, sketch how — or explain why the
functional I/O contract is the better fit.

## How to work

- Read the existing docs first (or ask me to paste them).
- Ask me up to ~5 high-value clarifying questions before going deep, then
  proceed.
- Where you must assume, state the assumption and keep moving.
- Produce clean markdown I can drop back into the repo as a new design document
  (e.g. `docs/NEWSROOM-WATCH-PERSONA-CONTRACTS.md` and an updated build plan).
