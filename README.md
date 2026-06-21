# persona-x

A TypeScript framework for creating, validating, refining, and running structured AI persona definition files.

Turns implicit judgement into explicit, comparable, inspectable persona artefacts that can be consumed by panel-based and orchestrated AI systems.

## Why

Prompt-level persona instructions are invisible, inconsistent, and impossible to audit. Persona-x externalises the design of how an AI agent *reasons and judges* into a governed YAML artefact — versioned, validated against a fixed schema, and readable by humans and orchestrators alike.

## Install

Requires Node.js >= 20.

```bash
npm install
```

Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Build the CLI:

```bash
npm run build
```

## Use

### Create a persona

```bash
npm run create
```

The interactive flow asks targeted questions and produces a structured YAML persona file covering:

- Purpose and panel invocation rules
- Panel role and functional contribution
- Six-dimension rubric (Risk Appetite, Evidence Threshold, Tolerance for Ambiguity, Intervention Frequency, Escalation Bias, Delivery vs Rigour Bias)
- Reasoning tendencies, interaction style, and boundaries

### Validate an existing persona

```bash
npm run validate -- examples/risk-analyst.yaml
```

### Refine a persona

```bash
npm run refine
```

### Run tests

```bash
npm test
```

### Type check

```bash
npm run typecheck
```

## Persona file format

Persona files are YAML documents. See [`examples/risk-analyst.yaml`](examples/risk-analyst.yaml) for a complete example and [`specs/SPEC.md`](specs/SPEC.md) for the full specification.

## Architecture

```
src/
├── schema/       # Zod schemas and TypeScript types
├── engine/       # Persona creation engine (discovery, population, rubric, inference)
├── cli/          # CREATE / REFINE / VALIDATE commands
├── runtime/      # Panel runtime — load and invoke personas
└── utils/        # YAML serialisation, versioning
```

## Licence

See [LICENSE](LICENSE).
