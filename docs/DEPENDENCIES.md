# Dependency Trust Audit

This document catalogues every npm dependency Persona-x relies on, why it's
trusted, and what it does at runtime. It exists so you can make an informed
call about whether to keep, replace, or remove each package after forking
this repo.

Last reviewed: **2026-04-18**.

## Runtime dependencies

### `@anthropic-ai/sdk`
- **Purpose**: Official Anthropic SDK, used by the Anthropic LLM provider
  adapter in `src/llm/providers/anthropic.ts`.
- **Publisher**: Anthropic (verified npm publisher)
- **Network**: Makes HTTPS calls to `api.anthropic.com` only when the
  Anthropic provider is active. Defaults to Ollama mean no outbound calls.
- **Alternative if removed**: Delete `src/llm/providers/anthropic.ts` and
  drop `"anthropic"` from `ProviderName`. The Ollama and OpenAI-compatible
  adapters cover any hosted model you can run locally or via any other
  OpenAI-compatible endpoint.

### `chalk`
- **Purpose**: Terminal colour output for CLI feedback.
- **Publisher**: Sindre Sorhus (long-established open-source author)
- **Network**: None. Pure string formatting.
- **Alternative if removed**: Replace with ANSI escape codes inline; the
  CLI becomes plainer but the behaviour is identical.

### `commander`
- **Purpose**: CLI argument parser for `src/cli/index.ts`.
- **Publisher**: TJ Holowaychuk / the Commander.js team
- **Network**: None.
- **Alternative if removed**: Hand-roll `process.argv` parsing. Commander
  saves ~50 lines of boilerplate and is a de-facto standard for Node CLIs.

### `inquirer`
- **Purpose**: Interactive prompts during CREATE / REFINE flows.
- **Publisher**: Simon Boudrias
- **Network**: None. Pure terminal I/O over `readline`.
- **Alternative if removed**: Use Node's built-in `readline/promises` (which
  the current CLI does in several places already). Inquirer is nicer but
  replaceable.

### `yaml`
- **Purpose**: YAML parsing and serialisation for persona files.
- **Publisher**: Eemeli Aro
- **Network**: None. Pure text processing.
- **Alternative if removed**: `js-yaml` is equivalent; both have deep
  adoption. Replacement is a 10-line diff in `src/utils/yaml.ts`.

### `zod`
- **Purpose**: Schema definition and runtime validation for every
  persona artefact. Every field in a persona file is a Zod schema.
- **Publisher**: Colin McDonnell / the Zod team
- **Network**: None.
- **Alternative if removed**: None practical. Replacing Zod means
  re-writing the entire schema layer. Zod is load-bearing here.

## Development dependencies

### `@types/node`
- **Purpose**: TypeScript type definitions for Node built-ins.
- **Publisher**: DefinitelyTyped (npm scope `@types`)
- **Network**: None.

### `eslint`, `typescript-eslint`
- **Purpose**: Linting.
- **Publisher**: The ESLint team / TypeScript-ESLint team.
- **Network**: None at runtime.

### `prettier`
- **Purpose**: Code formatting.
- **Publisher**: The Prettier team.
- **Network**: None at runtime.

### `tsx`
- **Purpose**: TypeScript execution during development (the `dev` /
  `create` / `refine` / `panel` npm scripts all use it).
- **Publisher**: Hiroki Osame
- **Network**: None.

### `typescript`
- **Purpose**: Language compiler.
- **Publisher**: Microsoft
- **Network**: None at runtime.

### `vitest`
- **Purpose**: Test runner.
- **Publisher**: The Vitest team (part of the Vite ecosystem)
- **Network**: None except local dev server.

## Trust-first operation

For the strictest zero-trust setup:

1. Delete `src/llm/providers/anthropic.ts` and `@anthropic-ai/sdk` from
   `package.json`.
2. Keep Ollama as the only LLM provider; `createClient()` already defaults
   to it.
3. Set `PERSONA_X_OFFLINE=1` globally to hard-block any non-localhost URL.
4. Verify with: `PERSONA_X_OFFLINE=1 npm run create -- --non-interactive`.

## How to update this document

After bumping a dependency or adding a new one:

1. Update the entry (or add a new one) with name, version, publisher,
   network behaviour, and the removal fallback.
2. Update the "Last reviewed" date at the top.
3. Commit the change alongside the `package.json` / `package-lock.json` diff
   so the audit is traceable in git history.
