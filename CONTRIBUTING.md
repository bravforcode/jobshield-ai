# Contributing

## Quickstart

```bash
bun install
uv run --project py python -m jobshield.data.mock_data
uv run --project py python -m jobshield.cli.build --mock --out data/artifacts.json
bun run dev
```

## Checks

```bash
bun run typecheck
bun run lint
bun run build      # webpack
bun run test       # vitest
uv run --directory py pytest -q -k "not e2e"
```

## Deploy

Push to `main` → Vercel. Or `vercel --prod --yes`.

## Conventions

- No vanilla html,css — shadcn/Tailwind only
- `src/lib/data.server.ts` is only `node:fs` surface
- Dark/red signal only for underpaid
