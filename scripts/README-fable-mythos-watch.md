# Newsroom Watch — Fable/Mythos Export Control + AI

A small launchd-driven "newsroom" that polls the web for significant news on a
few beats, dedupes against local state, and publishes **Morning**, **Afternoon**,
and **Final** editions (like a traditional newspaper) — each dropped into Google Drive with a macOS
notification. It also regenerates a self-contained **dashboard**
(`Newsroom Watch — Dashboard.html`) in the same Drive folder, showing each
beat, every edition, and the releases published. A rolling Obsidian digest of
everything seen is also kept.

Only items published within the last **3 days** are reported (configurable via
`MAX_AGE_DAYS`) — tuned for a three-edition day so editions stay fresh.

> For a non-technical, team-shareable overview of the approach, see
> [`docs/NEWSROOM-WATCH-EXECUTIVE-SUMMARY.md`](../docs/NEWSROOM-WATCH-EXECUTIVE-SUMMARY.md).

It is built for **minimal token use**. Several reporter **desks** run in
parallel, each as its own headless `claude` sub-agent on a small, cheap model
(`haiku` by default). A pure-`jq` **wire editor** then collates every filing —
no extra model call, so the editing stage costs zero tokens.

Beats currently staffed:

1. **Fable 5 / Mythos 5 export control** — the US export-control directive
   against Anthropic's Claude Fable 5 and Mythos 5 models, including news
   releases published by **Anthropic directly** (anthropic.com newsroom, blog,
   official statements).
2. **PwC Canada & competitors (AI)** — significant AI developments at PwC Canada
   and its main rivals (Deloitte / KPMG / EY Canada, Accenture, McKinsey, IBM).

Every item carries an `official` flag and a `high` / `medium` / `low`
significance rating. The editor drops anything below the significance floor,
dedupes by URL, and orders official and higher-significance items first.
Official releases are flagged `[Official]` in the digest and notification.

It uses your existing Claude Code authentication via the `claude` CLI in
headless mode — no API key required.

## Files

| File | Purpose |
|---|---|
| `fable-mythos-watch.sh` | The watcher. Runs the desks, edits, and publishes one cycle. |
| `com.persona-x.fable-mythos-watch.plist` | launchd agent that runs the script on a schedule. |

## How it works (newsroom)

```
 ┌──────────────┐   ┌──────────────┐      (parallel headless `claude` sub-agents,
 │  export desk │   │   PwC desk   │  ...   small model, tight turn/item caps)
 └──────┬───────┘   └──────┬───────┘
        │  JSON filings (tagged with beat, official, significance)
        └──────────┬───────┘
              ┌────▼────┐   pure jq, no model:
              │ editor  │   collate → drop below floor → dedupe → order → cap
              └────┬────┘
        ┌──────────┴───────────┐
   Obsidian note          macOS notification
```

Add a desk by writing a new `*_PROMPT` and adding one `run_desk` line in the
`NEWSROOM` block. The shared `JSON_CONTRACT` keeps every desk's output format
identical, so the editor needs no changes.

## Requirements

- macOS (uses `osascript` for notifications and `launchd` for scheduling)
- [`jq`](https://jqlang.github.io/jq/) on your `PATH`
- The `claude` CLI, authenticated (`claude` runs without prompting for login)

## Setup

1. **Edit the paths at the top of `fable-mythos-watch.sh`:**
   - `OBSIDIAN_NOTE` — where the rolling digest should live in your vault.
   - `GDRIVE_DIR` — your Google Drive folder for editions. With Google Drive for
     Desktop installed, find it under `~/Library/CloudStorage/` (e.g.
     `~/Library/CloudStorage/GoogleDrive-you@gmail.com/My Drive/Newsroom Watch`).
   - `CLAUDE_BIN` — the absolute path to your `claude` binary (`which claude`).

2. **Make the script executable:**

   ```bash
   chmod +x scripts/fable-mythos-watch.sh
   ```

3. **Test it once by hand** before scheduling:

   ```bash
   ./scripts/fable-mythos-watch.sh
   tail -n 20 ~/.fable-mythos-watch/watch.log
   ```

4. **Install the launchd agent:**
   - Edit `com.persona-x.fable-mythos-watch.plist` and replace the
     `ProgramArguments` script path with the absolute path on your machine
     (launchd does not expand `~`).
   - Confirm the `PATH` in `EnvironmentVariables` includes the directories
     holding `jq` and `claude` (`which jq claude`).
   - Copy it into your LaunchAgents directory and load it:

     ```bash
     cp scripts/com.persona-x.fable-mythos-watch.plist ~/Library/LaunchAgents/
     launchctl load ~/Library/LaunchAgents/com.persona-x.fable-mythos-watch.plist
     ```

   To stop it:

   ```bash
   launchctl unload ~/Library/LaunchAgents/com.persona-x.fable-mythos-watch.plist
   ```

## State and logs

The script keeps everything under `~/.fable-mythos-watch/`:

- `seen.json` — URLs already reported, so you are not notified twice.
- `desk-*.json` — the latest raw filing from each desk (handy for debugging).
- `history.jsonl` — one record per run (beats, counts, published items); the
  dashboard is built from this.
- `watch.log` — timestamped run log, including per-desk item counts.

launchd's own stdout/stderr land in `/tmp/fable-mythos-watch.{out,err}.log`.

## Tuning

All of these are environment variables with sensible defaults — set them in the
plist's `EnvironmentVariables` or inline when testing.

- **Editions / schedule:** the plist fires at 07:00 (Morning), 13:00 (Afternoon),
  and 19:00 (Final) via `StartCalendarInterval`; the script names the edition from
  the clock (before noon = Morning, noon–18:00 = Afternoon, 18:00+ = Final).
  Change the hours in the plist to retime them.
- **Quiet days:** `PUBLISH_EMPTY` (default `true`) publishes an edition even with
  no new items; set `false` to stay silent on a slow news cycle.
- **Model / token cost:** `REPORTER_MODEL` (default `sonnet` for well-grounded,
  cited results). Drop to `haiku` for lower cost if you accept a higher
  hallucination risk. The editor is always pure jq.
- **Recency window:** `MAX_AGE_DAYS` (default `3`) drops anything published more
  than this many days ago. The desks are told the window and the editor enforces
  it from each item's `published` (ISO `YYYY-MM-DD`) date.
- **Per-desk caps:** `DESK_MAX_TURNS` (default `8`) and `DESK_MAX_ITEMS`
  (default `6`) bound each desk's work.
- **Significance floor:** `SIGNIFICANCE_FLOOR` (default `medium`) drops anything
  rated below it — set `low` to keep everything, `high` for headlines only.
- **Total cap:** `MAX_ITEMS` (default `10`) caps items per run after collation.
- **Beats / focus:** edit the `*_PROMPT` strings, or add a desk (see *How it
  works*).
- **Reset history:** delete `~/.fable-mythos-watch/seen.json` to be re-notified
  about everything on the next run.
