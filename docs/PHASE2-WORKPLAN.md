# Phase 2 Workplan — Persona-x

> **Last updated:** 28 February 2026
> **Source of truth for Phase 2 priorities.** This supersedes the "What Is NOT Built Yet" section of `docs/BUILD-PROMPT.md` where the two conflict.

## Current State (Verified)

**Build health:** All four gate commands pass.

| Command | Status |
|---|---|
| `npm run build` | ✅ Passing |
| `npm run typecheck` | ✅ Passing |
| `npx vitest run` | ✅ 130 tests passing (9 test files) |
| `npm run lint` | ✅ Passing |

**PBoD web app:** `cd solutions/personal-board-of-directors/web && npm run build` ✅ Passing

### What IS Built

| Component | Files | Status |
|---|---|---|
| **Core schemas** | `src/schema/persona.ts`, `rubric.ts`, `knowledge-base.ts` | Complete — all 10 persona sections, 6 rubric dimensions, knowledge base |
| **Discovery engine** | `src/engine/discovery/discovery.ts` | Complete — 5-signal extraction, 10-question bank, sufficiency rules |
| **Population pipeline** | `src/engine/population/pipeline.ts` | Complete — fixed-order 7-section builder |
| **Inference engine** | `src/engine/inference/inference.ts` | Complete — Ask vs Infer rules enforced |
| **Rubric scorer** | `src/engine/rubric/scorer.ts` | Complete — signal-to-score translation |
| **Engine orchestrator** | `src/engine/engine.ts` | Complete — 4-phase state machine |
| **LLM client** | `src/llm/client.ts` | Complete — Anthropic SDK wrapper, retry with exponential backoff (3 max), JSON extraction |
| **LLM discovery** | `src/llm/discovery-llm.ts` | Complete — signal extraction, purpose extraction, conversational question generation |
| **LLM population** | `src/llm/population-llm.ts` | Complete — section generation via LLM with Zod validation |
| **LLM panel** | `src/llm/panel-llm.ts` | Complete — panel discussion via LLM |
| **CLI create** | `src/cli/create.ts` | Wired — imports LLM client, discovery-llm, population-llm. Interactive flow functional. |
| **CLI refine** | `src/cli/refine.ts` | Wired — imports LLM client, uses `sendMessageForJSON` for refinement |
| **CLI index** | `src/cli/index.ts` | Complete — 4 commands (create, refine, validate, panel) |
| **Panel runtime** | `src/runtime/panel.ts`, `interface.ts`, `loader.ts` | Complete — persona loading, system prompt generation, speaking order, contribution rules |
| **Session persistence** | `src/runtime/session.ts` | Complete — `SessionRecordSchema`, save/load YAML, replay, compare |
| **Decision Engine schemas** | `src/decision-engine/schema.ts` | Complete — Zod schemas for all 4 stages, evaluation dimensions, gate checking |
| **Decision Engine pipeline** | `src/decision-engine/pipeline.ts` | Complete — state machine, stage panels, audit trail with transcripts, kill criteria, gate logic |
| **Decision Engine runner** | `src/decision-engine/runner.ts` | Complete — `runStage`, `runDecisionEngine`; wires pipeline to panel runtime and LLM |
| **Engine personas (16/16)** | `examples/engine/` | All 16 YAML files complete and validated. All 4 stages covered. |
| **Derivative solution: PBoD** | `solutions/personal-board-of-directors/` | BRD + Product Spec + Next.js web app with 8 personas, 5 API routes, 9 components — production hardened |
| **Strategic docs** | `docs/` | All 7 documents complete (Executive Overview, GRC, Small Business, Personal, Untapped Markets, Decision Engine, Build Prompt) |
| **Website** | `website/`, `index.html` | Marketing site with assets |
| **Example persona** | `examples/risk-analyst.yaml` | Complete reference persona |

### Phase 2 Priorities — All Complete

| Priority | Description | Status |
|---|---|---|
| 1 | Complete engine persona YAML files (12 remaining) | ✅ Done — all 16 personas exist and validate |
| 2 | Wire Decision Engine to Panel Runtime | ✅ Done — `src/decision-engine/runner.ts`, 19 integration tests |
| 3 | Panel Discussion Persistence | ✅ Done — `src/runtime/session.ts`, 34 tests |
| 4 | Personal Board of Directors — Production Readiness | ✅ Done — build passes, error handling hardened, `lang="en-AU"` |

### Engine Personas (16/16)

| Stage | Persona | File |
|---|---|---|
| 1: Propose | Opportunity Architect | `examples/engine/opportunity-architect.yaml` |
| 1: Propose | Market Realist | `examples/engine/market-realist.yaml` |
| 1: Propose | Societal Impact Assessor | `examples/engine/societal-impact-assessor.yaml` |
| 1: Propose | Technical Feasibility Analyst | `examples/engine/technical-feasibility-analyst.yaml` |
| 2: Challenge | Sceptical Investor | `examples/engine/sceptical-investor.yaml` |
| 2: Challenge | Failure Archaeologist | `examples/engine/failure-archaeologist.yaml` |
| 2: Challenge | Ethical Boundary Guardian | `examples/engine/ethical-boundary-guardian.yaml` |
| 2: Challenge | Customer Devil's Advocate | `examples/engine/customer-devils-advocate.yaml` |
| 3: Prototype | Product Architect | `examples/engine/product-architect.yaml` |
| 3: Prototype | User Experience Advocate | `examples/engine/user-experience-advocate.yaml` |
| 3: Prototype | Revenue Model Analyst | `examples/engine/revenue-model-analyst.yaml` |
| 3: Prototype | Build vs Buy Pragmatist | `examples/engine/build-vs-buy-pragmatist.yaml` |
| 4: Execute | Delivery Realist | `examples/engine/delivery-realist.yaml` |
| 4: Execute | Risk Sentinel | `examples/engine/risk-sentinel.yaml` |
| 4: Execute | Market Entry Strategist | `examples/engine/market-entry-strategist.yaml` |
| 4: Execute | Operations Scaler | `examples/engine/operations-scaler.yaml` |

## Non-Negotiable Constraints

These apply to ALL work. Violations require Decision Engine escalation.

| Constraint | Rule |
|---|---|
| Six rubric dimensions | Names, order, 1–10 scale, mandatory interpretive notes are fixed |
| Population order | Purpose → panel_role → rubric → reasoning → interaction → boundaries → optional |
| Australian English | All user-facing strings: behaviour, organisation, licence, humour |
| Schema-first | Define Zod schemas, derive TypeScript types via `z.infer<>` |
| No default exports | Named exports throughout all source files |
| Conservative inference | When in doubt, ask. Only infer when 2+ signals converge |
| TypeScript strict mode | `strict: true` in tsconfig.json |
| LLM retry policy | Exponential backoff, 3 attempts max |
| Git conventions | Branch: `claude/<description>-<session-id>`, imperative commit messages |

## Development Workflow

1. Read `CLAUDE.md` and this workplan before writing any code
2. Read `docs/DECISION-ENGINE.md` before making prioritisation decisions
3. Read the relevant source files before modifying them
4. Run `npm test` after every meaningful change
5. Run `npm run typecheck` before committing
6. Commit with clear messages in imperative mood
7. Push to working branch with `git push -u origin <branch-name>`

## Reference Documents

| Document | Purpose |
|---|---|
| `CLAUDE.md` | Architecture rules, code conventions, non-negotiable constraints |
| `specs/SPEC.md` | Full framework specification v2.0-draft |
| `docs/DECISION-ENGINE.md` | 4-stage pipeline, 16 personas, gating criteria, kill rules |
| `docs/BUILD-PROMPT.md` | Original build prompt (NOTE: "What Is NOT Built Yet" section is stale — this workplan is current) |
| `docs/UNTAPPED-MARKETS.md` | 20 high-strategy market categories — 8 scored 10/10 |
