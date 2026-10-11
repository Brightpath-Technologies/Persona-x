# The Newsroom

> ⚠️ **MOVED — frozen copy.** This app now lives in its own repo:
> **https://github.com/victorycross/Brightpath_Intelligence**. Do future work
> there; this copy is kept for history only (see `../MOVED.md`).

> Run your own AI research desk. You're the Editor-in-Chief: hire **desks**,
> assign **beats**, read **the wire**, and put **editions** to bed. Nothing
> reaches an audience until you sign off.

A solution in the **persona-x** monorepo, deployed as its own app to
`newsroom.brightpathtechnology.io`. Reuses the persona-x engine personas as the
**editorial board**.

## The loop

```
Beats (topics)
  └─ each staffed by a Desk (an agent brief: window, floor, model)
       └─ desks research the live web (Anthropic web_search) and FILE stories
            └─ The Wire  (file it · spike it · assemble)
                 └─ Edition (draft, markdown)
                      └─ Editorial board (persona-x) reviews — publish/hold/revise
                           └─ Editor-in-Chief signs off → Published article
                                └─ Public front page + RSS (optional, per newsroom)
```

## Signature features

- **Editorial board (persona-x).** Engine personas (`personas/board/`) challenge
  each draft edition before it can publish — the human-in-the-loop quality gate.
- **Scheduled auto-editions.** A Vercel Cron hits `/api/cron/editions` on the
  print cycle; every active desk files and a DRAFT edition is assembled for
  sign-off. Nothing publishes automatically.
- **Public front page + syndication.** Toggle a newsroom public to expose
  `/read/<slug>` and `/read/<slug>/rss`.
- **Multi-newsroom workspaces.** One Editor-in-Chief, many newsrooms (e.g. one
  per client), each with its own beats, masthead, and budget.
- **Token-budget cockpit.** Desk runs are priced (Opus/Sonnet/Haiku) and shown
  against the newsroom's monthly budget — desks cost "column inches".

## Stack

- Next.js 15 (App Router) + Tailwind v3, dark.
- Supabase — auth (magic link) + Postgres + RLS (per-user isolation).
- Anthropic API — `claude-opus-4-8` desks with the `web_search_20260209` server
  tool; editorial board on the same model.

## Architecture

| Path | What |
|---|---|
| `lib/desk-engine.ts` | A desk researches a beat via web search → JSON filings |
| `lib/wire-editor.ts` | Pure collate/rank/assemble (port of the local jq editor) |
| `lib/editorial-board.ts` | persona-x personas review a draft edition |
| `lib/personas.ts` | Loads `personas/board/*.yaml` |
| `lib/pricing.ts` | Token-cost model for the budget cockpit |
| `app/api/desks/run` | Run one desk, file to the wire |
| `app/api/editions/run` | Assemble the wire into a draft edition |
| `app/api/editions/[id]/review` | Convene the editorial board |
| `app/api/editions/[id]/publish` | Sign off → publish |
| `app/api/cron/editions` | Scheduled auto-editions (CRON_SECRET) |
| `supabase/migrations/0001_init.sql` | Schema + RLS |

## Develop

```bash
npm install
# set env (see SETUP_MANUAL_STEPS.md), then:
npm run dev
npm run build      # must pass with zero type errors
```

See **SETUP_MANUAL_STEPS.md** for Supabase + Vercel one-time setup.
