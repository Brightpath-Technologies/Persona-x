-- ============================================================================
-- The Newsroom — subscriber notification channels
-- ============================================================================
-- Per-subscriber channel preferences. Email is the only push channel today
-- (RSS is a public pull feed, not a per-subscriber setting); the boolean keeps
-- room for more channels later. `status` remains the master on/off.
-- ============================================================================

alter table subscribers
  add column if not exists email_enabled boolean not null default true;
