"""Yen's K-shortest loopless paths (spec §5.4 stretch).

Implements Yen's algorithm on the occupation transition graph. The graph
is small (18 nodes in the mock set) so we keep the implementation
readable rather than micro-optimized. Edge weights are non-negative
(spec §5.1 — `alpha·dist_norm + gamma·risk_norm`), so Dijkstra is safe
for every spur computation.

API matches the two-layer Rank API in `recommend.py`: the caller passes
alpha/gamma for the Layer-1 path cost, and Layer-2 ranking is applied
afterwards if needed.
"""
from __future__ import annotations

import heapq
import itertools
import math
from dataclasses import replace
from typing import TYPE_CHECKING

from jobshield.path.dijkstra import dijkstra_from_source, reconstruct_path
from jobshield.path.transition_graph import edge_cost
from jobshield.types import (
    OccupationCode,
    PathHopExplanation,
    TransitionEdge,
    TransitionGraph,
)

if TYPE_CHECKING:
    pass


def _path_cost(path: list[OccupationCode], g: TransitionGraph) -> float:
    """Sum of `edge.cost` along a concrete path. `g` must already be normalized."""
    if len(path) < 2:
        return 0.0
    total = 0.0
    for u, v in itertools.pairwise(path):
        # There may be multiple edges u->v with different shared_skills;
        # Yen assumes a simple graph — pick the first match.
        edge = next((e for e in g.edges_from(u) if e.target == v), None)
        if edge is None:
            return math.inf
        total += edge.cost
    return total


def _copy_graph_filtered(
    g: TransitionGraph,
    forbidden_nodes: set[OccupationCode],
    forbidden_edges: set[tuple[OccupationCode, OccupationCode]],
) -> TransitionGraph:
    """Return a shallow copy of `g` with certain nodes/edges removed.

    Nodes in `forbidden_nodes` are dropped entirely (and so are all edges
    incident on them). Edges whose (source, target) is in `forbidden_edges`
    are dropped. The result is a new TransitionGraph with fresh adjacency.
    """
    g2 = TransitionGraph()
    g2.nodes = {n for n in g.nodes if n not in forbidden_nodes}
    # Keep only edges whose endpoints survive AND whose directed pair is not forbidden.
    kept: list[TransitionEdge] = []
    for e in g.edges:
        if e.source in forbidden_nodes or e.target in forbidden_nodes:
            continue
        if (e.source, e.target) in forbidden_edges:
            continue
        kept.append(replace(e))
    g2.edges = kept
    # Rebuild adjacency from kept edges.
    for idx, e in enumerate(g2.edges):
        g2.adj.setdefault(e.source, []).append(idx)
        # Ensure every surviving node has at least an empty adjacency list
        # so g.edges_from(node) doesn't KeyError.
        if e.target not in g2.adj:
            g2.adj.setdefault(e.target, [])
    for n in g2.nodes:
        g2.adj.setdefault(n, [])
    return g2


def yen_k_shortest_paths(
    g: TransitionGraph,
    source: OccupationCode,
    target: OccupationCode,
    k: int = 3,
    alpha: float = 0.6,
    gamma: float = 0.4,
) -> list[tuple[list[OccupationCode], float, list[PathHopExplanation]]]:
    """Yen's K-shortest loopless paths from source to target.

    Returns a list of (path, cost, explanations) sorted by cost ascending.
    If fewer than K paths exist, the list is shorter. Each path is loopless
    and distinct. Costs are Layer-1 path costs (alpha·dist_norm + gamma·risk).

    The input graph `g` is NOT mutated. Internally we work on filtered
    copies for each spur computation.
    """
    if k < 1:
        raise ValueError(f"k must be >= 1, got {k}")
    if source not in g.nodes or target not in g.nodes:
        raise KeyError(f"source {source.code!r} or target {target.code!r} not in graph")
    if source == target:
        return [([source], 0.0, [])]

    # Build a normalized working copy so the caller's graph is untouched.
    # Yen mutates dist_norm/cost on every spur via dijkstra; we must not
    # leak that back. Use dataclasses.replace for the edges.
    from dataclasses import replace as _replace

    g0 = TransitionGraph()
    g0.nodes = set(g.nodes)
    g0.edges = [_replace(e) for e in g.edges]
    for idx, e in enumerate(g0.edges):
        g0.adj.setdefault(e.source, []).append(idx)
        if e.target not in g0.adj:
            g0.adj.setdefault(e.target, [])
    for n in g0.nodes:
        g0.adj.setdefault(n, [])
    dists = [e.skill_distance for e in g0.edges]
    if dists:
        dmin, dmax = min(dists), max(dists)
        spread = (dmax - dmin) + 1e-9
        for e in g0.edges:
            e.dist_norm = (e.skill_distance - dmin) / spread
            e.cost = edge_cost(e, alpha, gamma)

    # A holds the K shortest paths found so far (path, cost, explanations).
    dist0, prev0 = dijkstra_from_source(g0, source, alpha, gamma)
    if dist0.get(target, math.inf) == math.inf:
        return []
    path0, expl0 = reconstruct_path(prev0, source, target)
    if not path0:
        return []
    cost0 = dist0[target]
    a: list[tuple[list[OccupationCode], float, list[PathHopExplanation]]] = [
        (path0, cost0, expl0)
    ]

    # B is a min-heap of (cost, path, explanations) candidates.
    b: list[tuple[float, list[OccupationCode], list[PathHopExplanation]]] = []

    for kth in range(1, k):
        prev_path = a[kth - 1][0]
        # For each spur node in the previous path (except the last).
        for spur_idx in range(len(prev_path) - 1):
            spur_node = prev_path[spur_idx]
            root_path = prev_path[: spur_idx + 1]  # inclusive of spur
            root_cost = _path_cost(root_path, g0)

            # Edges to remove: for any path in A that shares the same root_path,
            # remove the edge spur_node->next_node that that path uses.
            forbidden_edges: set[tuple[OccupationCode, OccupationCode]] = set()
            for p, _, _ in a:
                if len(p) > spur_idx and p[: spur_idx + 1] == root_path:
                    forbidden_edges.add((p[spur_idx], p[spur_idx + 1]))

            # Nodes to remove: all nodes in root_path except spur_node (to avoid loops).
            forbidden_nodes = set(root_path[:-1])

            g_spur = _copy_graph_filtered(g0, forbidden_nodes, forbidden_edges)
            if spur_node not in g_spur.nodes or target not in g_spur.nodes:
                continue

            dist_spur, prev_spur = dijkstra_from_source(g_spur, spur_node, alpha, gamma)
            if dist_spur.get(target, math.inf) == math.inf:
                continue
            spur_path, spur_expl = reconstruct_path(prev_spur, spur_node, target)
            if not spur_path:
                continue

            # Stitch root_path (without spur_node duplication) + spur_path.
            total_path = root_path[:-1] + spur_path
            # Explanations: root segment + spur segment. For the root segment
            # we reuse the working graph's explanations along that prefix.
            root_expl: list[PathHopExplanation] = []
            for u, v in itertools.pairwise(root_path):
                e = next((x for x in g0.edges_from(u) if x.target == v), None)
                if e is not None:
                    root_expl.append(
                        PathHopExplanation(from_occ=u, to_occ=v, shared_skills=list(e.shared_skills))
                    )
            total_expl = root_expl + spur_expl
            total_cost = root_cost + dist_spur[target]

            # Avoid duplicate candidates already in A or B.
            if any(total_path == p for p, _, _ in a):
                continue
            if any(total_path == p for _, p, _ in b):
                continue
            heapq.heappush(b, (total_cost, total_path, total_expl))

        if not b:
            break
        cost_k, path_k, expl_k = heapq.heappop(b)
        a.append((path_k, cost_k, expl_k))

    return a


__all__ = ["yen_k_shortest_paths"]
