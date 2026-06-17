#!/bin/bash
#
# newsroom-watch.sh
# A source-checked "newsroom" watcher that publishes Morning, Afternoon, and
# Final editions (like a traditional newspaper) plus a live HTML dashboard.
#
# Several reporter "desks" — one per beat, defined in beats.json — run in
# parallel, each as its own headless Claude Code process (a separate sub-agent
# context). A pure-jq "wire editor" collates every filing: it dedupes against
# local state, drops anything below a (per-beat) significance floor, enforces a
# (per-beat) recency window, and orders official releases and higher-significance
# items first.
#
# Each run:
#   - publishes an EDITION (Morning, Afternoon, or Final) as Markdown to Google
#     Drive, CLEARLY LABELLED A DRAFT for human review — nothing here is
#     published to an audience until a human assembles, edits, and signs off,
#   - regenerates a Dashboard.html (beats, editions, releases) in the same place,
#   - appends to a rolling Obsidian digest, and
#   - fires a macOS notification.
#
# Beats are configuration, not code: edit scripts/beats.json to add, remove, or
# retune a beat (including its own recency window and significance floor). The
# editor and the dashboard pick up the change unchanged.
#
# Designed to run three times daily (Morning, Afternoon, Final) via launchd
# (see com.brightpath.newsroom-watch.plist).
# Uses your existing Claude Code authentication. No API key needed.
#
# Targets macOS's stock /bin/bash (3.2) — no bash-4 features (mapfile, assoc arrays).

set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIG. Edit these paths to match your machine.
# ---------------------------------------------------------------------------

# Rolling digest in your Obsidian vault (everything seen, appended over time).
OBSIDIAN_NOTE="${HOME}/Obsidian/MainVault/00-Inbox/newsroom-watch.md"

# Google Drive folder for editions + the dashboard. With Google Drive for
# Desktop installed, files written here sync automatically. Find your path under
# ~/Library/CloudStorage/.
GDRIVE_DIR="${GDRIVE_DIR:-${HOME}/Library/CloudStorage/GoogleDrive-your.account@gmail.com/My Drive/Newsroom Watch}"

# Universal Feed direct ingest (producer integration). When a URL + token are
# set, each edition is POSTed straight to the feed's /api/ingest endpoint — no
# Google Drive round-trip needed. The token is read from FEED_TOKEN_FILE (kept
# out of any repo) when not provided via the environment. Leave the token empty
# to disable the integration.
FEED_INGEST_URL="${FEED_INGEST_URL:-https://feed.brightpathtechnology.io/api/ingest}"
FEED_INGEST_TOKEN="${FEED_INGEST_TOKEN:-}"

# Optional: pull the beats config from the feed app (the DB-backed list curated
# in /manage) instead of the static beats.json below. Reuses FEED_INGEST_TOKEN
# as the bearer. Leave empty to use the committed local file. On any fetch
# failure the script falls back to beats.json — see the block further down.
BEATS_URL="${BEATS_URL:-}"

# Full path to the claude binary. Find yours with: which claude
# launchd does not inherit your shell PATH, so hardcode it.
CLAUDE_BIN="${HOME}/.local/bin/claude"

# Beats, as config (JSON, parsed with jq — no new dependency). Override with
# BEATS_FILE=… for a different use case (charity, real-estate, etc.).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BEATS_FILE="${BEATS_FILE:-${SCRIPT_DIR}/beats.json}"

# ---------------------------------------------------------------------------
# Model + token budget. Default is sonnet for well-grounded, cited results;
# drop to haiku for lower cost if you accept a higher hallucination risk.
# ---------------------------------------------------------------------------

REPORTER_MODEL="${REPORTER_MODEL:-sonnet}"
DESK_MAX_TURNS="${DESK_MAX_TURNS:-12}"
DESK_MAX_ITEMS="${DESK_MAX_ITEMS:-6}"

# Editor (pure jq) settings. SIGNIFICANCE_FLOOR and MAX_AGE_DAYS are GLOBAL
# fallbacks; a beat may override either in beats.json.
MAX_ITEMS="${MAX_ITEMS:-12}"                          # cap after collation
SIGNIFICANCE_FLOOR="${SIGNIFICANCE_FLOOR:-medium}"    # global fallback: low|medium|high
MAX_AGE_DAYS="${MAX_AGE_DAYS:-3}"                     # global fallback recency window (suits a 3-edition day)

# Publish an edition even on a quiet news cycle (true), or stay silent (false).
PUBLISH_EMPTY="${PUBLISH_EMPTY:-true}"

# ---------------------------------------------------------------------------
# Internal state.  (Renamed from ~/.fable-mythos-watch — migrate existing state
# with:  mv ~/.fable-mythos-watch ~/.newsroom-watch )
# ---------------------------------------------------------------------------

STATE_DIR="${HOME}/.newsroom-watch"
SEEN_FILE="${STATE_DIR}/seen.json"
HISTORY_FILE="${STATE_DIR}/history.jsonl"
LOG_FILE="${STATE_DIR}/watch.log"
DASHBOARD_FILE="${GDRIVE_DIR}/Newsroom Watch — Dashboard.html"

mkdir -p "${STATE_DIR}"
mkdir -p "$(dirname "${OBSIDIAN_NOTE}")"
[ -f "${SEEN_FILE}" ] || echo "[]" > "${SEEN_FILE}"

# Read the feed ingest token from a local file if not set in the environment.
FEED_TOKEN_FILE="${FEED_TOKEN_FILE:-${STATE_DIR}/feed-token}"
if [ -z "${FEED_INGEST_TOKEN}" ] && [ -f "${FEED_TOKEN_FILE}" ]; then
  FEED_INGEST_TOKEN="$(cat "${FEED_TOKEN_FILE}")"
fi
[ -f "${OBSIDIAN_NOTE}" ] || printf '# Newsroom Watch — rolling digest\n\nAutomated. New items appended below; editions and the dashboard go to Google Drive.\n' > "${OBSIDIAN_NOTE}"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S')  $*" >> "${LOG_FILE}"; }

# --- Optional: pull beats from the feed app (DB-backed), with safe fallback ----
# When BEATS_URL is set, GET it with the same bearer token used for ingest. If it
# returns a non-empty .beats array, point BEATS_FILE at the cached copy. On ANY
# failure (no token, curl error, non-2xx, invalid/empty JSON) fall back silently
# to the committed beats.json — this stays independent of the feed app, and the
# sanity-check below still guards whichever file we end up using.
if [ -n "${BEATS_URL}" ] && [ -n "${FEED_INGEST_TOKEN}" ]; then
  BEATS_REMOTE="${STATE_DIR}/beats-remote.json"
  if curl -fsS -H "Authorization: Bearer ${FEED_INGEST_TOKEN}" "${BEATS_URL}" \
       -o "${BEATS_REMOTE}" 2>>"${LOG_FILE}" \
     && jq -e '.beats | type == "array" and length > 0' "${BEATS_REMOTE}" >/dev/null 2>&1; then
    BEATS_FILE="${BEATS_REMOTE}"
    log "beats: using remote config from ${BEATS_URL} ($(jq '.beats | length' "${BEATS_REMOTE}") beats)"
  else
    log "beats: remote fetch/validate failed; falling back to ${BEATS_FILE}"
  fi
elif [ -n "${BEATS_URL}" ]; then
  log "beats: BEATS_URL set but no feed token available; using local ${BEATS_FILE}"
fi

# Sanity-check the beats config up front.
if [ ! -f "${BEATS_FILE}" ]; then
  log "FATAL: beats file not found: ${BEATS_FILE}"
  echo "newsroom-watch: beats file not found: ${BEATS_FILE}" >&2
  exit 1
fi
if ! jq empty "${BEATS_FILE}" >/dev/null 2>&1; then
  log "FATAL: beats file is not valid JSON: ${BEATS_FILE}"
  echo "newsroom-watch: beats file is not valid JSON: ${BEATS_FILE}" >&2
  exit 1
fi

# Which edition is this? Derived from the clock unless EDITION is set.
# Traditional cadence: Morning (before noon), Afternoon (noon–18:00), Final (18:00+).
DATE="$(date '+%Y-%m-%d')"
DATE_LONG="$(date '+%A, %d %B %Y')"
if [ -z "${EDITION:-}" ]; then
  H="$((10#$(date '+%H')))"
  if [ "${H}" -lt 12 ]; then EDITION="Morning"
  elif [ "${H}" -lt 18 ]; then EDITION="Afternoon"
  else EDITION="Final"
  fi
fi

log "run started (${EDITION} edition, model=${REPORTER_MODEL}, global floor=${SIGNIFICANCE_FLOOR}, global window=${MAX_AGE_DAYS}d)"

# A day-cutoff (YYYY-MM-DD) for N days ago, handling GNU and BSD/macOS date.
cutoff_for() {
  local n="$1"
  date -u -d "${n} days ago" +%Y-%m-%d 2>/dev/null || date -u -v-"${n}"d +%Y-%m-%d
}

# Shared output contract, kept DRY across desks, with hard anti-fabrication
# rules. Takes the per-beat recency window (days) so each desk is told its own.
build_contract() {
  local age="$1"
  printf '%s' "Run several distinct web searches with varied phrasing before \
concluding. Only include an item you actually found via web search and can cite \
with a real, working URL — never invent, guess, or infer an item or a link. If \
you are unsure an item is real, omit it. An empty result is acceptable and \
preferred over a fabricated one.

RECENCY: only include items published within the last ${age} days. Omit anything \
older, even if significant.

Return ONLY a raw JSON array and nothing else. No prose, no markdown, no code \
fences. Each element must be an object with exactly these keys: title, url, \
source, summary, published, official, significance. summary is one or two plain \
sentences. published must be the publication date in ISO format YYYY-MM-DD \
(your best estimate). official is a boolean, true only when the item is a \
release published by the organisation the story is about. significance is one \
of \"high\", \"medium\", or \"low\". Return at most ${DESK_MAX_ITEMS} items, \
newest first; list official releases and higher-significance items first. If \
you find nothing that clears the bar, return []."
}

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
# Relies on the BEAT_NAMES array (built below from beats.json).
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
 <p class=sub>Last run: ${last_ts} · editions are drafts for human review</p>
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
 <footer>Generated by newsroom-watch.sh · ${last_ts}</footer>
</div></body></html>
HTML
  log "dashboard written: ${out}"
}

# ---------------------------------------------------------------------------
# Load beats from config into parallel indexed arrays (bash 3.2 — no mapfile).
# ---------------------------------------------------------------------------
NUM_BEATS="$(jq '.beats | length' "${BEATS_FILE}")"
if [ "${NUM_BEATS}" -eq 0 ]; then
  log "FATAL: no beats configured in ${BEATS_FILE}"
  echo "newsroom-watch: no beats configured in ${BEATS_FILE}" >&2
  exit 1
fi

BEAT_IDS=(); BEAT_NAMES=(); BEAT_AGES=(); BEAT_FLOORS=(); DESK_FILES=()
i=0
while [ "${i}" -lt "${NUM_BEATS}" ]; do
  BEAT_IDS+=("$(jq -r ".beats[${i}].id" "${BEATS_FILE}")")
  BEAT_NAMES+=("$(jq -r ".beats[${i}].name" "${BEATS_FILE}")")
  BEAT_AGES+=("$(jq -r ".beats[${i}].max_age_days // ${MAX_AGE_DAYS}" "${BEATS_FILE}")")
  BEAT_FLOORS+=("$(jq -r ".beats[${i}].significance_floor // \"${SIGNIFICANCE_FLOOR}\"" "${BEATS_FILE}")")
  i=$((i+1))
done

# ---------------------------------------------------------------------------
# NEWSROOM: staff every desk in parallel; build the per-beat meta map the editor
# uses for per-beat recency + significance floors.
# ---------------------------------------------------------------------------
BEAT_META="{}"                       # { "<beat name>": {cutoff, floor}, … }
i=0
while [ "${i}" -lt "${NUM_BEATS}" ]; do
  bid="${BEAT_IDS[$i]}"; bname="${BEAT_NAMES[$i]}"; bage="${BEAT_AGES[$i]}"; bfloor="${BEAT_FLOORS[$i]}"
  bcutoff="$(cutoff_for "${bage}")"
  BEAT_META="$(jq -c --arg n "${bname}" --arg c "${bcutoff}" --arg f "${bfloor}" \
    '. + {($n): {cutoff:$c, floor:$f}}' <<<"${BEAT_META}")"

  out="${STATE_DIR}/desk-${bid}.json"
  echo "[]" > "${out}"
  DESK_FILES+=("${out}")

  bprompt="$(jq -r ".beats[${i}].prompt" "${BEATS_FILE}")"
  full_prompt="${bprompt} $(build_contract "${bage}")"
  log "desk '${bname}': window ${bage}d (cutoff ${bcutoff}), floor ${bfloor}"
  run_desk "${bname}" "${full_prompt}" "${out}" &
  i=$((i+1))
done
wait

# ---------------------------------------------------------------------------
# WIRE EDITOR (pure jq, no model). Collate, drop already-seen, enforce the
# (per-beat) significance floor and (per-beat) recency, dedupe, order, and cap.
# Undated items (no parseable published date) are KEPT but normalised to
# published:null and ordered LAST, so the human sees them flagged rather than
# silently mixed in (design note C3).
# ---------------------------------------------------------------------------
ALL_ITEMS="$(jq -s 'add // []' "${DESK_FILES[@]}")"
GLOBAL_CUTOFF="$(cutoff_for "${MAX_AGE_DAYS}")"

NEW_ITEMS="$(jq -n \
  --argjson all "${ALL_ITEMS}" \
  --slurpfile seen "${SEEN_FILE}" \
  --argjson meta "${BEAT_META}" \
  --arg gfloor "${SIGNIFICANCE_FLOOR}" \
  --arg gcutoff "${GLOBAL_CUTOFF}" \
  --arg max "${MAX_ITEMS}" '
  def rank(s): {"low":1,"medium":2,"high":3}[s] // 2;
  def isodate: if (type=="string" and test("[0-9]{4}-[0-9]{2}-[0-9]{2}"))
               then (capture("(?<d>[0-9]{4}-[0-9]{2}-[0-9]{2})").d) else null end;
  (($seen[0]) // []) as $seenurls
  | [ $all[]
      | ($meta[.beat] // {cutoff:$gcutoff, floor:$gfloor}) as $m
      | .url as $u
      | select(($seenurls | index($u)) | not)
      | select(rank(.significance) >= rank($m.floor))
      | (.published | isodate) as $d
      | select($d == null or $d >= $m.cutoff)
      | .published = $d ]                                  # undated → null, dated → ISO
  | unique_by(.url)
  | sort_by([ (if .official then 0 else 1 end),
              (if .published == null then 1 else 0 end),   # undated last (C3)
              (3 - rank(.significance)) ])
  | .[0:($max | tonumber)]
')"

NEW_COUNT="$(echo "${NEW_ITEMS}" | jq 'length')"
log "${NEW_COUNT} new item(s) for the ${EDITION} edition (draft)"

# Per-beat filed counts for the history record.
FILED_MAP="{}"
i=0
while [ "${i}" -lt "${NUM_BEATS}" ]; do
  bname="${BEAT_NAMES[$i]}"; out="${DESK_FILES[$i]}"
  cnt="$(jq 'length' "${out}")"
  FILED_MAP="$(jq -c --arg n "${bname}" --argjson c "${cnt}" '. + {($n): $c}' <<<"${FILED_MAP}")"
  i=$((i+1))
done

# Record this run in history (always — even quiet runs show on the dashboard).
jq -n -c \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg edition "${EDITION}" \
  --arg date "${DATE}" \
  --argjson filed "${FILED_MAP}" \
  --argjson published "${NEW_ITEMS}" \
  '{ts:$ts, edition:$edition, date:$date, filed:$filed, published:$published}' >> "${HISTORY_FILE}"

# Decide whether to publish a (draft) edition this run.
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
      "\n### \(if .official == true then "[Official] " else "" end)\(.title)\n- Source: \(.source)\(if .official == true then " (official release)" else "" end)\n- Published: \(.published // "undated")\n- Significance: \(.significance // "unknown")\n- \(.url)\n\n\(.summary)" )
  ')"
else
  BODY=$'\n_No new significant items this edition._'
fi

# Dynamic beats line for the edition header.
BEATS_LINE="$(printf '%s · ' "${BEAT_NAMES[@]}")"; BEATS_LINE="${BEATS_LINE% · }"

# --- Assemble the (draft) edition markdown ---------------------------------
EDITION_MD="$(
  echo "# Newsroom Watch — ${EDITION} Edition (Draft)"
  echo ""
  echo "> **DRAFT — for human review.** Assembled by agents; nothing here is published to an audience until a human reviews, edits, and signs off."
  echo ""
  echo "**${DATE_LONG}**  ·  significance floor: per-beat (default ${SIGNIFICANCE_FLOOR})  ·  ${NEW_COUNT} item(s)"
  echo ""
  echo "Beats: ${BEATS_LINE}"
  echo "${BODY}"
)"

# --- Publish the (draft) edition to Google Drive (if a synced folder exists) -
EDITION_FILE="${GDRIVE_DIR}/Newsroom Watch ${DATE} — ${EDITION} Edition (Draft).md"
DRIVE_OK=0
if mkdir -p "${GDRIVE_DIR}" 2>>"${LOG_FILE}"; then
  printf '%s\n' "${EDITION_MD}" > "${EDITION_FILE}"
  DRIVE_OK=1
  log "draft edition filed to Drive: ${EDITION_FILE}"
else
  log "GDRIVE_DIR unavailable — edition not saved to Drive"
fi

# --- Push the edition straight into the Universal Feed (direct ingest) -------
FEED_OK=0
if [ -n "${FEED_INGEST_URL}" ] && [ -n "${FEED_INGEST_TOKEN}" ] && [ "${NEW_COUNT}" -gt 0 ]; then
  feed_payload="$(jq -n --arg c "${EDITION_MD}" \
    --arg fn "Newsroom Watch ${DATE} — ${EDITION}.md" \
    '{format:"markdown-edition", connector:"watch-script", filename:$fn, content:$c}')"
  feed_resp="$(curl -s -X POST "${FEED_INGEST_URL}" \
    -H "Authorization: Bearer ${FEED_INGEST_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${feed_payload}" 2>>"${LOG_FILE}")" || feed_resp=""
  if echo "${feed_resp}" | jq -e '.ok == true' >/dev/null 2>&1; then
    FEED_OK=1
    log "feed ingest ok: ${feed_resp}"
  else
    log "feed ingest failed or empty response: ${feed_resp}"
  fi
fi

# --- Update the rolling Obsidian digest + seen list (only when there's news) -
if [ "${NEW_COUNT}" -gt 0 ]; then
  STAMP="$(date '+%Y-%m-%d %H:%M')"
  {
    echo ""
    echo "## ${STAMP} — ${EDITION} edition (draft)"
    echo "${BODY}"
  } >> "${OBSIDIAN_NOTE}"

  jq -s '.[0] + (.[1] | map(.url)) | unique' "${SEEN_FILE}" <(echo "${NEW_ITEMS}") > "${SEEN_FILE}.tmp"
  mv "${SEEN_FILE}.tmp" "${SEEN_FILE}"
fi

# --- Regenerate the dashboard ----------------------------------------------
render_dashboard "${DASHBOARD_FILE}"

# --- One macOS notification summarising the (draft) edition ----------------
if [ "${NEW_COUNT}" -gt 0 ]; then
  FIRST_TITLE="$(echo "${NEW_ITEMS}" | jq -r '.[0].title')"
  FIRST_FLAG="$(echo "${NEW_ITEMS}" | jq -r 'if (.[0].official == true) then "[Official] " elif (.[0].significance == "high") then "[Significant] " else "" end')"
  OFFICIAL_COUNT="$(echo "${NEW_ITEMS}" | jq '[ .[] | select(.official == true) ] | length')"
  NOTE_BODY="${NEW_COUNT} items (${OFFICIAL_COUNT} official) to review. Top: ${FIRST_FLAG}${FIRST_TITLE}"
else
  NOTE_BODY="No new significant items today."
fi
[ "${DRIVE_OK}" -eq 1 ] && NOTE_BODY="${NOTE_BODY} · draft saved to Google Drive"
[ "${FEED_OK}" -eq 1 ] && NOTE_BODY="${NOTE_BODY} · pushed to feed"

NOTE_BODY_ESCAPED="$(echo "${NOTE_BODY}" | sed 's/"/\\"/g')"
osascript -e "display notification \"${NOTE_BODY_ESCAPED}\" with title \"Newsroom Watch — ${EDITION} Draft\" sound name \"Submarine\""

log "run complete, ${EDITION} draft edition published"
