---
name: validate-persona
description: Validate a Persona-x persona YAML file against the canonical schema. Invoke when the user wants to confirm a persona file is well-formed, catch broken fields, or check a persona before using it in a panel.
---

# validate-persona

Run the Persona-x VALIDATE command on a persona file and surface any schema
errors or coherence warnings.

## When to invoke

- User asks to "validate", "check", "verify", or "lint" a persona YAML
- Before running `/run-panel` on a persona the user just wrote by hand
- After editing a persona file outside the CLI flow

## How to run

```bash
npm run validate -- <path-to-persona.yaml>
```

Exit code 0 means valid. Non-zero means schema errors — the CLI prints
a bulleted list of fields and violations.

## What to report back

If validation **passes**:
- Confirm "Valid persona file: <name>"
- If there are coherence warnings (e.g. high risk appetite + high evidence
  threshold), list them so the user can decide whether to tighten the rubric
  notes

If validation **fails**:
- Show each error verbatim; do not paraphrase Zod messages
- Point to the field path so the user can find it quickly
- Offer to run `/refine-persona` to fix structured issues interactively

## Do not

- Do not edit the persona file as part of this skill
- Do not invent alternative schemas or relax validation rules — the six rubric
  dimensions and the minimum-length interpretive notes are non-negotiable
