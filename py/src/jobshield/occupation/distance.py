"""Explainable distance between occupations (spec v2 section 4.2).

distance(occ_a, occ_b) = 1 - clamp01(direct_overlap + indirect_overlap)

  direct   = sum over shared skills s of  min(vec_a[s], vec_b[s])
  indirect = sum over (sa in vec_a, sb in vec_b), sa != sb, edge(sa, sb) in skill_graph
             of  vec_a[sa] * vec_b[sb] * weight(sa, sb) * hop_decay

The top-5 shared skills (by min) are returned as the "why" — the explainable
output that distinguishes this metric from a black-box cosine similarity.
"""
from __future__ import annotations

from jobshield.types import (
    OccupationCode,
    OccupationVectors,
    SkillGraph,
    SkillTag,
)


def occupation_distance(
    occ_a: OccupationCode,
    occ_b: OccupationCode,
    occ_vectors: OccupationVectors,
    skill_graph: SkillGraph,
    hop_decay: float = 0.4,
) -> tuple[float, list[SkillTag]]:
    """Return (distance in [0, 1], top-5 shared skills explaining the closeness).

    `distance == 0` means identical vectors; `distance == 1` means no shared
    signal (either no shared skills and no PPMI bridge, or weak enough that
    the similarity term clamps to 0).
    """
    vec_a = occ_vectors.get(occ_a)
    vec_b = occ_vectors.get(occ_b)

    # Direct overlap — same skill present in both occupations.
    shared = set(vec_a).intersection(vec_b)
    direct = sum(min(vec_a[s], vec_b[s]) for s in shared)

    # Indirect overlap — different skills but PPMI-connected in the skill graph.
    # O(|vec_a| * |vec_b|); fine for the 15-20 occ MVP scope.
    indirect = 0.0
    for sa, wa in vec_a.items():
        for sb, wb in vec_b.items():
            if sa == sb:
                continue
            if skill_graph.has_edge(sa, sb):
                indirect += wa * wb * skill_graph.edge_weight(sa, sb) * hop_decay

    similarity = direct + indirect
    distance = 1.0 - min(similarity, 1.0)  # clamp into [0, 1]

    # Top-5 shared skills, ranked by how much they each contribute (min of the
    # two normalized weights). Stable sort by name for ties (deterministic tests).
    explanation = sorted(
        shared,
        key=lambda s: (min(vec_a[s], vec_b[s]), s.name),
        reverse=True,
    )[:5]

    return distance, explanation


__all__ = ["occupation_distance"]
