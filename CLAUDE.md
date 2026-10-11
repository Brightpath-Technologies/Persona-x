# CLAUDE.md — Persona-x Development Guide

## Project Overview

Persona-x is a TypeScript framework for creating, validating, refining, and running structured AI persona definition files that can be consumed by panel-based and orchestrated AI systems.

The system turns implicit judgement into explicit, comparable, inspectable persona artefacts.

### Core Concepts

- **Persona Definition File**: A structured YAML document defining how a persona thinks, reasons, judges, and behaves. Not a character or role-play construct — a governed design artefact.
- **Panel**: A multi-agent discussion system where multiple personas debate, review, or analyse a topic. Personas are deliberately invoked based on what functional contribution is needed.
- **Rubric**: Six quantified dimensions (1-10 scale) that define the shape of a persona's judgement. Makes personas comparable without narrative.
- **Population Pipeline**: A fixed-order state machine that builds persona files section by section, using direct input, structured choices, scenario interpretation, or conservative inference.

## Repository Structure

```
Persona-x/
├── CLAUDE.md                  # This file — development guide
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vitest.config.ts           # Test configuration
├── specs/                     # Core framework specification
│   └── SPEC.md               # Persona-x specification
├── docs/                      # Core framework documentation
│   ├── EXECUTIVE-OVERVIEW.md  # Non-technical overview of Persona-x
│   ├── DECISION-ENGINE.md     # Structured pipeline for evaluating opportunities
│   ├── BUILD-PROMPT.md        # Technical implementation guidance
│   ├── PERSONAL-USE-CASES.md  # 20 personal/life decision use cases
│   ├── SMALL-BUSINESS-USE-CASES.md  # 20 small business use cases
│   ├── GRC-USE-CASES.md       # 10 governance/risk/compliance use cases
│   └── UNTAPPED-MARKETS.md    # 20 additional market categories
├── solutions/                 # Derivative products built on Persona-x
│   └── personal-board-of-directors/
│       ├── BRD.md             # Business Requirements Document
│       └── PRODUCT-SPEC.md    # Product Specification
├── src/
│   ├── index.ts               # Library entry point (exports)
│   ├── schema/                # Persona file schema & validation
│   │   ├── persona.ts         # Zod schema + TypeScript types
│   │   ├── rubric.ts          # Rubric dimensions & scoring
│   │   └── knowledge-base.ts  # Optional knowledge base schema
│   ├── engine/                # Core persona creation engine
│   │   ├── discovery/         # Signal extraction & questioning
│   │   │   └── discovery.ts   # Discovery state machine
│   │   ├── population/        # Section population pipeline
│   │   │   └── pipeline.ts    # Fixed-order population logic
│   │   ├── rubric/            # Rubric scoring engine
│   │   │   └── scorer.ts      # Score calculation & interpretive notes
│   │   ├── inference/         # Ask-vs-infer decision logic
│   │   │   └── inference.ts   # Inference engine with confidence
│   │   └── engine.ts          # Main engine orchestrator
│   ├── cli/                   # Command-line interface
│   │   ├── index.ts           # CLI entry point
│   │   ├── create.ts          # CREATE command flow
│   │   └── refine.ts          # REFINE command flow
│   ├── runtime/               # Panel runtime interface
│   │   ├── loader.ts          # Persona file loading & hydration
│   │   ├── panel.ts           # Panel simulation engine
│   │   ├── interface.ts       # Runtime contract types
│   │   └── session.ts         # Session persistence (save/load/replay/compare)
│   └── utils/                 # Shared utilities
│       ├── yaml.ts            # YAML serialisation/deserialisation
│       └── version.ts         # Semantic versioning for personas
├── examples/                  # Example persona files
│   ├── risk-analyst.yaml      # Sample persona definition file
│   └── engine/                # All 16 Decision Engine personas (Stages 1–4)
└── tests/                     # Test suites
    ├── schema/                # Schema validation tests
    ├── engine/                # Engine logic tests
    ├── cli/                   # CLI integration tests
    └── runtime/               # Runtime tests
```

## Solutions (Derivative Products)

The `solutions/` directory contains derivative products and custom solutions built on the Persona-x framework. Each solution is a consumer-facing or market-specific application that consumes the core framework (persona schema, panel runtime, creation engine) without modifying it.

### Directory Convention

Each solution gets its own folder under `solutions/` containing at minimum:

| File | Purpose |
|---|---|
| `BRD.md` | Business Requirements Document — market analysis, monetisation, go-to-market |
| `PRODUCT-SPEC.md` | Product Specification — architecture, features, personas, user journeys, roadmap |

Solutions may also include additional documentation, persona YAML files, or implementation code as needed.

### Relationship to Core Framework

```
solutions/<solution-name>/     ← derivative product docs and assets
    │
    │ consumes
    ▼
specs/SPEC.md                  ← persona schema, rubric, panel runtime contract
src/                           ← framework implementation
docs/                          ← core framework research and use case analysis
```

- Solutions **consume** the framework — they do not modify `specs/`, `src/`, or `docs/`.
- Core `docs/` contains framework-level research (use cases, market analysis, decision engine) that solutions may reference.
- Persona YAML files created for a solution must validate against the schema in `src/schema/persona.ts`.

### Current Solutions

| Solution | Description | Status |
|---|---|---|
| **Personal Board of Directors** | Consumer subscription product — 8 pre-built advisor personas for career, life, and business decisions | Next.js web app production hardened — 8 personas, 5 API routes, structured error handling, `lang="en-AU"` |

## Personal Board of Directors Web App

The web app lives in `solutions/personal-board-of-directors/web/` and is a Next.js 15 app with Tailwind CSS v3.

### Tailwind CSS Cache Issue

When changing CSS variables or Tailwind color definitions in `globals.css` or `tailwind.config.ts`, the Next.js dev server caches stale compiled CSS. Changes to CSS variable values (e.g. switching color palettes) will appear to have no effect until the cache is cleared.

**Fix:** Delete `.next/` and restart the dev server:

```bash
rm -rf solutions/personal-board-of-directors/web/.next
cd solutions/personal-board-of-directors/web && npm run dev
```

This is required whenever `globals.css` CSS variable values or `tailwind.config.ts` color definitions change. Hot reload alone is not sufficient for these changes.

### Web App Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build (must pass with zero errors) |
| `npm run lint` | Run ESLint |

## Development Workflow

### Setup

```bash
npm install
```

### Scripts

| Command | Purpose |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Run CLI in development mode with ts-node |
| `npm test` | Run all tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run typecheck` | Run `tsc --noEmit` for type checking |
| `npm run create` | Run the CREATE persona flow |
| `npm run refine` | Run the REFINE persona flow |
| `npm run validate` | Validate a persona YAML file against schema |

### Build & Type Check

```bash
npm run build        # must pass with zero errors
npm run typecheck    # must pass with zero errors
```

### Testing

```bash
npm test             # run all tests
npm test -- --run    # run once without watch
```

Tests live alongside the code they test under `tests/`. Test files follow the pattern `*.test.ts`.

## Architecture Conventions

### Schema-First Design

All data structures are defined as Zod schemas in `src/schema/`. TypeScript types are inferred from these schemas. No manual type definitions that duplicate schema information.

```typescript
// Define schema
export const PersonaPurposeSchema = z.object({ ... });

// Infer type
export type PersonaPurpose = z.infer<typeof PersonaPurposeSchema>;
```

### Fixed Population Order

The population pipeline in `src/engine/population/pipeline.ts` MUST follow this order:

1. Persona Purpose & Panel Use
2. Panel Role & Functional Contribution
3. Judgement & Reasoning Profile (Rubric)
4. Reasoning & Decision Tendencies
5. Interaction & Challenge Style
6. Boundaries, Constraints & Refusals
7. Optional sections (Communication, Knowledge Base, Provenance)

Later sections must not contradict earlier ones without explicit confirmation.

### Rubric Dimensions (Fixed)

The six rubric dimensions in `src/schema/rubric.ts` are fixed and must not be renamed or reordered:

1. Risk Appetite (1-10)
2. Evidence Threshold (1-10)
3. Tolerance for Ambiguity (1-10)
4. Intervention Frequency (1-10)
5. Escalation Bias (1-10)
6. Delivery vs Rigour Bias (1-10)

Every score MUST have an accompanying interpretive note. Scores without notes are invalid.

### Inference Rules

The inference engine (`src/engine/inference/`) follows the ask-vs-infer contract:

- **Must ask** when: ambiguity would materially change persona behaviour, or a boundary/refusal/escalation posture is unclear.
- **May infer** when: multiple signals point the same direction AND inference maintains consistency with earlier sections.
- Inference is for momentum, not invention.

### Error Handling

- Schema validation errors must be specific (which field, what constraint, what value).
- LLM failures should be retried with exponential backoff (3 attempts max).
- Never silently drop or merge persona data.

## Code Style

- **TypeScript strict mode** enabled (`strict: true` in tsconfig)
- **Australian English** in user-facing strings (behaviour, organisation, licence, humour)
- **No default exports** — use named exports throughout
- **Explicit return types** on public functions
- **No classes for data** — use plain objects with Zod validation
- **Classes for stateful engines** — state machines, pipelines, CLI flows
- Prefer `const` over `let`. Never use `var`.
- Use template literals over string concatenation

## Key Dependencies

| Package | Purpose |
|---|---|
| `zod` | Schema definition and runtime validation |
| `@anthropic-ai/sdk` | Claude API integration for LLM-driven persona creation |
| `yaml` | YAML parsing and serialisation |
| `commander` | CLI command framework |
| `inquirer` | Interactive terminal prompts |
| `chalk` | Terminal output styling |
| `vitest` | Test runner |
| `typescript` | Language compiler |
| `eslint` | Code linting |
| `prettier` | Code formatting |

## Persona File Format

Persona files are stored as YAML. The canonical schema is in `src/schema/persona.ts`. Example structure:

```yaml
metadata:
  name: "Risk-Aware Analyst"
  type: designed          # designed | human-derived
  owner: "Jane Smith"
  version: "1.0.0"
  last_updated: "2026-02-13"
  audience: "Panel tools, orchestration agents"

purpose:
  description: "..."
  invoke_when: ["..."]
  do_not_invoke_when: ["..."]

bio:
  background: "..."
  perspective_origin: "..."

panel_role:
  contribution_type: "challenger"
  expected_value: "..."
  failure_modes_surfaced: ["..."]

rubric:
  risk_appetite:
    score: 3
    note: "..."
  evidence_threshold:
    score: 8
    note: "..."
  # ... (all 6 dimensions required)

reasoning:
  default_assumptions: ["..."]
  notices_first: ["..."]
  systematically_questions: ["..."]
  under_pressure: "..."

interaction:
  primary_mode: "questions"  # questions | assertions | mixed
  challenge_strength: "moderate"
  silent_when: ["..."]
  handles_poor_input: "..."

boundaries:
  will_not_engage: ["..."]
  will_not_claim: ["..."]
  defers_by_design: ["..."]

invocation:
  include_when: ["..."]
  exclude_when: ["..."]
```

## Git Conventions

- Branch naming: `claude/<description>-<session-id>`
- Commit messages: imperative mood, concise, focused on "why"
- No force pushes to main
- Push with `-u origin <branch-name>`

## Phase 2 — Current Work

**Read `docs/PHASE2-WORKPLAN.md` for the authoritative list of what is built and what remains.**

The workplan supersedes the "What Is NOT Built Yet" section in `docs/BUILD-PROMPT.md` where they conflict. Use the `/phase2` command to load context and check build health before starting work. Use `/status` to verify all four gate commands pass.

**Phase 2 complete.** All 16 engine persona YAML files exist and validate. Decision Engine runner (`src/decision-engine/runner.ts`) wires pipeline to panel runtime and LLM. Session persistence ships in `src/runtime/session.ts` (save/load/replay/compare). PBoD web app is production hardened with structured error handling and `lang="en-AU"`. 130 tests passing across 9 test files.

## Important Notes for AI Assistants

1. **Persona-x creates judgement/reasoning profiles, not voice/tone profiles.** Voice profiling is a separate system. This repo implements persona creation only.
2. **The rubric is sacred.** The six dimensions, their names, their 1-10 scale, and the requirement for interpretive notes are non-negotiable.
3. **Population order is fixed.** Never generate later sections before earlier ones. Never allow later sections to contradict earlier ones silently.
4. **Persona files are artefacts, not conversations.** Changes must be explicit, scoped, versioned, and traceable.
5. **Inference is conservative.** When in doubt, ask. Only infer when multiple signals converge and consistency is maintained.
6. **Australian English** is the spelling standard for all user-facing output.
7. **Separate framework from solutions.** Core framework docs belong in `docs/` and `specs/`. Derivative product documentation (BRDs, product specs, solution-specific personas) belongs in `solutions/<solution-name>/`. Never place solution-specific content in the core directories.
8. **Solutions consume, not modify.** Derivative products built on Persona-x must work within the framework's existing schema, rubric, and runtime contract. If a solution requires framework changes, those changes belong in `specs/` and `src/` as framework enhancements, not in the solution directory.
