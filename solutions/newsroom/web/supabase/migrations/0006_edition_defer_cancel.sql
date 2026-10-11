-- ============================================================================
-- The Newsroom — defer / cancel an edition
-- ============================================================================
-- An editor may hold an edition for later (deferred) or kill it (cancelled)
-- when there's no relevant news. Cancelling releases the edition's filings back
-- to the wire so the stories aren't lost (handled in the route).
-- ============================================================================

alter type edition_status add value if not exists 'deferred';
alter type edition_status add value if not exists 'cancelled';
