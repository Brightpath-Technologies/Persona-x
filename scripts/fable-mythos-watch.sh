#!/bin/bash
#
# fable-mythos-watch.sh
# A minimal-token "newsroom" watcher that publishes twice-daily editions.
#
# Several reporter "desks" run in parallel, each as its own headless Claude Code
# process (a separate sub-agent context) on a small, cheap model. A pure-jq
# "wire editor" then collates every desk's filing: it dedupes against local
# state, drops anything below a significance floor, and orders official releases
# and higher-significance items first.
#
# Each run publishes an EDITION (Morning or Afternoon, derived from the clock):
#   - a Markdown paper dropped into your Google Drive folder, and
#   - a macOS notification.
# It also keeps a rolling Obsidian digest of everything seen.
#
# Desks currently staffed:
#   1. Fable 5 / Mythos 5 US export-control story (incl. direct Anthropic releases)
#   2. PwC Canada and its competitors — significant AI developments only
#
# Add a desk: write a *_PROMPT and add one run_desk line in the NEWSROOM block.
#
# Designed to run twice daily via launchd (see com.persona-x.fable-mythos-watch.plist).
# Uses your existing Claude Code authentication. No API key needed.

set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIG. Edit these paths to match your machine.
# ---------------------------------------------------------------------------

# Rolling digest in your Obsidian vault (everything seen, appended over time).
OBSIDIAN_NOTE="${HOME}/Obsidian/MainVault/00-Inbox/fable-mythos-watch.md"

# Google Drive folder for the published editions. With Google Drive for Desktop
# installed, files written here sync automatically. Set this to your account's
# path (find it under ~/Library/CloudStorage/).
GDRIVE_DIR="${GDRIVE_DIR:-${HOME}/Library/CloudStorage/GoogleDrive-your.account@gmail.com/My Drive/Newsroom Watch}"

# Full path to the claude binary. Find yours with: which claude
# launchd does not inherit your shell PATH, so hardcode it.
CLAUDE_BIN="${HOME}/.local/bin/claude"

# ---------------------------------------------------------------------------
# Token budget. The desks do the only model work; the editor is pure jq.
# ---------------------------------------------------------------------------

# Small model for the reporter desks — minimal token cost. Override if needed
# (e.g. REPORTER_MODEL=sonnet for sharper judgement at higher cost).
REPORTER_MODEL="${REPORTER_MODEL:-haiku}"

# Per-desk caps, kept low on purpose.
DESK_MAX_TURNS="${DESK_MAX_TURNS:-8}"
DESK_MAX_ITEMS="${DESK_MAX_ITEMS:-6}"

# Editor (pure jq) settings.
MAX_ITEMS="${MAX_ITEMS:-10}"                          # cap after collation
SIGNIFICANCE_FLOOR="${SIGNIFICANCE_FLOOR:-medium}"    # drop below this: low|medium|high

# Publish an edition even on a quiet news cycle (true), or stay silent (false).
PUBLISH_EMPTY="${PUBLISH_EMPTY:-true}"

# ---------------------------------------------------------------------------
# Internal state. You should not need to touch anything below.
# ---------------------------------------------------------------------------

STATE_DIR="${HOME}/.fable-mythos-watch"
SEEN_FILE="${STATE_DIR}/seen.json"
LOG_FILE="${STATE_DIR}/watch.log"

mkdir -p "${STATE_DIR}"
mkdir -p "$(dirname "${OBSIDIAN_NOTE}")"
[ -f "${SEEN_FILE}" ] || echo "[]" > "${SEEN_FILE}"
[ -f "${OBSIDIAN_NOTE}" ] || printf '# Newsroom Watch — rolling digest\n\nAutomated. New items appended below; formal editions go to Google Drive.\n' > "${OBSIDIAN_NOTE}"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S')  $*" >> "${LOG_FILE}"; }

# Which edition is this? Derived from the clock unless EDITION is set.
DATE="$(date '+%Y-%m-%d')"
DATE_LONG="$(date '+%A, %d %B %Y')"
if [ -z "${EDITION:-}" ]; then
  if [ "$((10#$(date '+%H')))" -lt 12 ]; then EDITION="Morning"; else EDITION="Afternoon"; fi
fi

log "run started (${EDITION} edition, model=${REPORTER_MODEL}, floor=${SIGNIFICANCE_FLOOR})"

# Shared output contract, kept DRY across desks.
JSON_CONTRACT="Return ONLY a raw JSON array and nothing else. No prose, no \
markdown, no code fences. Each element must be an object with exactly these \
keys: title, url, source, summary, published, official, significance. summary \
is one or two plain sentences. published is an approximate date string. \
official is a boolean, true only when the item is a release published by the \
organisation the story is about. significance is one of \"high\", \"medium\", \
or \"low\". Return at most ${DESK_MAX_ITEMS} items, newest first; list official \
releases and higher-significance items first. If you find nothing that clears \
the bar, return []."

# --- Desk 1: Fable 5 / Mythos 5 export control -----------------------------
EXPORT_PROMPT="Search the web for the most recent developments, as of right \
now, on the US government export control directive against Anthropic's Claude \
Fable 5 and Claude Mythos 5 models (the suspension that began June 12 2026). \
Substantive updates only: official statements, government action, reinstatement \
news, legal or policy analysis, congressional response, and any legal, \
oversight, or investigative developments. Skip rehashes of the initial \
shutdown. Pay special attention to news releases published by Anthropic \
directly (anthropic.com/news, the Anthropic newsroom or blog). Rate \
significance relative to routine releases: 'high' if it materially changes the \
export-control situation or is an official Anthropic response, 'medium' if it \
adds notable new information, 'low' if routine. ${JSON_CONTRACT}"

# --- Desk 2: PwC Canada and competitors (AI) -------------------------------
PWC_PROMPT="Search the web for the most recent, significant AI developments \
involving PwC Canada and its main competitors: the other Big Four firms in \
Canada (Deloitte Canada, KPMG Canada, EY Canada) and major consulting/AI \
rivals (Accenture, McKinsey/QuantumBlack, IBM Consulting). Focus on material AI \
developments: new AI products or platforms, major partnerships, AI \
assurance/governance or regulatory offerings, significant acquisitions or \
hires, and firm responses to AI policy and export-control developments. Only \
include items that are significant in terms of AI developments; skip routine \
marketing, minor blog posts, and generic thought-leadership. Treat an item as \
official when it is a release published by the firm itself. Rate significance: \
'high' for a material AI development that changes a firm's AI capabilities or \
market position, 'medium' for notable news, 'low' for routine. ${JSON_CONTRACT}"

# ---------------------------------------------------------------------------
# A reporter desk: run one headless Claude Code sub-agent, validate its filing,
# tag it with its beat, and write a JSON array to the given file. Never aborts
# the run — a failed or malformed desk just files an empty array.
# ---------------------------------------------------------------------------
run_desk() {
  local beat="$1" prompt="$2" out="$3"
  local raw items
  raw="$(
    "${CLAUDE_BIN}" -p "${prompt}" \
      --model "${REPORTER_MODEL}" \
      --allowedTools "WebSearch" \
      --max-turns "${DESK_MAX_TURNS}" \
      --output-format json 2>>"${LOG_FILE}"
  )" || { log "desk '${beat}' invocation failed"; echo "[]" > "${out}"; return 0; }

  items="$(echo "${raw}" | jq -r '.result' | sed 's/^```json//; s/^```//; s/```$//')"
  if ! echo "${items}" | jq empty >/dev/null 2>&1; then
    log "desk '${beat}' returned invalid JSON, treating as empty"
    echo "[]" > "${out}"
    return 0
  fi

  echo "${items}" | jq --arg beat "${beat}" '[ .[] | . + {beat: $beat} ]' > "${out}"
  log "desk '${beat}' filed $(jq 'length' "${out}") item(s)"
}

# ---------------------------------------------------------------------------
# NEWSROOM: staff the desks in parallel, then wait for every filing.
# ---------------------------------------------------------------------------
EXPORT_OUT="${STATE_DIR}/desk-export.json"
PWC_OUT="${STATE_DIR}/desk-pwc.json"

# Pre-seed so collation is safe even if a desk dies hard.
echo "[]" > "${EXPORT_OUT}"
echo "[]" > "${PWC_OUT}"

run_desk "Fable/Mythos export control" "${EXPORT_PROMPT}" "${EXPORT_OUT}" &
run_desk "PwC Canada & competitors (AI)" "${PWC_PROMPT}" "${PWC_OUT}" &
wait

# ---------------------------------------------------------------------------
# WIRE EDITOR (pure jq, no model). Collate, drop already-seen, enforce the
# significance floor, dedupe, order, and cap.
# ---------------------------------------------------------------------------
ALL_ITEMS="$(jq -s 'add // []' "${EXPORT_OUT}" "${PWC_OUT}")"

NEW_ITEMS="$(jq -n \
  --argjson all "${ALL_ITEMS}" \
  --slurpfile seen "${SEEN_FILE}" \
  --arg floor "${SIGNIFICANCE_FLOOR}" \
  --arg max "${MAX_ITEMS}" '
  def rank(s): {"low":1,"medium":2,"high":3}[s] // 2;
  (($seen[0]) // []) as $seenurls
  | [ $all[]
      | .url as $u
      | select(($seenurls | index($u)) | not)
      | select(rank(.significance) >= rank($floor)) ]
  | unique_by(.url)
  | sort_by([ (if .official then 0 else 1 end), (3 - rank(.significance)) ])
  | .[0:($max | tonumber)]
')"

NEW_COUNT="$(echo "${NEW_ITEMS}" | jq 'length')"
log "${NEW_COUNT} new item(s) for the ${EDITION} edition"

if [ "${NEW_COUNT}" -eq 0 ] && [ "${PUBLISH_EMPTY}" != "true" ]; then
  log "no new items and PUBLISH_EMPTY=false — no edition published"
  exit 0
fi

# Render the edition body (grouped by beat), or a quiet-day note.
if [ "${NEW_COUNT}" -gt 0 ]; then
  BODY="$(echo "${NEW_ITEMS}" | jq -r '
    group_by(.beat)[] |
    ( "\n## \(.[0].beat)" ),
    ( .[] |
      "\n### \(if .official == true then "[Official] " else "" end)\(.title)\n- Source: \(.source)\(if .official == true then " (official release)" else "" end)\n- Published: \(.published)\n- Significance: \(.significance // "unknown")\n- \(.url)\n\n\(.summary)" )
  ')"
else
  BODY=$'\n_No new significant items this edition._'
fi

# --- Publish the edition to Google Drive -----------------------------------
EDITION_FILE="${GDRIVE_DIR}/Newsroom Watch ${DATE} — ${EDITION} Edition.md"
DRIVE_OK=0
if mkdir -p "${GDRIVE_DIR}" 2>>"${LOG_FILE}"; then
  {
    echo "# Newsroom Watch — ${EDITION} Edition"
    echo ""
    echo "**${DATE_LONG}**  ·  significance floor: ${SIGNIFICANCE_FLOOR}  ·  ${NEW_COUNT} item(s)"
    echo ""
    echo "Beats: Fable/Mythos export control · PwC Canada & competitors (AI)"
    echo "${BODY}"
  } > "${EDITION_FILE}"
  DRIVE_OK=1
  log "edition filed to Drive: ${EDITION_FILE}"
else
  log "GDRIVE_DIR unavailable — edition not saved to Drive"
fi

# --- Update the rolling Obsidian digest + seen list (only when there's news) -
if [ "${NEW_COUNT}" -gt 0 ]; then
  STAMP="$(date '+%Y-%m-%d %H:%M')"
  {
    echo ""
    echo "## ${STAMP} — ${EDITION} edition"
    echo "${BODY}"
  } >> "${OBSIDIAN_NOTE}"

  jq -s '.[0] + (.[1] | map(.url)) | unique' "${SEEN_FILE}" <(echo "${NEW_ITEMS}") > "${SEEN_FILE}.tmp"
  mv "${SEEN_FILE}.tmp" "${SEEN_FILE}"
fi

# --- One macOS notification summarising the edition ------------------------
if [ "${NEW_COUNT}" -gt 0 ]; then
  FIRST_TITLE="$(echo "${NEW_ITEMS}" | jq -r '.[0].title')"
  FIRST_FLAG="$(echo "${NEW_ITEMS}" | jq -r 'if (.[0].official == true) then "[Official] " elif (.[0].significance == "high") then "[Significant] " else "" end')"
  OFFICIAL_COUNT="$(echo "${NEW_ITEMS}" | jq '[ .[] | select(.official == true) ] | length')"
  NOTE_BODY="${NEW_COUNT} items (${OFFICIAL_COUNT} official). Top: ${FIRST_FLAG}${FIRST_TITLE}"
else
  NOTE_BODY="No new significant items today."
fi
[ "${DRIVE_OK}" -eq 1 ] && NOTE_BODY="${NOTE_BODY} · saved to Google Drive"

# Escape double quotes for AppleScript.
NOTE_BODY_ESCAPED="$(echo "${NOTE_BODY}" | sed 's/"/\\"/g')"
osascript -e "display notification \"${NOTE_BODY_ESCAPED}\" with title \"Newsroom Watch — ${EDITION} Edition\" sound name \"Submarine\""

log "run complete, ${EDITION} edition published"
