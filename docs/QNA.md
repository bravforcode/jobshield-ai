# JobShield AI — Q&A Prep (Spec §10)

These are the answers to the four predicted judge questions, written so a
presenter can read them verbatim. Each answer cites the spec section and
points at the code that backs it up.

---

## Q1: "Is this just embedding matching dressed up in fancy words?"

**A**: No — and the proof is in the explanation panel of every recommendation.
Embedding cosine similarity returns a single number; we cannot tell you
*why* two occupations are close. JobShield returns the **specific skills
that overlap** at every hop, computed from the PPMI-weighted co-occurrence
graph (spec §3.2, `py/src/jobshield/graph/build_skill_graph.py:69`).

The `path_explanation` field in every recommendation lists up to 5 shared
skills per hop. If the judge asks "why data_entry → junior_data_analyst?",
the answer is on screen: `excel, data_analysis, sql, english,
problem_solving`.

## Q2: "Is the data good enough?"

**A**: No, and we say so in the UI. The graph is a **proxy** built from job
posting co-occurrence, not from real worker transition data (which we do
not have for Thailand). Spec §8 lists this as limitation #2.

The validation set (spec §7, `py/tests/test_validation.py`) checks the four
canonical "obviously-close" pairs:
- call_center → customer_success: distance below graph median ✓
- factory_technician → qa: distance below median ✓
- cashier → retail_sales_assistant: 1-hop, distance below median ✓
- data_entry → junior_data_analyst: 1-hop with shared `excel`/`data_analysis` ✓

If these fail, the spec says to go fix canonicalization (not the algorithm).

## Q3: "Why split cost into two layers instead of one formula?"

**A**: Mathematical correctness, then speed. Spec §5.1 proves two things:

1. **Negative edges break Dijkstra silently.** The naive formula
   `α·skill_distance − β·wage_delta + γ·risk` can produce negative edge
   weights, which makes Dijkstra return non-optimal paths without erroring.
2. **The wage term telescopes to (wage(target) − wage(source))** for any
   path, so it has no effect on *which* path you take when source/target
   are fixed — only on *which target* you prefer.

The two-layer split fixes both:
- Layer 1: Dijkstra on `α·dist_norm + γ·risk_norm` (always ≥ 0) — picks path
- Layer 2: rank targets by `β·wage_norm − path_cost − γ₂·risk`

Bonus: one Dijkstra from the source gives paths to **every** target, not
just one — sub-millisecond on 18 occupations (`py/src/jobshield/path/dijkstra.py`).

## Q4: "Can this scale to all of Thailand?"

**A**: Architecturally yes; practically depends on data quality. Dijkstra is
O(E log V). At E ≈ 10k (ISCO unit-group scale), it's still sub-millisecond
in Python. The bottleneck is the graph quality, not the algorithm:

- Skill extraction error compounds (spec §8 limitation #1)
- Cold-start occupations with few postings get noisy vectors (limitation #3)
- We're honest about proxy-vs-reality (limitation #2)

MVP scope is 18 occupations per spec §9. We intentionally did not try to
cover the whole labour market on day one.

---

## Demo flow (2 minutes)

1. Open the web UI at `http://localhost:3000/`. The disclaimer is visible
   immediately.
2. Pick a starting occupation. We recommend `occ.data_entry` for the demo:
   - Path to `junior_data_analyst` shows the **excel, data_analysis, sql**
     skill bridge — judges can read the explanation.
   - Wage delta: +20,000 THB/month — visible on the card.
3. Switch to `occ.cashier`. Notice the Wage Radar panel: cashier is red
   (underpaid signal — high centrality, low actual wage). Show that the
   graph correctly identifies the structural underpayment, not just a
   market average.
4. If asked about the algorithm: open the artifacts JSON at
   `C:\jobsume\data\artifacts.json`. Point at the `transition_graph.edges`
   field and show that every entry has a `skill_distance` and
   `shared_skills` — this is what the UI renders.
