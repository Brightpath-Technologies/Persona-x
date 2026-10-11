-- ============================================================================
-- The Newsroom — double opt-in subscriber confirmation
-- ============================================================================
-- Public sign-ups must confirm via an emailed link before they receive
-- editions (confirmed_at is set on confirm). Owner-added subscribers are
-- auto-confirmed. Only confirmed + active + email-enabled subscribers are sent
-- editions.
-- ============================================================================

alter table subscribers
  add column if not exists confirmed_at timestamptz;
