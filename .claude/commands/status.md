Run all four build verification commands and report results:

```bash
npm run build
npm run typecheck
npx vitest run
npm run lint
```

Report the result of each command (pass/fail) and the total test count. If any command fails, show the error output. This is the gate check — all four must pass before committing.
