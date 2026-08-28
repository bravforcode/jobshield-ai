"""Spec-level invariant tests.

Each test pins down one mathematical claim from the spec that must NEVER
break without a deliberate design decision documented in the code. These
exist separately from the per-module unit tests because they cross layers.
"""
from __future__ import annotations

import math

from jobshield.cli.build import build_pipeline
from jobshield.path import edge_cost, normalize_edge_weights


def test_ppmi_is_always_nonnegative() -> None:
    """Spec §3.2: `ppmi = max(pmi, 0)` — edges with sub-independence are dropped."""
    artifacts, _ = build_pipeline(
        "C:/jobsume/data/mock/job_postings.json",
        "C:/jobsume/data/mock/wage_data.json",
        "C:/jobsume/data/mock/risk_scores.json",
    )
    for w in artifacts.skill_graph.edges.values():
        assert w >= 0.0, f"PPMI edge weight {w} is negative"


def test_skill_distance_in_unit_interval() -> None:
    """Spec §4.2: distance = 1 - clamp01(similarity) — must be in [0, 1]."""
    artifacts, _ = build_pipeline(
        "C:/jobsume/data/mock/job_postings.json",
        "C:/jobsume/data/mock/wage_data.json",
        "C:/jobsume/data/mock/risk_scores.json",
    )
    for e in artifacts.transition_graph.edges:
        assert 0.0 <= e.skill_distance <= 1.0, (
            f"skill_distance {e.skill_distance} not in [0,1]"
        )


def test_edge_cost_nonnegativity_is_global_invariant() -> None:
    """Spec §5.1: this is the property Dijkstra correctness hinges on.

    Verify across the full graph, not just the test fixture.
    """
    artifacts, _ = build_pipeline(
        "C:/jobsume/data/mock/job_postings.json",
        "C:/jobsume/data/mock/wage_data.json",
        "C:/jobsume/data/mock/risk_scores.json",
    )
    # Already normalized by recommend_career_paths, but re-assert.
    normalize_edge_weights(artifacts.transition_graph, artifacts.risk_scores)
    for e in artifacts.transition_graph.edges:
        assert edge_cost(e) >= 0.0, (
            f"edge {e.source.code}->{e.target.code} cost {e.cost} is negative"
        )


def test_wage_term_telescopes_to_target_minus_source() -> None:
    """Spec §5.1: including the wage term in path cost has no effect on path
    choice for a fixed source/target. We verify the math identity, not the
    implementation (we don't add wage to edge cost anymore)."""
    for src_w, mid_w, tgt_w in [
        (10_000, 15_000, 25_000),
        (20_000, 18_000, 30_000),
        (12_000, 12_000, 12_000),
    ]:
        # Two-hop sum and direct sum of (-beta * wage_delta) must be equal.
        beta = 0.5
        two_hop = -beta * (mid_w - src_w) + -beta * (tgt_w - mid_w)
        one_hop = -beta * (tgt_w - src_w)
        assert math.isclose(two_hop, one_hop, abs_tol=1e-9)


def test_skill_graph_is_undirected_pairs() -> None:
    """Spec §3.2: edge key = sorted skill pair. has_edge(s1, s2) == has_edge(s2, s1)."""
    artifacts, _ = build_pipeline(
        "C:/jobsume/data/mock/job_postings.json",
        "C:/jobsume/data/mock/wage_data.json",
        "C:/jobsume/data/mock/risk_scores.json",
    )
    sg = artifacts.skill_graph
    for a, b in [(s, t) for (s, t) in sg.edges]:
        # Spot-check a handful: (a, b) and (b, a) — both lookups via dict — both work.
        assert sg.has_edge(a, b)
        assert sg.has_edge(b, a)
        assert sg.edge_weight(a, b) == sg.edge_weight(b, a) > 0


def test_centrality_degree_normalized_to_max_1() -> None:
    """Spec §6.2: degree_centrality uses max-degree normalization -> max == 1.0."""
    artifacts, _ = build_pipeline(
        "C:/jobsume/data/mock/job_postings.json",
        "C:/jobsume/data/mock/wage_data.json",
        "C:/jobsume/data/mock/risk_scores.json",
    )
    cent = artifacts.centrality.degree
    if cent:
        max_c = max(cent.values())
        assert math.isclose(max_c, 1.0, abs_tol=1e-9)


def test_centrality_betweenness_normalized_to_max_1() -> None:
    """Spec §6.2: betweenness normalized so max is 1.0 (or 0 if disconnected)."""
    artifacts, _ = build_pipeline(
        "C:/jobsume/data/mock/job_postings.json",
        "C:/jobsume/data/mock/wage_data.json",
        "C:/jobsume/data/mock/risk_scores.json",
    )
    cent = artifacts.centrality.betweenness
    if cent:
        max_c = max(cent.values())
        assert math.isclose(max_c, 1.0, abs_tol=1e-9)


def test_dijkstra_path_cost_is_finite_for_connected_pairs() -> None:
    """For every pair of distinct occupations in the same connected
    component, the Dijkstra dist must be finite."""
    from jobshield.path import dijkstra_from_source

    artifacts, _ = build_pipeline(
        "C:/jobsume/data/mock/job_postings.json",
        "C:/jobsume/data/mock/wage_data.json",
        "C:/jobsume/data/mock/risk_scores.json",
    )
    g = artifacts.transition_graph
    for source in g.nodes:
        dist, _ = dijkstra_from_source(g, source)
        for target, d in dist.items():
            if target == source:
                continue
            # All other nodes should be reachable (graph is connected by
            # the threshold filter and all 18 occs are mutually linked).
            assert math.isfinite(d), (
                f"{source.code} -> {target.code} is unreachable (dist={d})"
            )
