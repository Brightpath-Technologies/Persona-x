-- ============================================================================
-- The Newsroom — distribution, provenance, corrections & human contributors
-- ============================================================================
-- Adds: subscribers + email distribution, the Vaughn Tan accountability layer
-- (explicit human sign-off rationale, provenance, archive, corrections), and
-- first-class human contributors with attribution + a compensation ledger.
-- ============================================================================

-- --- editions: accountability + lifecycle -----------------------------------
alter table editions
  add column if not exists editor_note  text,          -- human sign-off rationale (the Vaughn Tan "state your reason")
  add column if not exists archived_at  timestamptz,   -- withdrawn from public, retained
  add column if not exists corrections  jsonb not null default '[]'::jsonb, -- [{at, text}]
  add column if not exists last_sent_at timestamptz;    -- last distribution to subscribers

-- Public read: published, in a public newsroom, AND not archived.
drop policy if exists editions_public_read on editions;
create policy editions_public_read on editions
  for select using (
    status = 'published'
    and archived_at is null
    and exists (
      select 1 from newsrooms n
      where n.id = editions.newsroom_id and n.is_public = true
    )
  );

-- --- subscribers -------------------------------------------------------------
create table if not exists subscribers (
  id          uuid primary key default gen_random_uuid(),
  newsroom_id uuid not null references newsrooms (id) on delete cascade,
  email       text not null,
  status      text not null default 'active',  -- active | unsubscribed
  token       uuid not null default gen_random_uuid(), -- unsubscribe handle
  created_at  timestamptz not null default now(),
  unique (newsroom_id, email)
);

alter table subscribers enable row level security;
-- Owner manages their list from the dashboard. Public subscribe / unsubscribe
-- go through server routes using the service role, so no anon RLS is needed.
drop policy if exists subscribers_owner_all on subscribers;
create policy subscribers_owner_all on subscribers
  for all to authenticated
  using (owns_newsroom(newsroom_id)) with check (owns_newsroom(newsroom_id));

-- --- human contributors (writers, experts, photographers) -------------------
create table if not exists contributors (
  id          uuid primary key default gen_random_uuid(),
  newsroom_id uuid not null references newsrooms (id) on delete cascade,
  name        text not null,
  role        text not null default 'writer', -- writer | expert | photographer | editor | other
  contact     text,
  attribution text,                            -- byline handle / link to credit them
  rate_note   text,                            -- standing rate / terms
  created_at  timestamptz not null default now()
);

alter table contributors enable row level security;
drop policy if exists contributors_owner_all on contributors;
create policy contributors_owner_all on contributors
  for all to authenticated
  using (owns_newsroom(newsroom_id)) with check (owns_newsroom(newsroom_id));

-- --- contributions: attribution + compensation ledger -----------------------
-- Links a human contributor to an edition with what they did and what they are
-- owed/paid. This is how the newsroom recognises, attributes, and compensates
-- real human work alongside the AI desks.
create table if not exists contributions (
  id             uuid primary key default gen_random_uuid(),
  newsroom_id    uuid not null references newsrooms (id) on delete cascade,
  edition_id     uuid references editions (id) on delete set null,
  contributor_id uuid not null references contributors (id) on delete cascade,
  role           text not null default 'writer',
  description    text,                          -- what they contributed (the byline/credit)
  amount         numeric(12,2),                 -- agreed compensation
  currency       text not null default 'CAD',
  status         text not null default 'proposed', -- proposed | agreed | paid
  created_at     timestamptz not null default now()
);

-- Contributions (the compensation ledger) are OWNER-ONLY. Public credits are
-- served by the read page via a controlled server-side query that selects only
-- attribution-safe columns (role, byline) — amounts are never exposed to anon.
alter table contributions enable row level security;
drop policy if exists contributions_owner_all on contributions;
create policy contributions_owner_all on contributions
  for all to authenticated
  using (owns_newsroom(newsroom_id)) with check (owns_newsroom(newsroom_id));
