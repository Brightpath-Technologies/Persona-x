-- ============================================================================
-- The Newsroom — initial schema
-- ============================================================================
-- Metaphor: the Editor-in-Chief (a user) runs one or more NEWSROOMS. Each
-- newsroom covers BEATS, each staffed by a DESK (an agent brief). Desks file
-- stories onto THE WIRE (filings). The editor assembles filings into an
-- EDITION (draft), the editorial board reviews it, and on sign-off the edition
-- is PUBLISHED as a readable article.
--
-- Every table is owned by a user via the parent newsroom and protected by RLS.
-- ============================================================================

create extension if not exists "pgcrypto";

-- --- enums -------------------------------------------------------------------
do $$ begin
  create type significance as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type filing_status as enum ('new', 'filed', 'spiked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edition_status as enum ('draft', 'in_review', 'published');
exception when duplicate_object then null; end $$;

-- --- newsrooms (workspaces) --------------------------------------------------
create table if not exists newsrooms (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  masthead     text,                          -- tagline under the title
  slug         text not null unique,          -- public read URL: /read/<slug>
  is_public    boolean not null default false,
  token_budget integer not null default 2000000, -- column inches: monthly token cap
  created_at   timestamptz not null default now()
);

-- --- beats + desks (one desk per beat) --------------------------------------
create table if not exists beats (
  id                 uuid primary key default gen_random_uuid(),
  newsroom_id        uuid not null references newsrooms (id) on delete cascade,
  name               text not null,
  brief              text not null,             -- the desk's standing assignment
  recency_days       integer not null default 3,
  significance_floor significance not null default 'medium',
  model              text not null default 'claude-opus-4-8',
  max_items          integer not null default 6,
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);

-- --- the wire (filings from desks) ------------------------------------------
create table if not exists filings (
  id            uuid primary key default gen_random_uuid(),
  newsroom_id   uuid not null references newsrooms (id) on delete cascade,
  beat_id       uuid references beats (id) on delete set null,
  beat_name     text not null,
  headline      text not null,
  summary       text not null,
  source        text,
  url           text,
  official      boolean not null default false,
  significance  significance not null default 'medium',
  published_at  date,                           -- the story's date (null = undated)
  status        filing_status not null default 'new',
  edition_id    uuid,                           -- set when merged into an edition
  filed_at      timestamptz not null default now()
);

-- de-dupe guard: one filing per url per newsroom. A FULL unique constraint
-- (not a partial index) — NULLs are distinct by default, so multiple null-url
-- filings are allowed and real URLs still dedupe, AND it can serve as the
-- arbiter for upsert's ON CONFLICT (newsroom_id, url). A partial index cannot
-- (Postgres 42P10: no unique constraint matching the ON CONFLICT spec).
alter table filings
  add constraint filings_newsroom_url_uniq unique (newsroom_id, url);

-- --- editions (drafts → published articles) ---------------------------------
create table if not exists editions (
  id           uuid primary key default gen_random_uuid(),
  newsroom_id  uuid not null references newsrooms (id) on delete cascade,
  title        text not null,                   -- "Morning Edition", etc.
  slug         text not null,                   -- per-newsroom unique read path
  status       edition_status not null default 'draft',
  body         text,                            -- assembled markdown
  board_review jsonb,                           -- editorial board findings
  signed_off_by uuid references auth.users (id),
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

create unique index if not exists editions_newsroom_slug_uniq
  on editions (newsroom_id, slug);

-- --- desk runs (token-budget ledger) ----------------------------------------
create table if not exists desk_runs (
  id            uuid primary key default gen_random_uuid(),
  newsroom_id   uuid not null references newsrooms (id) on delete cascade,
  beat_id       uuid references beats (id) on delete set null,
  model         text not null,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  filed_count   integer not null default 0,
  ran_at        timestamptz not null default now()
);

-- ============================================================================
-- Row-level security: a user sees only rows belonging to a newsroom they own.
-- ============================================================================
alter table newsrooms enable row level security;
alter table beats     enable row level security;
alter table filings   enable row level security;
alter table editions  enable row level security;
alter table desk_runs enable row level security;

-- helper: does the current user own this newsroom?
-- SECURITY DEFINER with a pinned empty search_path (prevents search_path
-- hijacking); all references fully-qualified. EXECUTE is granted only to
-- authenticated (the child-table RLS policies call it); PUBLIC/anon revoked.
create or replace function owns_newsroom(nid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.newsrooms n
    where n.id = nid and n.owner_id = (select auth.uid())
  );
$$;

revoke execute on function public.owns_newsroom(uuid) from public;
revoke execute on function public.owns_newsroom(uuid) from anon;
grant execute on function public.owns_newsroom(uuid) to authenticated;

-- newsrooms: owner-only, plus public read of public newsrooms
drop policy if exists newsrooms_owner_all on newsrooms;
create policy newsrooms_owner_all on newsrooms
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists newsrooms_public_read on newsrooms;
create policy newsrooms_public_read on newsrooms
  for select using (is_public = true);

-- child tables: gated by newsroom ownership
drop policy if exists beats_owner_all on beats;
create policy beats_owner_all on beats
  for all using (owns_newsroom(newsroom_id)) with check (owns_newsroom(newsroom_id));

drop policy if exists filings_owner_all on filings;
create policy filings_owner_all on filings
  for all using (owns_newsroom(newsroom_id)) with check (owns_newsroom(newsroom_id));

drop policy if exists editions_owner_all on editions;
create policy editions_owner_all on editions
  for all using (owns_newsroom(newsroom_id)) with check (owns_newsroom(newsroom_id));

drop policy if exists desk_runs_owner_all on desk_runs;
create policy desk_runs_owner_all on desk_runs
  for all using (owns_newsroom(newsroom_id)) with check (owns_newsroom(newsroom_id));

-- public read of PUBLISHED editions in PUBLIC newsrooms (for /read/<slug>)
drop policy if exists editions_public_read on editions;
create policy editions_public_read on editions
  for select using (
    status = 'published'
    and exists (
      select 1 from newsrooms n
      where n.id = editions.newsroom_id and n.is_public = true
    )
  );
