# Product

**JobShield AI** is a career recommender for the Thai labour market.
Pick a starting occupation, see the top five ranked next-step occupations,
with the wage gap and the actual skill bridges that connect them.

## What it is

- **One-page interactive tool.** A landing page, a recommender with
  source picker, a mechanism explainer, and a wage radar.
- **Two-layer ranking** (spec v2 §5). Layer 1 is Dijkstra on
  `α·dist_norm + γ·risk_norm`; Layer 2 scores targets by
  `β·wage_norm − path_cost − γ₂·risk`.
- **Skill graph from real postings.** PPMI co-occurrence over 153
  hand-authored job postings → 46 skills → 129 undirected transitions.
- **Wage gap from centrality.** OLS regression of median wage on
  degree centrality. Dots below the fit line are flagged underpaid —
  the only red on the page.

## What it isn't

- Not real Thai labour-market data. The skill graph is built from
  hand-authored postings; wages are mock. See `/mechanism` for what
  this is and isn't.
- Not a marketing site. It is a working tool with a working backend.
- Not a single-page essay. The math is in `/mechanism`; the proof
  is on the wage radar; the result is on `/recommend`.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5** on Bun
- **Tailwind CSS 4** + **shadcn/ui** (Radix primitives) + **motion** + **Recharts**
- **next-themes** dark/light toggle · **cmdk** for command palette · **sonner** for toasts
- **Python 3.12 + uv** pipeline (PPMI graph, Dijkstra, rank, centrality, OLS)
- Deploy target: **Vercel** (Node runtime, webpack build)

## Audience

A single Thai job-seeker evaluating career transitions. One user,
one screen, one decision per visit.

## Page job

Pick a starting job → see ranked next moves with the wage gap and
the skill bridges that justify the ranking. The model is on the page.
The numbers you see are the same numbers the algorithm saw.

## Brand commitments

1. **No decoration that doesn't serve the math.** The only red on the
   page is the underpaid signal.
2. **Live data on first paint.** The wage radar renders the moment
   the page loads, with 18 occupations, an OLS fit, and halos around
   underpaid points.
3. **Every recommendation comes with a why.** Click any ranked
   recommendation to see the actual shared skills at every hop.

## Status

| Layer | Coverage |
|------|---------|
| Python pipeline | 145 tests · ruff clean |
| TypeScript app | typecheck clean · biome clean |
| Build | webpack production build · 10 routes |
| Deploy | Vercel production · https://jobsume.vercel.app |
