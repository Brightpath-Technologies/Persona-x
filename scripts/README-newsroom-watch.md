# Newsroom Watch — watcher script

A small launchd-driven "newsroom" that polls the web for significant news on a
few **beats** (defined in `beats.json`), dedupes against local state, and
publishes **Morning**, **Afternoon**, and **Final** editions (like a traditional
newspaper) — each dropped into Google Drive **as a draft for human review**,
with a macOS notification. It also regenerates a self-contained **dashboard**
(`Newsroom Watch — Dashboard.html`) in the same Drive folder, showing each beat,
every edition, and the releases published. A rolling Obsidian digest of
everything seen is also kept.

> **Editions are drafts, not publications.** Every edition is written with a
> `DRAFT — for human review` banner. Nothing reaches an audience until a human
> assembles, edits, and signs off — see
> [`docs/NEWSROOM-WATCH-PERSONA-CONTRACTS.md`](../docs/NEWSROOM-WATCH-PERSONA-CONTRACTS.md) §1.3 (C2).

Each beat has its own **recency window** and **significance floor** (with global
fallbacks), so a fast policy beat (3 days) and a slower competitor beat (14 days)
can coexist.

> For a non-technical, team-shareable overview of the approach, see
> [`docs/NEWSROOM-WATCH-EXECUTIVE-SUMMARY.md`](../docs/NEWSROOM-WATCH-EXECUTIVE-SUMMARY.md).

It is built for **bounded token use**. Several reporter **desks** run in
parallel, each as its own headless `claude` sub-agent (default model `sonnet`
for well-grounded, cited results; `haiku` available for lower cost), with tight
turn/item caps. A pure-`jq` **wire editor** then collates every filing — no extra
model call, so the editing stage costs zero tokens.

Beats currently staffed (in `beats.json`):

1. **Fable 5 / Mythos 5 export control** — the US export-control directive
   against Anthropic's Claude Fable 5 and Mythos 5 models, including news
   releases published by **Anthropic directly** (anthropic.com newsroom, blog,
   official statements). Window: 3 days.
2. **PwC Canada & competitors (AI)** — significant AI developments at PwC Canada
   and its main rivals (Deloitte / KPMG / EY Canada, Accenture, McKinsey, IBM).
   Window: 14 days.

Every item carries an `official` flag and a `high` / `medium` / `low`
significance rating. The editor drops anything below the (per-beat) significance
floor, drops anything outside the (per-beat) recency window, dedupes by URL, and
orders official and higher-significance items first. Items with no parseable
publication date are **kept but flagged** (`undated`) and ordered last.
Official releases are flagged `[Official]` in the digest and notification.

It uses your existing Claude Code authentication via the `claude` CLI in
headless mode — no API key required.

## Files

| File | Purpose |
|---|---|
| `newsroom-watch.sh` | The watcher. Runs the desks, edits, and publishes one cycle. |
| `beats.json` | The beats, as config (id, name, per-beat window/floor, prompt). Edit this to add/retune beats — no code change. |
| `com.brightpath.newsroom-watch.plist` | launchd agent that runs the script on a schedule. |

## How it works (newsroom)

```
  beats.json ──► (one desk per beat, parallel headless `claude` sub-agents,
                  default sonnet, tight turn/item caps, per-beat recency window)
        │
        │  JSON filings (tagged with beat, official, significance)
        └──────────┬───────────────┐
              ┌────▼────┐   pure jq, no model:
              │ editor  │   collate → drop seen → per-beat floor → per-beat
              └────┬────┘   recency → dedupe → order (official, undated-last) → cap
        ┌──────────┼───────────────┬───────────────┐
   Drive (DRAFT)   Dashboard.html  Obsidian note    macOS notification
```

Add a beat by adding an object to `beats.json` (`id`, `name`, optional
`max_age_days`, optional `significance_floor`, `prompt`). The shared
anti-fabrication JSON contract is appended to every prompt automatically, so the
editor and dashboard need no changes.

## Requirements

- macOS (uses `osascript` for notifications and `launchd` for scheduling)
- [`jq`](https://jqlang.github.io/jq/) on your `PATH` (also parses `beats.json`)
- The `claude` CLI, authenticated (`claude` runs without prompting for login)

## Setup

1. **Edit the paths at the top of `newsroom-watch.sh`:**
   - `OBSIDIAN_NOTE` — where the rolling digest should live in your vault.
   - `GDRIVE_DIR` — your Google Drive folder for editions. With Google Drive for
     Desktop installed, find it under `~/Library/CloudStorage/` (e.g.
     `~/Library/CloudStorage/GoogleDrive-you@gmail.com/My Drive/Newsroom Watch`).
   - `CLAUDE_BIN` — the absolute path to your `claude` binary (`which claude`).

2. **Edit `beats.json`** to set your beats (or point `BEATS_FILE` at another file).

3. **Make the script executable:**

   ```bash
   chmod +x scripts/newsroom-watch.sh
   ```

4. **Test it once by hand** before scheduling:

   ```bash
   ./scripts/newsroom-watch.sh
   tail -n 20 ~/.newsroom-watch/watch.log
   ```

5. **Install the launchd agent:**
   - Edit `com.brightpath.newsroom-watch.plist` and replace the
     `ProgramArguments` script path with the absolute path on your machine
     (launchd does not expand `~`).
   - Confirm the `PATH` in `EnvironmentVariables` includes the directories
     holding `jq` and `claude` (`which jq claude`).
   - Copy it into your LaunchAgents directory and load it:

     ```bash
     cp scripts/com.brightpath.newsroom-watch.plist ~/Library/LaunchAgents/
     launchctl load ~/Library/LaunchAgents/com.brightpath.newsroom-watch.plist
     ```

   To stop it:

   ```bash
   launchctl unload ~/Library/LaunchAgents/com.brightpath.newsroom-watch.plist
   ```

## Migrating from `fable-mythos-watch`

This script was previously named `fable-mythos-watch`. If you ran the old
version, carry its de-dup memory and run history forward so you are not
re-notified about everything:

```bash
mv ~/.fable-mythos-watch ~/.newsroom-watch
launchctl unload ~/Library/LaunchAgents/com.persona-x.fable-mythos-watch.plist 2>/dev/null
rm -f ~/Library/LaunchAgents/com.persona-x.fable-mythos-watch.plist
```

Then install the new plist as above.

## State and logs

The script keeps everything under `~/.newsroom-watch/`:

- `seen.json` — URLs already reported, so you are not notified twice.
- `desk-*.json` — the latest raw filing from each desk (handy for debugging).
- `history.jsonl` — one record per run (beats, counts, published items); the
  dashboard is built from this.
- `watch.log` — timestamped run log, including per-desk item counts.

launchd's own stdout/stderr land in `/tmp/newsroom-watch.{out,err}.log`.

## Tuning

Editions are configured per beat in `beats.json`; the rest are environment
variables with sensible defaults — set them in the plist's `EnvironmentVariables`
or inline when testing.

- **Beats / focus / per-beat dials:** edit `beats.json` — each beat takes a
  `prompt`, an optional `max_age_days` (its own recency window), and an optional
  `significance_floor` (`low`/`medium`/`high`). Both fall back to the globals.
- **Editions / schedule:** the plist fires at 07:00 (Morning), 13:00 (Afternoon),
  and 19:00 (Final) via `StartCalendarInterval`; the script names the edition from
  the clock (before noon = Morning, noon–18:00 = Afternoon, 18:00+ = Final).
  Change the hours in the plist to retime them.
- **Quiet days:** `PUBLISH_EMPTY` (default `true`) publishes a draft edition even
  with no new items; set `false` to stay silent on a slow news cycle.
- **Model / token cost:** `REPORTER_MODEL` (default `sonnet` for well-grounded,
  cited results). Drop to `haiku` for lower cost if you accept a higher
  hallucination risk. The editor is always pure jq.
- **Global recency window:** `MAX_AGE_DAYS` (default `3`) is the fallback when a
  beat does not set its own `max_age_days`.
- **Per-desk caps:** `DESK_MAX_TURNS` (default `12`) and `DESK_MAX_ITEMS`
  (default `6`) bound each desk's work.
- **Global significance floor:** `SIGNIFICANCE_FLOOR` (default `medium`) is the
  fallback when a beat does not set its own `significance_floor`.
- **Total cap:** `MAX_ITEMS` (default `12`) caps items per run after collation.
- **Reset history:** delete `~/.newsroom-watch/seen.json` to be re-notified about
  everything on the next run.
