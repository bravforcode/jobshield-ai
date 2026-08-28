"""Tests for spec v2 section 5 (path-finding)."""
from __future__ import annotations

import itertools
import math

from conftest import (
    OCC_A,
    OCC_B,
    OCC_C,
    PATH_OCC_FAR,
    PATH_OCC_W,
    PATH_OCC_X,
    PATH_OCC_Y,
    PATH_OCC_Z,
    s,
)
from jobshield.path import (
    build_transition_graph,
    dijkstra_from_source,
    edge_cost,
    normalize_edge_weights,
    rank_recommended_targets,
    recommend_career_paths,
    reconstruct_path,
)
from jobshield.types import OccupationVectors, SkillGraph

# --- transition graph + normalization ---------------------------------------


def test_build_transition_graph_only_keeps_close_pairs(small_skill_graph: SkillGraph) -> None:
    """Only pairs with dist <= threshold get edges."""
    py, _sq, _xl = s("python"), s("sql"), s("excel")
    occs = [OCC_A, OCC_B, OCC_C]
    # Build three identical vectors -> distance 0, edge created.
    occ_vecs = OccupationVectors(
        vectors={
            OCC_A: {py: 1.0},
            OCC_B: {py: 1.0},
            OCC_C: {py: 1.0},
        }
    )
    g = build_transition_graph(occs, occ_vecs, small_skill_graph, dist_threshold=0.85)
    # 3 pairs x 2 directions = 6 edges; all identical so dist == 0.
    assert len(g.edges) == 6
    # Threshold that excludes all pairs -> 0 edges.
    g2 = build_transition_graph(occs, occ_vecs, small_skill_graph, dist_threshold=-0.01)
    assert len(g2.edges) == 0


def test_normalize_edge_weights_produces_dist_norm_in_unit_interval(
    path_transition_graph,
) -> None:
    g = path_transition_graph
    normalize_edge_weights(g, {})
    for e in g.edges:
        assert 0.0 <= e.dist_norm <= 1.0


def test_edge_cost_is_nonnegative(path_transition_graph) -> None:
    g = path_transition_graph
    normalize_edge_weights(g, {})
    for e in g.edges:
        assert edge_cost(e) >= 0.0


# --- dijkstra + path reconstruction -----------------------------------------


def test_dijkstra_source_is_zero_and_reachable_neighbors_finite(
    path_transition_graph,
) -> None:
    dist, _ = dijkstra_from_source(path_transition_graph, PATH_OCC_X)
    assert dist[PATH_OCC_X] == 0.0
    for n in (PATH_OCC_Y, PATH_OCC_Z):
        assert math.isfinite(dist[n])
    # Disconnected: Far should be unreachable (inf).
    assert dist[PATH_OCC_FAR] == math.inf


def test_reconstruct_path_order_and_hop_count(path_transition_graph) -> None:
    _dist, prev = dijkstra_from_source(path_transition_graph, PATH_OCC_X)
    path, explanations = reconstruct_path(prev, PATH_OCC_X, PATH_OCC_W)
    assert path[0] == PATH_OCC_X
    assert path[-1] == PATH_OCC_W
    # X -> Y -> W is the only route (2 hops).
    assert path == [PATH_OCC_X, PATH_OCC_Y, PATH_OCC_W]
    assert len(explanations) == len(path) - 1


def test_rank_recommended_targets_sorted_by_score(
    path_transition_graph, path_wage_data, path_risk_scores
) -> None:
    dist, _ = dijkstra_from_source(path_transition_graph, PATH_OCC_X)
    top = rank_recommended_targets(
        PATH_OCC_X, dist, path_wage_data, path_risk_scores, top_n=5
    )
    # Skip disconnected Far.
    assert all(c != PATH_OCC_FAR for c, *_ in top)
    scores = [s for _, s, _, _ in top]
    assert scores == sorted(scores, reverse=True)


def test_recommend_career_paths_end_to_end(
    path_transition_graph, path_wage_data, path_risk_scores
) -> None:
    recs = recommend_career_paths(
        PATH_OCC_X,
        path_transition_graph,
        path_wage_data,
        path_risk_scores,
        top_n=3,
    )
    assert len(recs) >= 1
    for rec in recs:
        assert rec.path[0] == PATH_OCC_X
        assert rec.path[-1] == rec.target
        assert len(rec.path_explanation) == len(rec.path) - 1
        assert math.isfinite(rec.wage_delta)
        assert math.isfinite(rec.path_cost)
        assert math.isfinite(rec.score)
        assert 0.0 <= rec.target_risk <= 1.0


def test_recommend_career_paths_multi_objective_tradeoff(
    path_transition_graph, path_wage_data, path_risk_scores
) -> None:
    """Verify Layer-2 score is not dominated by a single dimension.

    X -> Y: 1 hop, +1k wage, risk 0.5.
    X -> Z: 1 hop, +10k wage, risk 0.3.
    X -> W: 2 hops, +20k wage, risk 0.1.

    Case A: tiny beta, gamma2=0 -> path_cost dominates.
      All edges have dist_norm ~0.5 (only one distance value), so:
      cost(X->Y) = cost(X->Z) = 0.6*0.5 + 0.4*risk = 0.3 + 0.4*risk
      cost(X->W) = 2 hops via Y = (0.3 + 0.4*0.5) + (0.3 + 0.4*0.1) = 0.84
      W has the highest path_cost -> must rank BELOW Y and Z.
    """
    recs = recommend_career_paths(
        PATH_OCC_X,
        path_transition_graph,
        path_wage_data,
        path_risk_scores,
        alpha=0.6,
        gamma=0.4,
        beta=0.01,
        gamma2=0.0,
        top_n=5,
    )
    targets = [r.target for r in recs]
    # W (2-hop) must not be the top recommendation when cost dominates.
    assert PATH_OCC_W in targets
    assert PATH_OCC_Y in targets
    assert PATH_OCC_Z in targets
    assert targets.index(PATH_OCC_W) > targets.index(PATH_OCC_Y)
    assert targets.index(PATH_OCC_W) > targets.index(PATH_OCC_Z)

    # Case B: high beta -> wage matters. Z (+10k) and W (+20k) should
    # rank above Y (+1k). W still loses to Z only if path_cost penalty
    # dominates the wage gain — verify it ranks somewhere reasonable.
    recs_b = recommend_career_paths(
        PATH_OCC_X,
        path_transition_graph,
        path_wage_data,
        path_risk_scores,
        alpha=0.6,
        gamma=0.4,
        beta=0.5,
        gamma2=0.0,
        top_n=5,
    )
    targets_b = [r.target for r in recs_b]
    # Z's wage gain (10k) is bigger than Y's (1k) -> Z outranks Y.
    assert targets_b.index(PATH_OCC_Z) < targets_b.index(PATH_OCC_Y)


def test_path_cost_equals_sum_of_edge_costs(path_transition_graph) -> None:
    """For every reachable target, path_cost = sum of edge.cost along path."""
    dist, prev = dijkstra_from_source(path_transition_graph, PATH_OCC_X)
    # Edge costs were stamped during the dijkstra call.
    for target, expected_cost in dist.items():
        if target == PATH_OCC_X or not math.isfinite(expected_cost):
            continue
        path, _ = reconstruct_path(prev, PATH_OCC_X, target)
        # Sum cost of edges along path by re-deriving from edges_from.
        accumulated = 0.0
        for u, v in itertools.pairwise(path):
            e = next(
                edge for edge in path_transition_graph.edges_from(u) if edge.target == v
            )
            accumulated += e.cost
        assert math.isclose(accumulated, expected_cost, rel_tol=1e-9)
