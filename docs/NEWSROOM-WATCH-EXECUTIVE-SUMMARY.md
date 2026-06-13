# Newsroom Watch — Executive Summary

*A lightweight, low-cost intelligence service that publishes a twice-daily
briefing on the topics we care about.*

## What it is

Newsroom Watch is a small automation that monitors the web for **significant**
developments on a defined set of topics ("beats"), curates them, and publishes a
**Morning** and **Afternoon** edition — each delivered to Google Drive with a
desktop notification. It runs unattended on a single machine and reuses existing
Claude Code access, so there is no new vendor, API key, or per-seat licence to
procure.

Think of it as a private wire service: instead of everyone scanning the news, a
small team of automated "reporters" does the first pass and an "editor" hands us
a short, ranked briefing twice a day.

## Why this approach

The design borrows the structure of an old-fashioned newsroom, deliberately:

- **Reporters (desks).** Each beat is covered by its own focused agent that
  searches the web and files a structured story list. Adding a topic is as
  simple as hiring a new desk — it does not make the existing ones slower or
  more expensive.
- **A wire editor.** A single, deterministic step collates every desk's filing:
  it removes anything already reported, drops items below a significance
  threshold, removes duplicates, and ranks what remains (official announcements
  and high-impact items first).
- **Editions, not a firehose.** Output is batched into two scheduled editions a
  day rather than a constant stream of alerts — enough to stay current, not
  enough to create noise.

This separation is what keeps the service both **useful** (consistent
judgement about what matters) and **cheap** (see below).

## What it costs (token discipline)

Cost is controlled by design, not by luck:

- The reporters run on a **small, inexpensive model** by default.
- Each desk has **strict limits** on how long it can work and how much it can
  return.
- The **editor uses no AI at all** — the comparison, de-duplication, and ranking
  are handled by plain data processing, so the most logic-heavy stage is
  effectively free.

The net effect: adding another beat adds one more small, bounded task — not a
larger, more expensive job. Spend scales gently and predictably.

## What we get, twice a day

Each edition is a short Markdown briefing, grouped by beat. Every item carries:

- a one- or two-line plain-language summary,
- a link to the source,
- a **significance rating** (high / medium / low), and
- a flag when it is an **official release** from the organisation involved.

Editions land in a shared Google Drive folder (easy to forward or attach to a
stand-up), and a desktop notification announces each one. A running log of
everything seen is also kept for reference.

## Beats currently covered

1. **Export-control story** — developments in the US export-control action
   affecting specific frontier AI models, including official company responses
   and any policy, legal, or oversight movement.
2. **PwC Canada & competitors (AI)** — material AI developments at PwC Canada and
   its main rivals (the other Big Four firms in Canada, plus the major
   consulting and AI players), filtered to genuinely significant moves rather
   than routine marketing.

New beats can be added in minutes without redesigning anything.

## Governance and limits (worth knowing)

- **Significance is a judgement call.** The reporters are instructed on what
  counts as "significant," but borderline items may occasionally be included or
  missed. The threshold is a dial we can tighten or loosen.
- **Sources are public web coverage.** It surfaces and summarises reporting; it
  is not a substitute for primary-source verification before any decision or
  external use.
- **Single point of operation.** It currently runs on one machine on a schedule.
  For team-wide reliability we would host it centrally — a straightforward next
  step.

## Human at the helm

This is a **newsroom in your pocket — not a printing press that runs itself.**
The agents do the legwork (research, sourcing, monitoring, collation); a human
writer always assembles the result and delivers the message. Nothing is
published to an audience unreviewed.

The point is to **elevate the human creative while removing the mundane**: the
person spends their time on judgement, narrative, and message — not on scanning
sources. Because a human always reviews the agents' work and signs off the final
piece, quality and integrity are preserved by design.

Where this is heading: a roster of **specialist agents** (deep-research
specialists drawing on research papers and libraries; sourcing specialists that
keep a live list of human experts and draft outreach for approval; "news-hound"
agents that spot rising stories before they peak), and — so the human creative
need not be technical — a future layer of **Anthropic Fable managed agents that
quality-check the other agents' behaviour**. The pipeline automates *oversight*,
never *authorship*.

## In one line

A private, twice-daily wire service for our key AI topics — newsroom-quality
curation, deliberately engineered to run at minimal cost and **always assembled
by a human creative** — delivered straight to Google Drive.
