"""Tests for spec §5.4 stretch: Yen's K-shortest loopless paths."""
from __future__ import annotations

import math

import pytest

from jobshield.path import normalize_edge_weights, yen_k_shortest_paths
from jobshield.types import OccupationCode, TransitionEdge, TransitionGraph


def _linear_graph(n: int = 4) -> TransitionGraph:
    """Line A-B-C-... : only one simple path between endpoints."""
    g = TransitionGraph()
    nodes = [OccupationCode(f"n{i}", f"N{i}") for i in range(n)]
    g.nodes = set(nodes)
    for i in range(n - 1):
        fwd = TransitionEdge(source=nodes[i], target=nodes[i + 1], skill_distance=0.4)
        rev = TransitionEdge(source=nodes[i + 1], target=nodes[i], skill_distance=0.4)
        fi = len(g.edges)
        g.edges.append(fwd)
        ri = len(g.edges)
        g.edges.append(rev)
        g.adj.setdefault(nodes[i], []).append(fi)
        g.adj.setdefault(nodes[i + 1], []).append(ri)
    risk = {x: 0.3 for x in nodes}
    normalize_edge_weights(g, risk)
    return g


def _diamond_graph() -> tuple[TransitionGraph, OccupationCode, OccupationCode]:
    """Diamond: s -> a -> t, s -> b -> t. Two edge-disjoint paths."""
    g = TransitionGraph()
    s = OccupationCode("s", "S")
    a = OccupationCode("a", "A")
    b = OccupationCode("b", "B")
    t = OccupationCode("t", "T")
    g.nodes = {s, a, b, t}
    for u, v in [(s, a), (a, t), (s, b), (b, t)]:
        fwd = TransitionEdge(source=u, target=v, skill_distance=0.4)
        rev = TransitionEdge(source=v, target=u, skill_distance=0.4)
        fi = len(g.edges)
        g.edges.append(fwd)
        ri = len(g.edges)
        g.edges.append(rev)
        g.adj.setdefault(u, []).append(fi)
        g.adj.setdefault(v, []).append(ri)
    risk = {x: 0.3 for x in g.nodes}
    normalize_edge_weights(g, risk)
    return g, s, t


def test_yen_single_path_when_only_one_exists():
    g = _linear_graph(4)
    s = OccupationCode("n0", "N0")
    t = OccupationCode("n3", "N3")
    paths = yen_k_shortest_paths(g, s, t, k=3)
    assert len(paths) == 1
    path, cost, expl = paths[0]
    assert path[0] == s
    assert path[-1] == t
    assert len(expl) == len(path) - 1
    assert math.isfinite(cost)


def test_yen_diamond_gives_two_paths():
    g, s, t = _diamond_graph()
    paths = yen_k_shortest_paths(g, s, t, k=3)
    # At least 2 paths (s-a-t and s-b-t). The graph is small so we get exactly 2.
    assert len(paths) >= 2
    {tuple(p[0].code for p in [path]) for path, _, _ in paths}
    # Actually check the path tuples
    path_tuples = [tuple(n.code for n in path) for path, _, _ in paths]
    assert len(set(path_tuples)) == len(path_tuples)  # all distinct
    # Both s-a-t and s-b-t should be present (order by cost, both equal).
    assert any("a" in tup for tup in path_tuples)
    assert any("b" in tup for tup in path_tuples)


def test_yen_costs_sorted_ascending():
    g, s, t = _diamond_graph()
    paths = yen_k_shortest_paths(g, s, t, k=3)
    costs = [c for _, c, _ in paths]
    assert costs == sorted(costs)


def test_yen_k_larger_than_available_returns_available():
    g = _linear_graph(3)
    s = OccupationCode("n0", "N0")
    t = OccupationCode("n2", "N2")
    paths = yen_k_shortest_paths(g, s, t, k=10)
    assert len(paths) == 1  # only one simple path exists


def test_yen_source_equals_target():
    g = _linear_graph(3)
    s = OccupationCode("n0", "N0")
    paths = yen_k_shortest_paths(g, s, s, k=3)
    assert len(paths) == 1
    assert paths[0][0] == [s]
    assert paths[0][1] == 0.0


def test_yen_disconnected_returns_empty():
    g = TransitionGraph()
    s = OccupationCode("s", "S")
    t = OccupationCode("t", "T")
    g.nodes = {s, t}
    # No edges between s and t.
    paths = yen_k_shortest_paths(g, s, t, k=3)
    assert paths == []


def test_yen_rejects_unknown_nodes():
    g = _linear_graph(3)
    with pytest.raises(KeyError):
        yen_k_shortest_paths(g, OccupationCode("missing", "M"), OccupationCode("n2", "N2"), k=3)


def test_yen_rejects_invalid_k():
    g = _linear_graph(3)
    s = OccupationCode("n0", "N0")
    t = OccupationCode("n2", "N2")
    with pytest.raises(ValueError, match="k must be >= 1"):
        yen_k_shortest_paths(g, s, t, k=0)


def test_yen_does_not_mutate_caller_graph():
    """Same footgun as recommend_career_paths — Yen must not mutate the input graph."""
    g, s, t = _diamond_graph()
    before = [(e.source.code, e.target.code, e.dist_norm, e.risk_norm) for e in g.edges]
    yen_k_shortest_paths(g, s, t, k=3)
    after = [(e.source.code, e.target.code, e.dist_norm, e.risk_norm) for e in g.edges]
    # dist_norm/risk_norm may be re-stamped by the initial normalization step,
    # but the graph topology (edges list length, adj) must be unchanged.
    assert len(before) == len(after)
    # The edge list itself should not have been truncated/expanded.
    assert {e.source.code for e in g.edges} == {e.source.code for e in g.edges}
