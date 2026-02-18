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
├── specs/                     # Framework specification documents
│   └── SPEC.md               # Persona-x specification
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
│   ├── llm/                   # LLM integration (Anthropic SDK)
│   │   ├── client.ts          # API client, retry logic, JSON extraction
│   │   ├── discovery-llm.ts   # LLM-driven discovery questioning
│   │   ├── population-llm.ts  # LLM-driven section population
│   │   └── panel-llm.ts       # LLM-driven panel discussions
│   ├── decision-engine/       # Opportunity evaluation pipeline
│   │   ├── schema.ts          # Decision Engine Zod schemas
│   │   └── pipeline.ts        # 4-stage pipeline (Propose → Challenge → Prototype → Execute)
│   ├── cli/                   # Command-line interface
│   │   ├── index.ts           # CLI entry point
│   │   ├── create.ts          # CREATE command flow
│   │   └── refine.ts          # REFINE command flow
│   ├── runtime/               # Panel runtime interface
│   │   ├── loader.ts          # Persona file loading & hydration
│   │   ├── panel.ts           # Panel simulation engine
│   │   └── interface.ts       # Runtime contract types
│   └── utils/                 # Shared utilities
│       ├── yaml.ts            # YAML serialisation/deserialisation
│       └── version.ts         # Semantic versioning for personas
├── examples/                  # Example persona files
│   ├── risk-analyst.yaml      # Sample persona definition file
│   └── engine/                # Decision Engine evaluation personas
│       ├── ethical-boundary-guardian.yaml
│       ├── failure-archaeologist.yaml
│       ├── opportunity-architect.yaml
│       └── sceptical-investor.yaml
├── website/                   # GitHub Pages site
│   └── index.html             # Landing page
├── scripts/                   # Utility scripts
│   └── enable-pages.sh        # GitHub Pages setup
├── docs/                      # Strategic documentation
│   ├── EXECUTIVE-OVERVIEW.md  # Executive summary
│   ├── GRC-USE-CASES.md       # Governance/risk/compliance use cases
│   ├── PERSONAL-USE-CASES.md  # Personal use cases
│   ├── SMALL-BUSINESS-USE-CASES.md  # Small business use cases
│   ├── UNTAPPED-MARKETS.md    # High-strategy market categories
│   ├── DECISION-ENGINE.md     # Meta-framework for prioritisation
│   └── BUILD-PROMPT.md        # Build prompt for new sessions
└── tests/                     # Test suites
    ├── schema/                # Schema validation tests
    ├── engine/                # Engine logic tests
    ├── llm/                   # LLM client tests
    ├── decision-engine/       # Decision Engine tests
    └── runtime/               # Runtime tests
```

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
| `npm run test:run` | Run tests once without watch mode |
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

## Important Notes for AI Assistants

1. **Persona-x creates judgement/reasoning profiles, not voice/tone profiles.** Voice profiling is a separate system. This repo implements persona creation only.
2. **The rubric is sacred.** The six dimensions, their names, their 1-10 scale, and the requirement for interpretive notes are non-negotiable.
3. **Population order is fixed.** Never generate later sections before earlier ones. Never allow later sections to contradict earlier ones silently.
4. **Persona files are artefacts, not conversations.** Changes must be explicit, scoped, versioned, and traceable.
5. **Inference is conservative.** When in doubt, ask. Only infer when multiple signals converge and consistency is maintained.
6. **Australian English** is the spelling standard for all user-facing output.
