-- ============================================================================
-- The Newsroom — contributor profiles
-- ============================================================================
-- Richer standing profiles for human contributors (writers, copy editors,
-- photographers, artists, subject-matter experts) so they can be identified,
-- managed, and credited from a roster — not just created inline per edition.
-- ============================================================================

alter table contributors
  add column if not exists bio           text,
  add column if not exists portfolio_url text,
  add column if not exists active        boolean not null default true;
