---
name: create-persona
description: Create a new Persona-x persona definition file through guided discovery. Invoke when the user wants to build a structured AI persona (judgement profile, rubric, boundaries) from scratch. Supports both interactive LLM-driven flow and non-interactive example output.
---

# create-persona

Run the Persona-x CREATE flow to produce a validated persona YAML file.

## When to invoke

- User asks to "create a persona", "build a persona", or "add a new persona"
- User describes a kind of reviewer, challenger, or decision-maker they want
  to codify as a reusable artefact
- User wants a persona file they can drop into a panel

## When NOT to invoke

- User wants to change an existing persona — use `/refine-persona` instead
- User only wants to check whether a YAML file is valid — use `/validate-persona`
- User wants a character, role-play persona, or voice profile — Persona-x creates
  judgement/reasoning profiles only

## How to run

### Interactive (LLM-driven, recommended)

```bash
npm run create -- --output ./my-persona.yaml
```

The flow walks through: initial purpose → discovery questions → section
population (purpose → panel_role → rubric → reasoning → interaction →
boundaries → optional) → review → write.

The active LLM provider is selected via `PERSONA_X_PROVIDER`:
- `ollama` (default) — local, no API key, no network egress
- `anthropic` — requires `ANTHROPIC_API_KEY`
- `openai-compatible` — requires `PERSONA_X_OAI_BASE_URL`, `PERSONA_X_OAI_API_KEY`, `PERSONA_X_MODEL`

Set `PERSONA_X_OFFLINE=1` to hard-block any non-localhost request regardless
of provider.

### Non-interactive (example output, no LLM)

```bash
npm run create -- --non-interactive --output ./example.yaml
```

## After the skill runs

1. Inspect the generated YAML — every rubric dimension must have an
   interpretive note of at least 10 characters.
2. Run `/validate-persona` on the output to confirm schema conformance.
3. Offer to run `/run-panel` with the new persona and any existing ones.
