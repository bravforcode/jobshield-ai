"""Build the PPMI skill co-occurrence graph (spec v2 section 3.2).

This is a near-verbatim translation of the spec pseudocode. The only
additions are: empty-input guards, `log` from math (natural log per the
spec formula), and the canonicalization step that already lives in
skill_extractor.canonicalize.
"""
from __future__ import annotations

import math
from collections import defaultdict
from itertools import combinations

from jobshield.graph.skill_extractor import canonicalize, extract_skills_llm
from jobshield.types import JobPosting, SkillGraph, SkillTag


def build_skill_graph(postings: list[JobPosting]) -> SkillGraph:
    """Build a PPMI-weighted skill co-occurrence graph from job postings.

    Spec v2 §3.2 — positive PMI is the only edge weight kept. The edge key is
    the sorted tuple of `SkillTag.name` (so the same pair queried in either
    order hits the same entry — matches SkillGraph.has_edge / edge_weight).
    """
    if not postings:
        return SkillGraph()

    skill_freq: dict[SkillTag, int] = defaultdict(int)
    pair_freq: dict[tuple[SkillTag, SkillTag], int] = defaultdict(int)
    n = len(postings)

    for posting in postings:
        # The spec assumes skills are cached on the posting. If they are not
        # set, run the (mock) extractor + canonicalize.
        if posting.skills:
            skills_tags = list(posting.skills)
        else:
            raw = extract_skills_llm(posting.text)
            names = canonicalize(raw)
            skills_tags = [SkillTag(name=n) for n in names]

        # De-dup within a posting so a skill that appears 3 times only
        # counts once for both skill_freq and pair_freq.
        unique_tags = list({t.name: t for t in skills_tags}.values())

        for tag in unique_tags:
            skill_freq[tag] += 1

        sorted_names = sorted(t.name for t in unique_tags)
        for a_name, b_name in combinations(sorted_names, 2):
            key = (SkillTag(name=a_name), SkillTag(name=b_name))
            pair_freq[key] += 1

    edges: dict[tuple[SkillTag, SkillTag], float] = {}
    for pair, freq in pair_freq.items():
        s1, s2 = pair
        # Guard against the impossible (skill in pair_freq but not in
        # skill_freq) — should not happen, but stay safe.
        f1 = skill_freq.get(s1, 0)
        f2 = skill_freq.get(s2, 0)
        if f1 == 0 or f2 == 0:
            continue

        p_s1 = f1 / n
        p_s2 = f2 / n
        p_s12 = freq / n

        # Spec formula EXACTLY: log(p_s12 / (p_s1 * p_s2))
        pmi = math.log(p_s12 / (p_s1 * p_s2))
        ppmi = max(pmi, 0.0)  # PPMI — drop sub-independence pairs

        if ppmi > 0:
            edges[pair] = ppmi

    return SkillGraph(
        nodes=set(skill_freq.keys()),
        edges=edges,
        freq=dict(skill_freq),
    )
