# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** Thai job seekers, current occupation uncertain or seeking a transition, who want an explainable next-step career path rather than another black-box job board. They arrive in moments of stuckness or ambition, not browsing.
- **Secondary (operator):** Hackathon judges and technical reviewers who will scan the surface for craft and a real product story, not a marketing demo.
- **Developer / researcher audience:** people studying PPMI-based skill graphs, the two-layer Dijkstra/rank split, or wage-radar underpayment detection. The surface should make the mechanism visible, not hide it behind a brand.
- **Limitation (spec §8):** the system uses job-posting co-occurrence as a proxy for transition data, not real labor-market mobility data. The surface must surface this honestly in the first viewport.

## Product Purpose

JobShield AI shows a person where they can realistically go next in the labour market, and why. The system models occupations as vectors over a skill graph built from real posting co-occurrence, then explains the suggested path hop by hop — every transition is justified by the actual overlapping skills between the person's current job and the recommended one.

Success means a visitor leaves knowing one specific new occupation they could credibly move into, and the skills that connect where they are to where they could go.

## Positioning

Two things competitors cannot truthfully claim at the same time:

1. **Every hop is explainable.** No other career recommender in scope shows the actual skill bridge between occupations; they all hand-wave with "you'd be a good fit".
2. **The model itself is on the page.** The skill graph, transition graph, and centrality-based wage radar are all inspectable in the same UI, so the algorithm is not a black box the user is asked to trust.

The two-layer cost split (Dijkstra on `α·dist + γ·risk`, then rank by `β·wage − path_cost − γ₂·risk`) is a published correction to the broken one-shot formula. The product owns the math, and the UI is the only place that decision is visible to a non-author.

## Operating Context

- Single page, vanilla TypeScript (no React, no build framework) so the surface ships in <7 KB of compiled JS and runs on any device with a browser.
- Backed by a Python pipeline that reads a hand-authored mock dataset of 18 occupations × 8-12 postings each, writes `data/artifacts.json`, and is consumed by a Bun.serve HTTP API at `/api/*` routes.
- Deployed on Vercel (Edge/Node) at https://jobsume.vercel.app, with the same code path running locally via `bun run ts/api/src/index.ts`.
- Spec is `docs/jobshield-ai-spec-v2.md` (10 sections, 38 KB) — every visual claim should be defensible against the spec.

## Capabilities and Constraints

- 18 occupations, 46 unique skills, ~120 undirected transitions in the current mock dataset.
- PPMI skill graph (spec §3.2): `ppmi = max(log(p_s12 / (p_s1·p_s2)), 0)`.
- Layer 1 path cost is non-negative by construction: `α·dist_norm + γ·risk_norm` with both inputs in [0, 1]. The naive `α·dist − β·wage + γ·risk` formula has a sign bug (negative edges break Dijkstra) and a telescoping bug (wage term doesn't change path choice); both are avoided in the v2 spec.
- Layer 2 ranking: `score = β·wage_norm − path_cost − γ₂·risk`, sorted desc, top-N default 5.
- Wage radar: degree centrality (max-normalized) + Brandes betweenness (max-normalized to 1.0), OLS regression `wage ~ centrality`, gap = (predicted − actual) / predicted, positive = underpaid.
- No external API calls. No LLM at runtime. Deterministic given the same input.
- Top-N hard-capped at 1..50 server-side; source code length capped at 64 chars; per-client rate limit (default 120 req/min) before any work.
- Specced-but-not-implemented: Yen's K=3 K-shortest paths (§5.4 stretch), real LLM extractor, real labour-market data source. Visible as "stretch goals" in the demo, not hidden.

## Brand Commitments

- Name: **JobShield AI** (established in spec, not negotiable).
- Tone: honest prototype. The spec §8 limitations (proxy not reality, single-language postings, no LLM verification) are stated in the first viewport, not buried in fine print.
- Color: dark UI (decision deferred to design step but the operator context — reviewer at a laptop, demo screenshot — argues for dark; the chart canvas reads better on dark).
- No marketing copy, no fabricated testimonials, no fake customer logos. The Q&A doc acknowledges four judge questions and answers them with code citations.
- Demo Q&A (spec §10) is part of the brand surface: the four expected questions are answered with code citations in `docs/QNA.md` and the spirit of those answers is visible in the UI's disclaimer.
- No hero illustration of a "future of work" theme. The product is the graph, not a stock photo.

## Evidence on Hand

- Spec: `docs/jobshield-ai-spec-v2.md` (10 sections, 38 KB).
- Implementation plan: `docs/plan.md` (15 commits, 11 PR, ~88→105 tests).
- Q&A prep: `docs/QNA.md` (4 questions, code citations).
- Mock dataset: `data/mock/job_postings.json` (18 occupations, 153 postings), `wage_data.json`, `risk_scores.json`.
- Generated artifacts: `data/artifacts.json` (18 nodes, ~120 edges, computed offline by the Python CLI).
- Production deployment: https://jobsume.vercel.app.
- 145 Python tests + 18 TypeScript tests passing locally; ruff + biome clean.
- Pipeline invariants (from `tests/test_invariants.py`): PPMI ≥ 0, distance ∈ [0, 1], edge_cost ≥ 0, max-degree normalization, betweenness normalization, Dijkstra reachability on the connected component.

Future work must not fabricate: customer case studies, real Thai-market wage data, OEM partnerships, accuracy benchmarks, or production transition-matrix coverage. The product is honest about being a prototype built from a proxy.

## Product Principles

1. **Explain before recommend.** No transition appears in the UI without its skill bridge visible on the same line.
2. **The model is the product.** The graph, the path, the wage radar are all visible. Hiding the algorithm would be hiding the point.
3. **One viewport, one decision.** A visitor should know the offer, the mechanism, and the next action within the first screen.
4. **Honest about what it is.** "Prototype. Skill graph built from job-posting co-occurrence, not real transition data." That sentence is the first paragraph of the disclaimer, not a footnote.
5. **Pace like a thesis.** The page is a piece of research communication, not a marketing site. Density earns quiet; a dense passage earns an even denser one.

## Accessibility & Inclusion

- WCAG AA contrast minimum. The current dark palette is `#0b0d12` ground, `#e6e8ee` ink, with one accent (`#4cc2ff`). Luma contrast ratio: ~14:1, well above AA.
- Full keyboard navigation: dropdown operable by Tab + arrow keys; cards have a clear focus ring; canvas has a text fallback table for screen readers.
- Thai + English text in postings; the spec allows the source language to be Thai and the skill vocabulary English. UI itself is English with one Thai transliteration where it helps clarity.
- Reduced motion: canvas transitions and hover lifts are CSS-only and respect `prefers-reduced-motion: reduce`.
- The skill graph data is also exposed in JSON form at `/api/wage-radar` and `/api/occupations`, so a screen-reader user or a power user can inspect the raw model without using the canvas.
