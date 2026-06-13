#!/bin/bash
#
# fable-mythos-watch.sh
# Polls for new developments on the Anthropic Fable 5 / Mythos 5 US export
# control story, dedupes against a local state file, appends new items to an
# Obsidian note, and fires a macOS notification summarizing what is new.
#
# Designed to run unattended via launchd (see com.persona-x.fable-mythos-watch.plist).
# Uses your existing Claude Code authentication. No API key needed.

set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIG. Edit these two paths to match your machine.
# ---------------------------------------------------------------------------

# Where the running digest lives. Point this at your vault. Your 00-99 scheme
# suggests something like an inbox or current-events folder.
OBSIDIAN_NOTE="${HOME}/Obsidian/MainVault/00-Inbox/fable-mythos-watch.md"

# Full path to the claude binary. Find yours with: which claude
# launchd does not inherit your shell PATH, so hardcode it.
CLAUDE_BIN="${HOME}/.local/bin/claude"

# ---------------------------------------------------------------------------
# Internal state. You should not need to touch anything below.
# ---------------------------------------------------------------------------

STATE_DIR="${HOME}/.fable-mythos-watch"
SEEN_FILE="${STATE_DIR}/seen.json"
LOG_FILE="${STATE_DIR}/watch.log"

mkdir -p "${STATE_DIR}"
mkdir -p "$(dirname "${OBSIDIAN_NOTE}")"
[ -f "${SEEN_FILE}" ] || echo "[]" > "${SEEN_FILE}"
[ -f "${OBSIDIAN_NOTE}" ] || printf '# Fable 5 / Mythos 5 Export Control Watch\n\nAutomated digest. New items appended below.\n' > "${OBSIDIAN_NOTE}"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S')  $*" >> "${LOG_FILE}"; }

log "run started"

# Pass the already-seen URLs to the model so it can skip them, and so the
# prompt stays focused on genuinely new coverage.
SEEN_URLS="$(jq -r '.[]' "${SEEN_FILE}" | tr '\n' ' ')"

PROMPT="Search the web for the most recent developments, as of right now, on \
the US government export control directive against Anthropic's Claude Fable 5 \
and Claude Mythos 5 models (the suspension that began June 12 2026). I want \
substantive updates only: official statements, government action, reinstatement \
news, legal or policy analysis, congressional response. Skip rehashes of the \
initial shutdown.

Return ONLY a raw JSON array and nothing else. No prose, no markdown, no code \
fences. Each element must be an object with exactly these keys: title, url, \
source, summary, published. summary is one or two plain sentences. published \
is an approximate date string. Return at most 8 items, newest first. If you \
find nothing new, return []."

# Run Claude Code headless. WebSearch is allowed so it can run unattended.
# --output-format json gives us a parseable envelope.
RAW_JSON="$(
  "${CLAUDE_BIN}" -p "${PROMPT}" \
    --allowedTools "WebSearch" \
    --max-turns 20 \
    --output-format json 2>>"${LOG_FILE}"
)" || { log "claude invocation failed"; exit 1; }

# Pull Claude's text answer out of the result envelope, then strip any stray
# code fences just in case.
ITEMS="$(echo "${RAW_JSON}" | jq -r '.result' | sed 's/^```json//; s/^```//; s/```$//')"

# Validate it is real JSON before going further.
if ! echo "${ITEMS}" | jq empty >/dev/null 2>&1; then
  log "model did not return valid JSON, skipping this run"
  exit 0
fi

# Walk the items, keep only ones whose URL is not already in seen.json.
NEW_ITEMS="$(jq -n --argjson found "${ITEMS}" --slurpfile seen "${SEEN_FILE}" \
  '$found - [ $found[] | select(.url as $u | $seen[0] | index($u)) ]')"

NEW_COUNT="$(echo "${NEW_ITEMS}" | jq 'length')"

if [ "${NEW_COUNT}" -eq 0 ]; then
  log "no new items"
  exit 0
fi

log "${NEW_COUNT} new item(s)"

# Append a dated block to the Obsidian note.
STAMP="$(date '+%Y-%m-%d %H:%M')"
{
  echo ""
  echo "## ${STAMP}"
  echo "${NEW_ITEMS}" | jq -r '.[] |
    "\n### \(.title)\n- Source: \(.source)\n- Published: \(.published)\n- \(.url)\n\n\(.summary)"'
} >> "${OBSIDIAN_NOTE}"

# Record the new URLs as seen.
jq -s '.[0] + (.[1] | map(.url)) | unique' "${SEEN_FILE}" <(echo "${NEW_ITEMS}") > "${SEEN_FILE}.tmp"
mv "${SEEN_FILE}.tmp" "${SEEN_FILE}"

# Fire one macOS notification summarizing the run.
FIRST_TITLE="$(echo "${NEW_ITEMS}" | jq -r '.[0].title')"
if [ "${NEW_COUNT}" -eq 1 ]; then
  NOTE_BODY="${FIRST_TITLE}"
else
  NOTE_BODY="${NEW_COUNT} new items. Latest: ${FIRST_TITLE}"
fi

# Escape double quotes for AppleScript.
NOTE_BODY_ESCAPED="$(echo "${NOTE_BODY}" | sed 's/"/\\"/g')"
osascript -e "display notification \"${NOTE_BODY_ESCAPED}\" with title \"Fable/Mythos Watch\" sound name \"Submarine\""

log "run complete, notified"
