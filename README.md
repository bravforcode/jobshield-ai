# JobShield AI

Career mobility recommender for the Thai labour market. Pick a starting job → see top 5 ranked next moves with wage gap + skill bridges.

**Live:** https://jobsume.vercel.app · **Spec:** `src/DIRECTION.md` · **Pipeline:** `py/`

## Stack

| Layer | Tech |
|-------|------|
| App | Next.js 16 (App Router) + React 19 + TypeScript 5 + Bun 1.3 |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix) + motion + next-themes |
| Charts | Recharts (OLS wage radar) |
| Data | Python 3.12 + uv — PPMI graph → Dijkstra L1 → Rank L2 → Centrality/OLS |
| Deploy | Vercel (webpack build, `sin1`) |

## Quickstart

```bash
# 1. Install
bun install

# 2. Build artifacts (first time or after py/ changes)
uv run --project py python -m jobshield.data.mock_data
uv run --project py python -m jobshield.cli.build --mock --out data/artifacts.json

# 3. Dev
bun run dev        # http://localhost:3000
bun run typecheck  # tsc --noEmit
bun run lint       # biome check src
bun run build      # bunx next build --webpack
```

```bash
# Python checks
uv run --directory py pytest -q   # 145 tests
uv run --directory py ruff check .
```

## Routes

| Route | What |
|-------|------|
| `/` | Landing — hero + live wage radar + architecture + features |
| `/recommend` | Recommender — source picker + ranked 5 + radar tab |
| `/wage-radar` | Deep radar — scatter + OLS line + table |
| `/mechanism` | 6-layer explainer (PPMI → centrality) |
| `GET /api/health` | `{status:"ok"}` |
| `GET /api/stats` | `{occupations, skills, edges, sources}` |
| `GET /api/occupations` | 18 occupations (bilingual labels) |
| `GET /api/occupations/[code]` | Single occupation |
| `GET /api/recommend?source=&topN=` | Ranked recommendations |
| `GET /api/wage-radar` | Radar rows with gap ratios |

## Data

`data/artifacts.json` is the build artifact (18 occ / 46 skills / 119 edges). Regenerate after editing `py/` or `data/mock/`. Hand-authored postings → mock, not real Thai LMI (see `/mechanism`).

## Deploy

Push to `main` → Vercel auto-deploy. Or `vercel --prod --yes` locally.

## License

MIT
