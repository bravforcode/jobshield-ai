"""Transition graph builder (spec v2 section 5.3).

Constructs the undirected occupation graph whose edges carry `skill_distance`
in [0, 1] and a `shared_skills` list used downstream as the "why this hop?"
explanation. Edges are added only when the skill distance is at or below
`dist_threshold` — this is the spec's "drop far-apart edges" trick that keeps
the graph from being complete and Dijkstra cheap.
"""
from __future__ import annotations

from jobshield.occupation.distance import occupation_distance
from jobshield.types import (
    OccupationCode,
    OccupationVectors,
    SkillGraph,
    TransitionEdge,
    TransitionGraph,
)


def build_transition_graph(
    occupations: list[OccupationCode],
    occ_vectors: OccupationVectors,
    skill_graph: SkillGraph,
    dist_threshold: float = 0.85,
) -> TransitionGraph:
    """All-pairs skill distance, keep edges where distance <= threshold.

    Undirected: each surviving pair produces two `TransitionEdge` objects
    (one for each direction) with mirrored `source`/`target` and the same
    `shared_skills` list — Dijkstra consumes `edges_from(occ)`.
    """
    g = TransitionGraph()
    g.nodes = set(occupations)

    for occ_a, occ_b in _all_pairs(occupations):
        if occ_a == occ_b:
            continue
        distance, shared = occupation_distance(occ_a, occ_b, occ_vectors, skill_graph)
        if distance <= dist_threshold:
            fwd = TransitionEdge(
                source=occ_a,
                target=occ_b,
                skill_distance=distance,
                shared_skills=list(shared),
            )
            rev = TransitionEdge(
                source=occ_b,
                target=occ_a,
                skill_distance=distance,
                shared_skills=list(shared),
            )
            fwd_idx = len(g.edges)
            g.edges.append(fwd)
            rev_idx = len(g.edges)
            g.edges.append(rev)
            g.adj.setdefault(occ_a, []).append(fwd_idx)
            g.adj.setdefault(occ_b, []).append(rev_idx)

    return g


def _all_pairs(items: list[OccupationCode]):
    """All unordered pairs of items (i < j). O(n^2) memory-cheap generator."""
    n = len(items)
    for i in range(n):
        for j in range(i + 1, n):
            yield items[i], items[j]


def normalize_edge_weights(
    g: TransitionGraph,
    risk_scores: dict[OccupationCode, float],
) -> None:
    """Min-max normalize `skill_distance` and stamp `cost` in-place.

    Per spec 5.3:
      e.dist_norm = (e.skill_distance - dmin) / (dmax - dmin + eps)
      e.risk_norm = risk_scores[e.target]   # already in [0, 1], NOT renormalized
    """
    if not g.edges:
        return

    dists = [e.skill_distance for e in g.edges]
    dmin, dmax = min(dists), max(dists)
    spread = (dmax - dmin) + 1e-9

    for e in g.edges:
        e.dist_norm = (e.skill_distance - dmin) / spread
        e.risk_norm = risk_scores.get(e.target, 0.0)


def edge_cost(e: TransitionEdge, alpha: float = 0.6, gamma: float = 0.4) -> float:
    """Single-hop cost: alpha * dist_norm + gamma * risk_norm.

    Both inputs are non-negative; this is the invariant that makes Dijkstra
    safe (spec 5.1 — the negative-weight bug we are avoiding).
    """
    return alpha * e.dist_norm + gamma * e.risk_norm


__all__ = [
    "build_transition_graph",
    "edge_cost",
    "normalize_edge_weights",
]
