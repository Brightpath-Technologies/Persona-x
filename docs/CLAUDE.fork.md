# CLAUDE.md — Fork Template

Copy this file to your forked repo's root as `CLAUDE.md` after forking.
It's a self-contained development guide tuned for the improvements added
on `claude/enable-fireworks-tech-graph-6bUb8`: provider abstraction,
panel runtime, generic graph module, Claude Code skills, and provenance
tracking.

---

# CLAUDE.md — <your-project-name>

## Project Overview

A TypeScript framework for creating, validating, and running structured
AI persona definition files. Forked from Persona-x with a trust-first
LLM architecture (local Ollama by default), a generic graph utility,
and Claude Code skill integration.

## Scripts

| Command | Purpose |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Run CLI through `tsx` (no build step) |
| `npm run create` | CREATE flow — guided persona creation |
| `npm run refine` | REFINE flow — incremental persona edits |
| `npm run validate <file>` | Schema-validate a persona YAML |
| `npm run panel <files...>` | Run a multi-persona panel discussion |
| `npm test` | Vitest in watch mode |
| `npm run test:run` | Vitest, single run |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |

## LLM Provider Selection

Choose the provider with `PERSONA_X_PROVIDER` (default: `ollama`).

### Local (Ollama) — default, zero-trust

```bash
ollama pull llama3.1
PERSONA_X_PROVIDER=ollama npm run create
```

No API key, no network egress. `PERSONA_X_OLLAMA_URL` overrides the
default `http://localhost:11434`. `PERSONA_X_MODEL` overrides the model.

### Anthropic

```bash
PERSONA_X_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-... npm run create
```

Uses ephemeral prompt caching on persona system prompts during panels
(≈90% cost reduction after the first request in a session).

### OpenAI-compatible (Fireworks, Together, Groq, self-hosted vLLM, …)

```bash
PERSONA_X_PROVIDER=openai-compatible \
  PERSONA_X_OAI_BASE_URL=https://api.example.com/inference \
  PERSONA_X_OAI_API_KEY=... \
  PERSONA_X_MODEL=model-id \
  npm run create
```

### Offline hard-block

Set `PERSONA_X_OFFLINE=1` to refuse any non-localhost URL regardless of
provider. Throws `OfflineViolationError` before the request fires.

## Claude Code Skills

Three skills live under `.claude/skills/` and can be invoked from any
Claude Code session in this repo:

- `/create-persona` — wraps `npm run create`
- `/validate-persona` — wraps `npm run validate`
- `/run-panel` — wraps `npm run panel`

Skills are plain Markdown with YAML front-matter; no MCP server required.

## Fixed Constraints (do not change)

### Rubric dimensions (six, in this order)

1. Risk Appetite
2. Evidence Threshold
3. Tolerance for Ambiguity
4. Intervention Frequency
5. Escalation Bias
6. Delivery vs Rigour Bias

Every score must have an interpretive note of at least 10 characters.

### Population order

`purpose → panel_role → rubric → reasoning → interaction → boundaries → optional`

Later sections must not contradict earlier ones.

### Ask-vs-infer rule

- Always ask for `purpose` and `boundaries`.
- Only infer other sections with 2+ high-confidence signals or 1 high + 1 medium.
- Never invent behaviour; inference keeps momentum, not substitutes for input.

## Australian English

All user-facing strings use Australian spelling: `behaviour`, `organisation`,
`licence`, `humour`, `colour`, `analyse`, `centre`.

## Provenance

Every generated section is recorded in `provenance.section_generation[]`
with provider, model, timestamp, method, and confidence. This is the audit
trail for "which LLM wrote what".

## Graph Module

A generic, persona-agnostic graph utility lives at `src/graph/` and is
exported as the `./graph` subpath. It has zero Persona-x imports — safe to
copy into another project verbatim.

## Fork Checklist

When you fork Persona-x:

1. Update `package.json` fields: `name`, `description`, `author`, `repository`.
2. Replace any `brightpath-technologies/persona-x` references in docs.
3. Update this `CLAUDE.md`'s project name and repo URLs.
4. Decide which LLM providers to keep — delete unwanted adapters under
   `src/llm/providers/` and remove their entries from `createClient()`.
5. Run `npm run format && npm run typecheck && npm run test:run && npm run lint`
   to confirm the fork is green.
6. Set up CI — `.github/workflows/ci.yml` is ready to use.
