# Persona-x Build Prompt

> Copy everything below the line into a new Claude Code session to continue building.

---

## Context

You are continuing development on **Persona-x**, a TypeScript framework by Brightpath Technologies for creating, validating, and running structured AI persona definition files. The repository is at `github.com/Brightpath-Technologies/Persona-x`.

The framework is fully specified, the core engine is implemented, and strategic documentation is complete. Your job is to build derivative solutions and production capabilities on top of what exists.

## Repository State

Read these files first to understand what you are working with:

### Architecture & Rules (Read First)
- `CLAUDE.md` — Development guide, code conventions, architecture rules, and non-negotiable constraints (rubric dimensions, population order, Australian English, schema-first design)
- `specs/SPEC.md` — Full framework specification (v2.0-draft): creation engine behaviour, phase discipline, signal priority, sufficiency rules, panel runtime, error handling
- `package.json` — Dependencies, scripts, project metadata (v0.1.0)

### Implementation (Fully Built)
The entire core framework is implemented in TypeScript with Zod schemas:

| Layer | Files | What It Does |
|---|---|---|
| **Schema** | `src/schema/persona.ts`, `rubric.ts`, `knowledge-base.ts` | Zod schemas for all 10 persona sections, 6 rubric dimensions (1-10 + mandatory notes), optional knowledge base |
| **Discovery** | `src/engine/discovery/discovery.ts` | Signal extraction state machine — 5 priority signals, 10-question bank, sufficiency rules |
| **Population** | `src/engine/population/pipeline.ts` | Fixed-order section builder (purpose → panel_role → rubric → reasoning → interaction → boundaries → optional) |
| **Inference** | `src/engine/inference/inference.ts` | Ask vs Infer Rule — boundaries/purpose must be asked, others may infer when 2+ high-confidence signals converge |
| **Rubric Scoring** | `src/engine/rubric/scorer.ts` | Translates discovery signals into rubric scores with confidence resolution |
| **Engine** | `src/engine/engine.ts` | 4-phase orchestrator (discovery → population → review → complete) |
| **CLI** | `src/cli/index.ts`, `create.ts`, `refine.ts` | 4 commands (create, refine, validate, panel). LLM-driven interactive flows wired via `src/llm/` |
| **Panel Runtime** | `src/runtime/panel.ts`, `interface.ts`, `loader.ts` | Persona loading, system prompt generation, speaking order by intervention_frequency, contribution rules |
| **Utilities** | `src/utils/yaml.ts`, `version.ts` | YAML serialisation with validation, semantic versioning with change-type inference |
| **Exports** | `src/index.ts` | Library entry point — all public types, schemas, and functions |
| **LLM** | `src/llm/client.ts`, `discovery-llm.ts`, `population-llm.ts`, `panel-llm.ts` | Anthropic SDK integration with retry logic, JSON extraction, and LLM-driven discovery, population, and panel flows |
| **Decision Engine** | `src/decision-engine/schema.ts`, `pipeline.ts` | 4-stage evaluation pipeline (Propose → Challenge → Prototype → Execute) with Zod schemas and gating logic |
| **Tests** | `tests/schema/`, `tests/engine/`, `tests/llm/`, `tests/decision-engine/`, `tests/runtime/` | Test suites covering schema validation, discovery, pipeline, LLM client, decision engine, and panel runtime |
| **Example** | `examples/risk-analyst.yaml` | Complete persona definition file demonstrating all sections |

### Strategic Documentation (Complete)
These documents define what to build and how to decide:

| Document | What It Contains |
|---|---|
| `docs/EXECUTIVE-OVERVIEW.md` | How Persona-x works explained for executives — problem, solution, three stages (Create, Store, Run), rubric explanation, architecture diagram |
| `docs/GRC-USE-CASES.md` | 10 governance, risk, compliance & ERM use cases with full panel compositions and rubric scores |
| `docs/SMALL-BUSINESS-USE-CASES.md` | 20 web-based service ideas for sole proprietors serving small businesses — pricing models ($49-799), tiered packaging, revenue projections |
| `docs/PERSONAL-USE-CASES.md` | 20 personal life/leisure/creative use cases rated 1-5 for profitability and interest potential — subscription bundles ($7.99-39.99/mo) |
| `docs/UNTAPPED-MARKETS.md` | 20 high-strategy, high-profit market categories not covered elsewhere — 8 scored perfect 10/10 (AI system review, legal case strategy, M&A, clinical decision support, cybersecurity, construction, insurance, investment) |
| `docs/DECISION-ENGINE.md` | **The meta-framework** — 4-stage pipeline (Propose → Challenge → Prototype → Execute) with 16 purpose-built personas, quantified gating criteria, structured YAML output artefacts, kill/defer rules, and a 90-day feedback loop. This is how Persona-x decides what to build with Persona-x. |

### What Is NOT Built Yet
1. **Web Interface** — No web application exists. The framework is CLI-only.
2. **Persona Library** — No registry or marketplace for pre-built personas.
3. **Panel Discussion Persistence** — Panel sessions run in-memory. No storage, replay, or audit trail.
4. **Derivative Solutions** — The 70 use cases across the four market documents are specifications, not products.

## What to Build

Use `docs/DECISION-ENGINE.md` as the governing framework for prioritising work. Every build decision should pass through the Propose → Challenge → Prototype → Execute pipeline defined there.

### Immediate priorities (in suggested order):

**1. Build the First Derivative Solution**
- Pick the highest-scoring opportunity from the use case documents
- Run it through the Decision Engine (Stage 1-4)
- Build the prototype to the spec produced by Stage 3
- This proves the engine works by using it

**2. Panel Discussion Persistence**
- Store panel sessions as structured YAML or JSON
- Include full audit trail: which persona said what, which rubric dimensions influenced each response
- Enable replay and comparison across sessions

### Build commands:
```bash
npm run build        # must pass with zero errors
npm run typecheck    # must pass with zero errors
npm test             # 40 tests, all must pass
npm run lint         # must pass
```

### Non-negotiable constraints (from CLAUDE.md):
- **The six rubric dimensions are fixed.** Names, order, 1-10 scale, mandatory interpretive notes. Do not rename, reorder, or change the scale.
- **Population order is fixed.** Purpose → panel_role → rubric → reasoning → interaction → boundaries → optional. Later sections must not contradict earlier ones.
- **Australian English** for all user-facing strings (behaviour, organisation, licence, humour).
- **Schema-first.** Define Zod schemas, infer TypeScript types. No duplicate manual type definitions.
- **No default exports.** Named exports throughout.
- **Inference is conservative.** When in doubt, ask. Only infer when multiple signals converge.
- **TypeScript strict mode.** `strict: true` in tsconfig.

## How to Work

1. Read `CLAUDE.md` and `specs/SPEC.md` before writing any code
2. Read `docs/DECISION-ENGINE.md` before making prioritisation decisions
3. Read the relevant source files before modifying them
4. Run `npm test` after every meaningful change
5. Run `npm run typecheck` before committing
6. Commit with clear messages in imperative mood
7. Push to your working branch with `git push -u origin <branch-name>`

Start by reading the files listed above, then tell me what you plan to build first and why.
