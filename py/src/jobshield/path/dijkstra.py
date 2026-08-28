"""Single-source Dijkstra on the occupation transition graph (spec 5.3).

Edge weights are guaranteed non-negative (alpha * dist_norm + gamma * risk_norm
with both factors >= 0), so a standard binary-heap Dijkstra is correct.
"""
from __future__ import annotations

import heapq
import math
from collections.abc import Mapping

from jobshield.path.transition_graph import edge_cost
from jobshield.types import (
    OccupationCode,
    PathHopExplanation,
    TransitionEdge,
    TransitionGraph,
)


def dijkstra_from_source(
    g: TransitionGraph,
    source: OccupationCode,
    alpha: float = 0.6,
    gamma: float = 0.4,
) -> tuple[dict[OccupationCode, float], dict[OccupationCode, tuple[OccupationCode, TransitionEdge] | None]]:
    """Compute shortest path cost from `source` to every other node.

    Returns:
        dist: mapping node -> accumulated cost. inf means unreachable.
        prev: mapping node -> (parent, edge_used) or None for source/unreachable.
    """
    # Stamp per-call costs onto edges (cheap, avoids carrying alpha/gamma around).
    for e in g.edges:
        e.cost = edge_cost(e, alpha, gamma)

    dist: dict[OccupationCode, float] = {n: math.inf for n in g.nodes}
    prev: dict[OccupationCode, tuple[OccupationCode, TransitionEdge] | None] = {
        n: None for n in g.nodes
    }
    dist[source] = 0.0
    visited: set[OccupationCode] = set()
    pq: list[tuple[float, OccupationCode]] = [(0.0, source)]

    while pq:
        d, u = heapq.heappop(pq)
        if u in visited:
            continue
        visited.add(u)
        for e in g.edges_from(u):
            v = e.target
            if v in visited:
                continue
            nd = d + e.cost
            if nd < dist[v]:
                dist[v] = nd
                prev[v] = (u, e)
                heapq.heappush(pq, (nd, v))

    return dist, prev


def reconstruct_path(
    prev: Mapping[OccupationCode, tuple[OccupationCode, TransitionEdge] | None],
    source: OccupationCode,
    target: OccupationCode,
) -> tuple[list[OccupationCode], list[PathHopExplanation]]:
    """Walk `prev` from target back to source.

    Returns:
        path: source -> ... -> target (in traversal order)
        explanations: one PathHopExplanation per hop, aligned with `path[1:]`
    """
    if prev.get(target) is None and target != source:
        # Unreachable or trivially source==target.
        if target == source:
            return [source], []
        return [], []

    path: list[OccupationCode] = []
    explanations: list[PathHopExplanation] = []
    node = target
    while node != source:
        parent_edge = prev.get(node)
        if parent_edge is None:
            # Defensive: a bug or partial graph. Bail with what we have.
            return [], []
        parent, edge = parent_edge
        path.append(node)
        explanations.append(
            PathHopExplanation(
                from_occ=parent,
                to_occ=node,
                shared_skills=list(edge.shared_skills),
            )
        )
        node = parent
    path.append(source)
    path.reverse()
    explanations.reverse()
    return path, explanations


__all__ = ["dijkstra_from_source", "reconstruct_path"]
