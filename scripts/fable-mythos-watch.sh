#!/bin/bash
#
# fable-mythos-watch.sh
# A source-checked "newsroom" watcher that publishes twice-daily editions and a
# live HTML dashboard.
#
# Several reporter "desks" run in parallel, each as its own headless Claude Code
# process (a separate sub-agent context). A pure-jq "wire editor" collates every
# filing: it dedupes against local state, drops anything below a significance
# floor, and orders official releases and higher-significance items first.
#
# Each run:
#   - publishes an EDITION (Morning or Afternoon) as Markdown to Google Drive,
#   - regenerates a Dashboard.html (beats, editions, releases) in the same place,
#   - appends to a rolling Obsidian digest, and
#   - fires a macOS notification.
#
# Desks currently staffed:
#   1. Fable 5 / Mythos 5 US export-control story (incl. direct Anthropic releases)
#   2. PwC Canada and its competitors — significant AI developments only
#
# Add a desk: write a *_PROMPT, add a name to BEAT_NAMES, add a run_desk line,
# and add its file to the collation. The dashboard picks it up automatically.
#
# Designed to run twice daily via launchd (see com.persona-x.fable-mythos-watch.plist).
# Uses your existing Claude Code authentication. No API key needed.

set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIG. Edit these paths to match your machine.
# ---------------------------------------------------------------------------

# Rolling digest in your Obsidian vault (everything seen, appended over time).
OBSIDIAN_NOTE="${HOME}/Obsidian/MainVault/00-Inbox/fable-mythos-watch.md"

# Google Drive folder for editions + the dashboard. With Google Drive for
# Desktop installed, files written here sync automatically. Find your path under
# ~/Library/CloudStorage/.
GDRIVE_DIR="${GDRIVE_DIR:-${HOME}/Library/CloudStorage/GoogleDrive-your.account@gmail.com/My Drive/Newsroom Watch}"

# Full path to the claude binary. Find yours with: which claude
# launchd does not inherit your shell PATH, so hardcode it.
CLAUDE_BIN="${HOME}/.local/bin/claude"

# ---------------------------------------------------------------------------
# Model + token budget. Default is sonnet for well-grounded, cited results;
# drop to haiku for lower cost if you accept a higher hallucination risk.
# ---------------------------------------------------------------------------

REPORTER_MODEL="${REPORTER_MODEL:-sonnet}"
DESK_MAX_TURNS="${DESK_MAX_TURNS:-12}"
DESK_MAX_ITEMS="${DESK_MAX_ITEMS:-6}"

# Editor (pure jq) settings.
MAX_ITEMS="${MAX_ITEMS:-12}"                          # cap after collation
SIGNIFICANCE_FLOOR="${SIGNIFICANCE_FLOOR:-medium}"    # drop below this: low|medium|high
MAX_AGE_DAYS="${MAX_AGE_DAYS:-7}"                     # drop items published more than this many days ago

# Publish an edition even on a quiet news cycle (true), or stay silent (false).
PUBLISH_EMPTY="${PUBLISH_EMPTY:-true}"

# ---------------------------------------------------------------------------
# Internal state.
# ---------------------------------------------------------------------------

STATE_DIR="${HOME}/.fable-mythos-watch"
SEEN_FILE="${STATE_DIR}/seen.json"
HISTORY_FILE="${STATE_DIR}/history.jsonl"
LOG_FILE="${STATE_DIR}/watch.log"
DASHBOARD_FILE="${GDRIVE_DIR}/Newsroom Watch — Dashboard.html"

# The roster, used by both the desks and the dashboard.
BEAT_EXPORT="Fable/Mythos export control"
BEAT_PWC="PwC Canada & competitors (AI)"
BEAT_NAMES=("${BEAT_EXPORT}" "${BEAT_PWC}")

mkdir -p "${STATE_DIR}"
mkdir -p "$(dirname "${OBSIDIAN_NOTE}")"
[ -f "${SEEN_FILE}" ] || echo "[]" > "${SEEN_FILE}"
[ -f "${OBSIDIAN_NOTE}" ] || printf '# Newsroom Watch — rolling digest\n\nAutomated. New items appended below; editions and the dashboard go to Google Drive.\n' > "${OBSIDIAN_NOTE}"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S')  $*" >> "${LOG_FILE}"; }

# Which edition is this? Derived from the clock unless EDITION is set.
DATE="$(date '+%Y-%m-%d')"
DATE_LONG="$(date '+%A, %d %B %Y')"
if [ -z "${EDITION:-}" ]; then
  if [ "$((10#$(date '+%H')))" -lt 12 ]; then EDITION="Morning"; else EDITION="Afternoon"; fi
fi

log "run started (${EDITION} edition, model=${REPORTER_MODEL}, floor=${SIGNIFICANCE_FLOOR})"

# Shared output contract, kept DRY across desks, with hard anti-fabrication rules.
JSON_CONTRACT="Run several distinct web searches with varied phrasing before \
concluding. Only include an item you actually found via web search and can cite \
with a real, working URL — never invent, guess, or infer an item or a link. If \
you are unsure an item is real, omit it. An empty result is acceptable and \
preferred over a fabricated one.

RECENCY: only include items published within the last ${MAX_AGE_DAYS} days. \
Omit anything older, even if significant.

Return ONLY a raw JSON array and nothing else. No prose, no markdown, no code \
fences. Each element must be an object with exactly these keys: title, url, \
source, summary, published, official, significance. summary is one or two plain \
sentences. published must be the publication date in ISO format YYYY-MM-DD \
(your best estimate). official is a boolean, true \
only when the item is a release published by the organisation the story is \
about. significance is one of \"high\", \"medium\", or \"low\". Return at most \
${DESK_MAX_ITEMS} items, newest first; list official releases and \
higher-significance items first. If you find nothing that clears the bar, \
return []."

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
# render_dashboard <out.html> — regenerate a self-contained dashboard from the
# run history: totals, per-beat counts, editions, and recent releases.
# ---------------------------------------------------------------------------
render_dashboard() {
  local out="$1"
  [ -f "${HISTORY_FILE}" ] || { log "no history yet; skipping dashboard"; return 0; }
  mkdir -p "$(dirname "${out}")" 2>>"${LOG_FILE}" || { log "dashboard dir unavailable"; return 0; }

  local total_runs total_pub total_official last_ts editions_rows release_rows beat_rows b tp lf
  total_runs="$(jq -s 'length' "${HISTORY_FILE}")"
  total_pub="$(jq -s '[.[].published[]] | length' "${HISTORY_FILE}")"
  total_official="$(jq -s '[.[].published[] | select(.official==true)] | length' "${HISTORY_FILE}")"
  last_ts="$(jq -rs 'sort_by(.ts) | reverse | (.[0].ts // "—")' "${HISTORY_FILE}")"

  editions_rows="$(jq -rs '
    sort_by(.ts) | reverse | .[0:20][] |
    "<tr><td>\(.date)</td><td>\(.edition)</td><td class=num>\(.published|length)</td><td class=num>\([.published[]|select(.official==true)]|length)</td></tr>"
  ' "${HISTORY_FILE}")"

  release_rows="$(jq -rs '
    [ .[] | .ts as $t | .published[] | . + {ts:$t} ]
    | sort_by(.ts) | reverse | .[0:60][] |
    "<tr><td>\(.ts|sub("T.*";""))</td><td>\(.beat)</td><td><span class=\"sig \(.significance)\">\(.significance)</span></td><td class=ctr>\(if .official then "●" else "" end)</td><td><a href=\"\(.url)\" target=_blank rel=noopener>\(.title)</a></td></tr>"
  ' "${HISTORY_FILE}")"

  beat_rows=""
  for b in "${BEAT_NAMES[@]}"; do
    tp="$(jq -s --arg b "${b}" '[.[].published[] | select(.beat==$b)] | length' "${HISTORY_FILE}")"
    lf="$(jq -s --arg b "${b}" 'sort_by(.ts) | reverse | (.[0].filed[$b] // 0)' "${HISTORY_FILE}")"
    beat_rows="${beat_rows}<tr><td>${b}</td><td class=num>${lf}</td><td class=num>${tp}</td></tr>"
  done

  cat > "${out}" <<HTML
<!doctype html>
<html lang=en><head><meta charset=utf-8>
<meta name=viewport content="width=device-width, initial-scale=1">
<title>Newsroom Watch — Dashboard</title>
<style>
 body{font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;background:#0f1115;color:#e6e8eb}
 .wrap{max-width:980px;margin:0 auto;padding:30px 20px 64px}
 h1{font-size:24px;margin:0 0 2px} .sub{color:#9aa0a6;margin:0 0 24px}
 .cards{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 26px}
 .card{background:#171a21;border:1px solid #242935;border-radius:10px;padding:14px 18px;min-width:120px}
 .card .n{font-size:26px;font-weight:600}
 .card .l{color:#9aa0a6;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
 h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#9aa0a6;border-bottom:1px solid #242935;padding-bottom:6px;margin:30px 0 10px}
 table{width:100%;border-collapse:collapse;font-size:14px}
 th,td{text-align:left;padding:7px 10px;border-bottom:1px solid #1d212b;vertical-align:top}
 th{color:#9aa0a6;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
 td.num{text-align:right;font-variant-numeric:tabular-nums} td.ctr{text-align:center;color:#7cc4ff}
 a{color:#7cc4ff;text-decoration:none} a:hover{text-decoration:underline}
 .sig{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;text-transform:uppercase}
 .sig.high{background:#3a1620;color:#ff8095} .sig.medium{background:#3a2f12;color:#f5c466} .sig.low{background:#23272f;color:#9aa0a6}
 footer{color:#6b7178;font-size:12px;margin-top:32px}
</style></head>
<body><div class=wrap>
 <h1>Newsroom Watch — Dashboard</h1>
 <p class=sub>Last run: ${last_ts}</p>
 <div class=cards>
  <div class=card><div class=n>${total_runs}</div><div class=l>Runs</div></div>
  <div class=card><div class=n>${total_pub}</div><div class=l>Releases published</div></div>
  <div class=card><div class=n>${total_official}</div><div class=l>Official releases</div></div>
  <div class=card><div class=n>${#BEAT_NAMES[@]}</div><div class=l>Beats</div></div>
 </div>
 <h2>Beats</h2>
 <table><thead><tr><th>Beat</th><th class=num>Filed (last run)</th><th class=num>Published (all-time)</th></tr></thead>
 <tbody>${beat_rows}</tbody></table>
 <h2>Editions</h2>
 <table><thead><tr><th>Date</th><th>Edition</th><th class=num>Items</th><th class=num>Official</th></tr></thead>
 <tbody>${editions_rows}</tbody></table>
 <h2>Recent releases</h2>
 <table><thead><tr><th>Date</th><th>Beat</th><th>Signif.</th><th class=ctr>Off.</th><th>Headline</th></tr></thead>
 <tbody>${release_rows}</tbody></table>
 <footer>Generated by fable-mythos-watch.sh · ${last_ts}</footer>
</div></body></html>
HTML
  log "dashboard written: ${out}"
}

# ---------------------------------------------------------------------------
# NEWSROOM: staff the desks in parallel, then wait for every filing.
# ---------------------------------------------------------------------------
EXPORT_OUT="${STATE_DIR}/desk-export.json"
PWC_OUT="${STATE_DIR}/desk-pwc.json"
echo "[]" > "${EXPORT_OUT}"
echo "[]" > "${PWC_OUT}"

run_desk "${BEAT_EXPORT}" "${EXPORT_PROMPT}" "${EXPORT_OUT}" &
run_desk "${BEAT_PWC}" "${PWC_PROMPT}" "${PWC_OUT}" &
wait

# ---------------------------------------------------------------------------
# WIRE EDITOR (pure jq, no model). Collate, drop already-seen, enforce the
# significance floor, dedupe, order, and cap.
# ---------------------------------------------------------------------------
ALL_ITEMS="$(jq -s 'add // []' "${EXPORT_OUT}" "${PWC_OUT}")"

# Recency cutoff (YYYY-MM-DD), handling both GNU and BSD/macOS date.
CUTOFF="$(date -u -d "${MAX_AGE_DAYS} days ago" +%Y-%m-%d 2>/dev/null || date -u -v-"${MAX_AGE_DAYS}"d +%Y-%m-%d)"
log "recency cutoff: ${CUTOFF} (last ${MAX_AGE_DAYS} days)"

NEW_ITEMS="$(jq -n \
  --argjson all "${ALL_ITEMS}" \
  --slurpfile seen "${SEEN_FILE}" \
  --arg floor "${SIGNIFICANCE_FLOOR}" \
  --arg max "${MAX_ITEMS}" \
  --arg cutoff "${CUTOFF}" '
  def rank(s): {"low":1,"medium":2,"high":3}[s] // 2;
  def isodate: if (type=="string" and test("[0-9]{4}-[0-9]{2}-[0-9]{2}"))
               then (capture("(?<d>[0-9]{4}-[0-9]{2}-[0-9]{2})").d) else null end;
  (($seen[0]) // []) as $seenurls
  | [ $all[]
      | .url as $u
      | select(($seenurls | index($u)) | not)
      | select(rank(.significance) >= rank($floor))
      | select((.published | isodate) as $d | $d == null or $d >= $cutoff) ]
  | unique_by(.url)
  | sort_by([ (if .official then 0 else 1 end), (3 - rank(.significance)) ])
  | .[0:($max | tonumber)]
')"

NEW_COUNT="$(echo "${NEW_ITEMS}" | jq 'length')"
log "${NEW_COUNT} new item(s) for the ${EDITION} edition"

# Record this run in history (always — even quiet runs show on the dashboard).
jq -n -c \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg edition "${EDITION}" \
  --arg date "${DATE}" \
  --arg be "${BEAT_EXPORT}" \
  --arg bp "${BEAT_PWC}" \
  --argjson fe "$(jq 'length' "${EXPORT_OUT}")" \
  --argjson fp "$(jq 'length' "${PWC_OUT}")" \
  --argjson published "${NEW_ITEMS}" \
  '{ts:$ts, edition:$edition, date:$date,
    filed:{($be):$fe, ($bp):$fp},
    published:$published}' >> "${HISTORY_FILE}"

# Decide whether to publish an edition this run.
if [ "${NEW_COUNT}" -eq 0 ] && [ "${PUBLISH_EMPTY}" != "true" ]; then
  log "no new items and PUBLISH_EMPTY=false — no edition published"
  render_dashboard "${DASHBOARD_FILE}"
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
    echo "Beats: ${BEAT_EXPORT} · ${BEAT_PWC}"
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

# --- Regenerate the dashboard ----------------------------------------------
render_dashboard "${DASHBOARD_FILE}"

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

NOTE_BODY_ESCAPED="$(echo "${NOTE_BODY}" | sed 's/"/\\"/g')"
osascript -e "display notification \"${NOTE_BODY_ESCAPED}\" with title \"Newsroom Watch — ${EDITION} Edition\" sound name \"Submarine\""

log "run complete, ${EDITION} edition published"
