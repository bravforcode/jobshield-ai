"""Layer-2 ranking + end-to-end recommendation (spec 5.3).

The two-layer split exists because the original one-shot cost formula
  cost = alpha * skill_distance - beta * wage_delta + gamma * risk
has two problems (spec 5.1):
  1. negative edges break Dijkstra's correctness guarantee
  2. wage term telescopes to (wage(target) - wage(source)) regardless of path,
     so it has no effect on path choice when target is fixed

Layer 1 = Dijkstra on (alpha * dist_norm + gamma * risk_norm) — picks the path.
Layer 2 = score targets by (beta * wage_norm - path_cost - gamma2 * risk).
"""
from __future__ import annotations

import math

from jobshield.path.dijkstra import dijkstra_from_source, reconstruct_path
from jobshield.path.transition_graph import normalize_edge_weights
from jobshield.types import (
    CareerRecommendation,
    OccupationCode,
    TransitionGraph,
    WageStats,
)


def rank_recommended_targets(
    source: OccupationCode,
    dist: dict[OccupationCode, float],
    wage_data: dict[OccupationCode, WageStats],
    risk_scores: dict[OccupationCode, float],
    beta: float = 0.5,
    gamma2: float = 0.3,
    top_n: int = 5,
) -> list[tuple[OccupationCode, float, float, float]]:
    """Return up to top_n (occ, score, wage_delta, path_cost) sorted by score desc.

    Score = beta * wage_norm - path_cost - gamma2 * risk_scores[occ]
    where wage_norm is min-max normalized over all finite wage deltas vs source.
    """
    wage_source = wage_data[source].median
    deltas = [
        wage_data[occ].median - wage_source
        for occ, d in dist.items()
        if occ != source and d != math.inf
    ]
    if not deltas:
        return []
    wmin, wmax = min(deltas), max(deltas)
    spread = (wmax - wmin) + 1e-9

    scored: list[tuple[OccupationCode, float, float, float]] = []
    for occ, path_cost in dist.items():
        if occ == source or path_cost == math.inf:
            continue
        wage_delta = wage_data[occ].median - wage_source
        wage_norm = (wage_delta - wmin) / spread
        score = beta * wage_norm - path_cost - gamma2 * risk_scores.get(occ, 0.0)
        scored.append((occ, score, wage_delta, path_cost))

    scored.sort(key=lambda r: r[1], reverse=True)
    return scored[:top_n]


def recommend_career_paths(
    source_occ: OccupationCode,
    g: TransitionGraph,
    wage_data: dict[OccupationCode, WageStats],
    risk_scores: dict[OccupationCode, float],
    alpha: float = 0.6,
    gamma: float = 0.4,
    beta: float = 0.5,
    gamma2: float = 0.3,
    top_n: int = 5,
) -> list[CareerRecommendation]:
    """One Dijkstra from `source_occ`, then Layer-2 ranking + path reconstruction.

    Normalizes edge weights in-place (idempotent). Callers that pre-normalized
    pay no extra cost beyond a re-derivation of the same `dist_norm`/`risk_norm`
    values.
    """
    normalize_edge_weights(g, risk_scores)
    dist, prev = dijkstra_from_source(g, source_occ, alpha, gamma)
    top = rank_recommended_targets(
        source_occ, dist, wage_data, risk_scores, beta, gamma2, top_n
    )

    recs: list[CareerRecommendation] = []
    for occ, score, wage_delta, path_cost in top:
        path, explanations = reconstruct_path(prev, source_occ, occ)
        recs.append(
            CareerRecommendation(
                target=occ,
                score=score,
                wage_delta=wage_delta,
                path=path,
                path_explanation=explanations,
                target_risk=risk_scores.get(occ, 0.0),
                path_cost=path_cost,
            )
        )
    return recs


__all__ = ["rank_recommended_targets", "recommend_career_paths"]
