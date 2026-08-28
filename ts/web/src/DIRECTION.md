// JobShield AI — Research-Poster Direction Contract
//
// THESIS: A career recommender is a research artifact, not a marketing
// surface. Show the mechanism — skill graph, transition graph, wage
// radar — with the typographic discipline of a working paper. Every
// pixel earns its place by carrying a fact; the page never decorates.
//
// OWN-WORLD: dark paper (Eigengrau #0a0c10 ground, ivory #e8e3d6 ink),
// set in IBM Plex Serif (display) + Plex Mono (measurement) + Plex
// Sans (UI). One signal color: signal red #ff5b3e for the wage gap.
// No gradients, no glass, no icons, no rounded surfaces > 6px, no
// shadows-as-decoration. Rule of thumb: if a 1990 print journal would
// not have set it this way, the surface is wrong.
//
// STORY: A reviewer lands. First viewport tells them: this is a working
// career-path recommender, the model is a PPMI skill graph plus a two-
// layer Dijkstra + rank split, the math is correct (we tell them why
// the one-shot formula breaks), and the demo runs on a hand-authored
// 18-occupation proxy. The second viewport shows the recommender doing
// its job: pick a starting occupation, see the top 5 paths, every hop
// annotated with the actual overlapping skills. The third viewport
// shows the wage radar: centrality vs median wage, with the only red on
// the page flagging the underpaid gap the OLS regression surfaced. The
// final section is a code index — every visual claim is a citation
// back to a file and a line number.
//
// FIRST VIEWPORT:
//  ┌─────────────────────────────────────────────────────────────┐
//  │ JOBSHIELD AI — A WORKING PAPER                              │
//  │ 18 occupations · 46 skills · 120 transitions · proxy      │
//  │ A career recommender built on a PPMI skill graph and a     │
//  │ two-layer Dijkstra + rank split. The model is on the page. │
//  ├─────────────────────────────────────────────────────────────┤
//  │ ── I. THE OFFER ─────────────────────────────────────────  │
//  │ "Show me where I can go, and why."                         │
//  │ ▌ PICK A STARTING OCCUPATION                              │
//  │   [occ.data_entry             ↓]                           │
//  │   occ.data_entry  15,000 THB · risk 95% · degree 1.00      │
//  │ ── 01 / THE MECHANISM ────────────────────────────────────  │
//  │ Layer 1: Dijkstra on α·dist_norm + γ·risk_norm (≥ 0)       │
//  │ Layer 2: score = β·wage_norm − path_cost − γ₂·risk        │
//  │ Wage is in the rank, not the path.                         │
//  ├─────────────────────────────────────────────────────────────┤
//  │ 02 / RECOMMENDATIONS — TOP 5 (target → via → score)        │
//  │ 1  occ.junior_data_analyst   +20,000 THB  0.395           │
//  │ 2  occ.digital_marketer      +17,000 THB  0.130           │
//  │ 3  occ.hr_generalist         +11,000 THB  0.094           │
//  │ (selected) occ.junior_data_analyst:                       │
//  │   occ.data_entry → occ.junior_data_analyst                │
//  │   shared: excel · sql · english · data_analysis · problem_solving │
//  │ ── 03 / WAGE RADAR ───────────────────────────────────────  │
//  │ Degree centrality (x) vs median wage (y). Red = underpaid. │
//  │ [scatter: 18 dots, underpaid in signal red]              │
//  └─────────────────────────────────────────────────────────────┘
//
// FORM: research paper / scientific poster, not a marketing site.
// Staging for concept-seed: a single full-bleed column at min 72ch
// measure, dense first viewport, the only red on the page is the
// underpayment signal. The graph is the product; chrome is absent.
//
