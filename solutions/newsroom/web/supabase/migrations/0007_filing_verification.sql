-- ============================================================================
-- The Newsroom — story verification & sourcing standards
-- ============================================================================
-- For an AI-researched paper, human verification is the credibility crux (and
-- the Vaughn Tan principle made operational). Each filing carries a verification
-- state the editor sets before publishing:
--   unverified : not yet checked (default)
--   verified   : the editor confirmed it (ideally a second source)
--   flagged    : single-source / unconfirmed — publish only with caution
-- URL-less filings are auto-flagged on arrival (can't be source-checked).
-- ============================================================================

alter table filings
  add column if not exists verification      text not null default 'unverified',
  add column if not exists verification_note text,
  add column if not exists verified_by       uuid references auth.users (id),
  add column if not exists verified_at        timestamptz;
