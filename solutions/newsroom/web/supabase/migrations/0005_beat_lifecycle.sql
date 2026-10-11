-- ============================================================================
-- The Newsroom — beat lifecycle, cadence & categories
-- ============================================================================
-- A "beat" is the topic; its "desk" is the agent that covers it — the same row.
--   archived_at   : soft-archive (hidden, paused, restorable). Distinct from
--                   `active` (a quick pause/resume toggle).
--   category      : a common category for grouping/quick-add (Technology/AI, …)
--   cadence_hours : auto re-check interval; null/0 = manual only.
--   last_run_at   : when the desk last researched, for cadence scheduling.
-- ============================================================================

alter table beats
  add column if not exists archived_at   timestamptz,
  add column if not exists category      text,
  add column if not exists cadence_hours integer,
  add column if not exists last_run_at   timestamptz;
