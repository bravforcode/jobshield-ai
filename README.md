# JobShield AI

Thai Occupation Mobility Network — explainable career path recommender.

Spec: `docs/jobshield-ai-spec-v2.md` (also at original `C:\Users\menum\Downloads\jobshield-ai-spec-v2.md`).
Demo Q&A: `docs/QNA.md`. Implementation notes: `docs/plan.md`.

## Pipeline

```
[job postings] -> [LLM extract skills] -> [PPMI Skill Graph]
                                            |
                                            v
                          [Occupation Vectors] -> [Occupation Distance]
                                            |
                                            v
                       [Transition Graph] -> [Dijkstra Layer 1]
                                            |
                                            v
                            [Layer 2: rank with wage + risk]
                                            |
                                            v
                                  [Wage Radar: centrality]
```

## Layout

- `py/` — Python core: graph algorithms, skill extraction (uv workspace, ruff).
- `ts/` — TypeScript UI + API: bun + biome.
- `data/` — Generated artifacts: skill graph, occupation vectors, transition graph.
- `py/tests/` — 87 Python tests across 8 test files.
- `ts/api/src/` — 18 TypeScript tests across 4 test files.
- `docs/` — plan + spec copies.

## Quick start

```bash
# 0. Env (optional — defaults in .env.example)
cp .env.example .env

# 1. Python deps + mock data (one-time)
cd py && uv sync && uv run python -m jobshield.data.mock_data

# 2. Build artifacts
cd py && uv run python -m jobshield.cli.build --mock
# -> writes data/artifacts.json

# 3. Tests + lint
cd py && uv run pytest            # 87 tests
cd .. && bun test                 # 18 tests
cd py && uv run ruff check .
bun run lint

# 4. API + web (reads data/artifacts.json)
JOBSHIELD_ARTIFACTS="data/artifacts.json" bun run ts/api/src/index.ts
# -> http://localhost:3000
#    /api/occupations, /api/recommend?source=occ.data_entry, /api/wage-radar, /api/health
#    /web/main.ts, /web/styles.css (also served from the same process)
```

See `docs/plan.md` for the phased build plan and `docs/QNA.md` for the
four expected judge questions.
