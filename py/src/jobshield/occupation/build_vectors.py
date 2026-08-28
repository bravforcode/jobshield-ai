"""Build per-occupation skill vectors (spec v2 section 4.1).

For each occupation:
    vec[skill] = tf * (1 / (degree(skill) + 1))   then  L2-normalize

where tf = count(occ, skill) / sum_all_skills(occ).

High-degree skills (skills that co-occur with many others) are generic
(e.g. "communication") and get down-weighted; low-degree skills
(e.g. "kdb+") survive — they are what makes this occupation distinct.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from math import sqrt

from jobshield.types import JobPosting, OccupationCode, OccupationVectors, SkillGraph


def _normalize_l2(vec: dict) -> dict:
    """L2-normalize a sparse {key: float} vector. Empty -> empty."""
    if not vec:
        return {}
    norm = sqrt(sum(v * v for v in vec.values()))
    if norm == 0.0:
        # All entries are zero — no signal. Return as-is rather than NaN.
        return dict(vec)
    return {k: v / norm for k, v in vec.items()}


def build_occupation_vectors(
    postings: list[JobPosting],
    skill_graph: SkillGraph,
) -> OccupationVectors:
    """Count per-(occ, skill), weight by tf * specificity, L2-normalize.

    Args:
        postings: Each `posting.skills` must already be a list[SkillTag] of
            canonicalized skills (per the spec, subagent A owns canonicalization
            upstream of this step).
        skill_graph: Used only to read `degree(skill)` for the specificity
            down-weight. Edges/freq are not consumed here.

    Returns:
        OccupationVectors with both the normalized vectors and the raw counts
        (the counts are useful for debugging / fallback heuristics downstream).
    """
    occ_skill_count: dict[OccupationCode, Counter] = defaultdict(Counter)
    for posting in postings:
        if not posting.skills:
            continue
        occ = posting.occupation
        for skill in posting.skills:
            occ_skill_count[occ][skill] += 1

    vectors: dict[OccupationCode, dict] = {}
    for occ, counter in occ_skill_count.items():
        total = sum(counter.values())
        if total == 0:
            # Defensive: an occupation with no counted skills has an empty vec.
            vectors[occ] = {}
            continue
        weighted: dict = {}
        for skill, count in counter.items():
            tf = count / total
            specificity = 1.0 / (skill_graph.degree(skill) + 1)
            weighted[skill] = tf * specificity
        vectors[occ] = _normalize_l2(weighted)

    return OccupationVectors(vectors=vectors, counts=dict(occ_skill_count))


__all__ = ["build_occupation_vectors"]
