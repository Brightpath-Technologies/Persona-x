# Fable 5 / Mythos 5 Export Control Watch

A small launchd-driven watcher that polls the web for new developments on the
US export control directive affecting Anthropic's Claude Fable 5 and Mythos 5
models, dedupes against local state, appends fresh items to an Obsidian note,
and fires a macOS notification.

It uses your existing Claude Code authentication via the `claude` CLI in
headless mode — no API key required.

## Files

| File | Purpose |
|---|---|
| `fable-mythos-watch.sh` | The watcher itself. Runs one polling cycle. |
| `com.persona-x.fable-mythos-watch.plist` | launchd agent that runs the script on a schedule. |

## Requirements

- macOS (uses `osascript` for notifications and `launchd` for scheduling)
- [`jq`](https://jqlang.github.io/jq/) on your `PATH`
- The `claude` CLI, authenticated (`claude` runs without prompting for login)

## Setup

1. **Edit the two paths at the top of `fable-mythos-watch.sh`:**
   - `OBSIDIAN_NOTE` — where the running digest should live in your vault.
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
- `watch.log` — timestamped run log.

launchd's own stdout/stderr land in `/tmp/fable-mythos-watch.{out,err}.log`.

## Tuning

- **Frequency:** change `StartInterval` in the plist (seconds). Default is
  `14400` (every 4 hours).
- **Result count / focus:** edit the `PROMPT` in the script.
- **Reset history:** delete `~/.fable-mythos-watch/seen.json` to be re-notified
  about everything on the next run.
