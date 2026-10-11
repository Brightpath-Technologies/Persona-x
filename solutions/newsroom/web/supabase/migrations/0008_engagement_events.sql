-- ============================================================================
-- The Newsroom — readership analytics
-- ============================================================================
-- A lean engagement-event log. Editors steer by what readers actually do.
--   open  : email edition opened (tracking pixel), carries the subscriber
--   click : a link in an emailed edition was clicked (redirect), carries url
--   view  : a published edition was read on the public page (beacon)
-- Events are written by public tracking endpoints via the service role; only
-- the newsroom owner can read them. No IP / PII stored.
-- ============================================================================

create table if not exists events (
  id            uuid primary key default gen_random_uuid(),
  newsroom_id   uuid not null references newsrooms (id) on delete cascade,
  edition_id    uuid references editions (id) on delete cascade,
  subscriber_id uuid references subscribers (id) on delete set null,
  type          text not null check (type in ('open', 'click', 'view')),
  url           text,
  created_at    timestamptz not null default now()
);

create index if not exists events_newsroom_created_idx
  on events (newsroom_id, created_at desc);
create index if not exists events_edition_type_idx
  on events (edition_id, type);

alter table events enable row level security;
drop policy if exists events_owner_read on events;
create policy events_owner_read on events
  for select to authenticated using (owns_newsroom(newsroom_id));
