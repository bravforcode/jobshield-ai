"""Centrality metrics on the occupation transition graph (spec 6.2).

- `degree_centrality`: trivial, must-have.
- `betweenness_centrality_brandes`: Brandes' O(VE) algorithm, normalized
  so the maximum is 1.0 (or 0.0 for empty / single-node graphs).
"""
from __future__ import annotations

from collections import deque


def degree_centrality(g) -> dict:
    """max-deg-normalized degree. Empty / single-node graphs return {n: 0.0}."""
    if not g.nodes:
        return {}
    degrees = {n: len(g.edges_from(n)) for n in g.nodes}
    max_deg = max(degrees.values())
    if max_deg == 0:
        return {n: 0.0 for n in g.nodes}
    return {n: d / max_deg for n, d in degrees.items()}


def betweenness_centrality_brandes(g) -> dict:
    """Brandes' algorithm (spec 6.2). Normalized so max=1.0.

    Single-source shortest path count (sigma) accumulates the number of
    shortest paths from `s` to each node; the backward accumulation
    `delta` measures how much each node lies on those paths.
    """
    if not g.nodes:
        return {}

    # Unweighted: every edge has cost 1.0 for BFS purposes. That is the
    # standard Brandes formulation and matches the spec's pseudocode.
    betweenness: dict = {n: 0.0 for n in g.nodes}

    for s in g.nodes:
        stack: list = []
        pred: dict = {n: [] for n in g.nodes}
        sigma: dict = {n: 0 for n in g.nodes}
        sigma[s] = 1
        dist: dict = {n: -1 for n in g.nodes}
        dist[s] = 0
        queue: deque = deque([s])

        # BFS from s.
        while queue:
            v = queue.popleft()
            stack.append(v)
            for w in g.neighbors(v):
                if dist[w] < 0:
                    dist[w] = dist[v] + 1
                    queue.append(w)
                if dist[w] == dist[v] + 1:
                    sigma[w] += sigma[v]
                    pred[w].append(v)

        delta: dict = {n: 0 for n in g.nodes}
        while stack:
            w = stack.pop()
            for v in pred[w]:
                # sigma[v] / sigma[w] * (1 + delta[w])
                # Guard against div-by-zero on disconnected components
                # (sigma[w] > 0 for any node reachable from s, which
                #  is always the case for w in stack).
                if sigma[w] == 0:
                    continue
                delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w])
            if w != s:
                betweenness[w] += delta[w]

    # Normalize: max -> 1.0 (or 0.0 if all zero).
    max_b = max(betweenness.values()) if betweenness else 0.0
    if max_b <= 0:
        return {n: 0.0 for n in g.nodes}
    return {n: v / max_b for n, v in betweenness.items()}


__all__ = ["betweenness_centrality_brandes", "degree_centrality"]
