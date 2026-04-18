---
name: run-panel
description: Run a Persona-x panel discussion across multiple persona YAML files. Invoke when the user wants to simulate a structured debate between several personas on a topic, or exercise their persona library to see how different judgement profiles respond.
---

# run-panel

Drive multiple personas through a multi-round discussion using the Persona-x
panel runtime. Each persona's rubric shapes their contributions; the runtime
orders speakers by intervention frequency and silences low-intervention
personas on middle rounds.

## When to invoke

- User asks to "run a panel", "simulate a discussion", or "have the personas
  debate X"
- User has two or more persona YAML files and wants to see them respond to
  a topic in turn
- User wants to stress-test a persona's reasoning against other perspectives

## How to run

### With LLM (real discussion)

```bash
npm run panel -- <persona-1.yaml> <persona-2.yaml> [more...] \
  --topic "The topic to discuss" \
  --rounds 3 \
  --output ./panels/$(date +%s).md
```

Provider is selected via `PERSONA_X_PROVIDER` (default: `ollama`).
The `--output` flag writes the formatted transcript to a Markdown file.

### Dry run (no LLM, just prompts)

```bash
npm run panel -- <persona-1.yaml> <persona-2.yaml> --dry-run
```

Loads the personas, determines speaking order, prints the system prompts.
Useful for checking who-speaks-when before spending tokens.

## Speaking order rules

- Personas with higher `intervention_frequency` (1-10) speak earlier in each
  round
- Low-intervention personas (1-3) contribute only to round 1
- Medium (4-7) contribute on round 1 and even rounds
- High (8-10) contribute every round

## What to report back

- Speaking order chosen by the runtime
- Provider + model in use
- If any personas failed to load, list the files and errors
- The output path if `--output` was used

## Do not

- Do not pass the user's API keys or credentials on the command line; rely on
  environment variables (`ANTHROPIC_API_KEY`, `PERSONA_X_OAI_API_KEY`, etc.)
- Do not run more than `--rounds 5` without user confirmation — it's easy to
  rack up tokens
