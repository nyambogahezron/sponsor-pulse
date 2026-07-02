# Scripts

## `generate-icons.mjs`

Generates extension icons in 7 sizes (16, 32, 48, 64, 128, 256, 512) into `apps/extension/public/icons/`.

Uses `@napi-rs/canvas` to draw a pulse line + play button icon with gradient background.

```bash
bun run icons
```

## `pre-commit`

Git pre-commit hook that runs typecheck, lint, and format before committing.

```bash
cp scripts/pre-commit .git/hooks/pre-commit
```
