# JobShield AI

Thai Occupation Mobility Network — explainable career path recommender.

Spec: `docs/jobshield-ai-spec-v2.md` (also at original `C:\Users\menum\Downloads\jobshield-ai-spec-v2.md`).

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
- `tests/py/`, `tests/ts/` — test suites.
- `docs/` — plan + spec copies.

## Quick start

```bash
# Python core
cd py && uv sync && uv run python -m jobshield.graph.build --mock

# Tests
bun test
cd py && uv run pytest
```

See `docs/plan.md` for the phased build plan.
