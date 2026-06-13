#!/bin/bash
#
# fable-mythos-watch.sh
# A minimal-token "newsroom" watcher.
#
# Several reporter "desks" run in parallel, each as its own headless Claude Code
# process (a separate sub-agent context) on a small, cheap model. A pure-jq
# "wire editor" then collates every desk's filing: it dedupes against local
# state, drops anything below a significance floor, and orders official releases
# and higher-significance items first. New items are appended to an Obsidian
# note (grouped by beat) and summarised in one macOS notification.
#
# Desks currently staffed:
#   1. Fable 5 / Mythos 5 US export-control story (incl. direct Anthropic releases)
#   2. PwC Canada and its competitors — significant AI developments only
#
# Add a desk: write a *_PROMPT and add one run_desk line in the NEWSROOM block.
#
# Designed to run unattended via launchd (see com.persona-x.fable-mythos-watch.plist).
# Uses your existing Claude Code authentication. No API key needed.

set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIG. Edit these two paths to match your machine.
# ---------------------------------------------------------------------------

# Where the running digest lives. Point this at your vault.
OBSIDIAN_NOTE="${HOME}/Obsidian/MainVault/00-Inbox/fable-mythos-watch.md"

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

# ---------------------------------------------------------------------------
# Internal state. You should not need to touch anything below.
# ---------------------------------------------------------------------------

STATE_DIR="${HOME}/.fable-mythos-watch"
SEEN_FILE="${STATE_DIR}/seen.json"
LOG_FILE="${STATE_DIR}/watch.log"

mkdir -p "${STATE_DIR}"
mkdir -p "$(dirname "${OBSIDIAN_NOTE}")"
[ -f "${SEEN_FILE}" ] || echo "[]" > "${SEEN_FILE}"
[ -f "${OBSIDIAN_NOTE}" ] || printf '# Fable 5 / Mythos 5 + AI Newsroom Watch\n\nAutomated digest. New items appended below.\n' > "${OBSIDIAN_NOTE}"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S')  $*" >> "${LOG_FILE}"; }

log "run started (model=${REPORTER_MODEL}, floor=${SIGNIFICANCE_FLOOR})"

# Shared output contract, kept DRY across desks. Each desk tags significance and
# whether an item is an official release from the organisation it concerns.
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
news, legal or policy analysis, congressional response. Skip rehashes of the \
initial shutdown. Pay special attention to news releases published by Anthropic \
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

if [ "${NEW_COUNT}" -eq 0 ]; then
  log "no new items clearing the bar"
  exit 0
fi

log "${NEW_COUNT} new item(s)"

# Append a dated block to the Obsidian note, grouped by beat.
STAMP="$(date '+%Y-%m-%d %H:%M')"
{
  echo ""
  echo "## ${STAMP}"
  echo "${NEW_ITEMS}" | jq -r '
    group_by(.beat)[] |
    ( "\n### \(.[0].beat)" ),
    ( .[] |
      "\n#### \(if .official == true then "[Official] " else "" end)\(.title)\n- Source: \(.source)\(if .official == true then " (official release)" else "" end)\n- Published: \(.published)\n- Significance: \(.significance // "unknown")\n- \(.url)\n\n\(.summary)" )
  '
} >> "${OBSIDIAN_NOTE}"

# Record the new URLs as seen.
jq -s '.[0] + (.[1] | map(.url)) | unique' "${SEEN_FILE}" <(echo "${NEW_ITEMS}") > "${SEEN_FILE}.tmp"
mv "${SEEN_FILE}.tmp" "${SEEN_FILE}"

# Fire one macOS notification. Items are already ordered with official and
# higher-significance entries first, so the first item is the headline.
FIRST_TITLE="$(echo "${NEW_ITEMS}" | jq -r '.[0].title')"
FIRST_FLAG="$(echo "${NEW_ITEMS}" | jq -r 'if (.[0].official == true) then "[Official] " elif (.[0].significance == "high") then "[Significant] " else "" end')"
OFFICIAL_COUNT="$(echo "${NEW_ITEMS}" | jq '[ .[] | select(.official == true) ] | length')"
if [ "${NEW_COUNT}" -eq 1 ]; then
  NOTE_BODY="${FIRST_FLAG}${FIRST_TITLE}"
else
  NOTE_BODY="${NEW_COUNT} new items (${OFFICIAL_COUNT} official). Latest: ${FIRST_FLAG}${FIRST_TITLE}"
fi

# Escape double quotes for AppleScript.
NOTE_BODY_ESCAPED="$(echo "${NOTE_BODY}" | sed 's/"/\\"/g')"
osascript -e "display notification \"${NOTE_BODY_ESCAPED}\" with title \"Newsroom Watch\" sound name \"Submarine\""

log "run complete, notified"
