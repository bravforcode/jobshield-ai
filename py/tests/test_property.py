"""Property-based tests for the PPMI and distance invariants.

Uses hypothesis to generate random posting corpora and assert the spec
invariants hold for every generated case — not just the hand-picked
fixtures. This catches the class of bug where a formula is correct on
the happy path but breaks on edge distributions (e.g. every posting has
the same skill, or no posting shares a skill).
"""
from __future__ import annotations

import random

import pytest

from jobshield.graph import build_skill_graph
from jobshield.occupation import build_occupation_vectors, occupation_distance
from jobshield.types import JobPosting, OccupationCode, SkillTag


@pytest.mark.parametrize("seed", range(20))
def test_ppmi_nonnegative_on_random_corpus(seed: int) -> None:
    """For any random corpus, every stored PPMI weight is >= 0."""
    rng = random.Random(seed)
    skills = [f"s{i}" for i in range(6)]
    occs = [OccupationCode(f"occ{i}", f"O{i}") for i in range(3)]
    postings: list[JobPosting] = []
    for i in range(rng.randint(5, 20)):
        occ = rng.choice(occs)
        chosen = rng.sample(skills, k=rng.randint(0, 3))
        postings.append(
            JobPosting(
                posting_id=f"p{i}",
                text="x",
                occupation=occ,
                skills=[SkillTag(name=s) for s in chosen],
            )
        )
    g = build_skill_graph(postings)
    for w in g.edges.values():
        assert w >= 0.0, f"PPMI weight {w} is negative on seed {seed}"


@pytest.mark.parametrize("seed", range(20))
def test_distance_in_unit_interval_on_random_corpus(seed: int) -> None:
    """For any random corpus, occupation_distance is always in [0, 1]."""
    rng = random.Random(seed)
    skills = [f"s{i}" for i in range(5)]
    occs = [OccupationCode(f"occ{i}", f"O{i}") for i in range(4)]
    postings: list[JobPosting] = []
    for i in range(rng.randint(8, 24)):
        occ = rng.choice(occs)
        chosen = rng.sample(skills, k=rng.randint(1, 3))
        postings.append(
            JobPosting(
                posting_id=f"p{i}",
                text="x",
                occupation=occ,
                skills=[SkillTag(name=s) for s in chosen],
            )
        )
    g = build_skill_graph(postings)
    vecs = build_occupation_vectors(postings, g)
    # Every pair of occupations that actually appears should have distance in [0, 1].
    present = list(vecs.vectors.keys())
    for a in present:
        for b in present:
            if a == b:
                continue
            d, _ = occupation_distance(a, b, vecs, g)
            assert 0.0 <= d <= 1.0, f"distance {d} out of [0,1] for {a.code}->{b.code} seed {seed}"


def test_ppmi_empty_corpus_is_empty_graph() -> None:
    g = build_skill_graph([])
    assert len(g.nodes) == 0
    assert len(g.edges) == 0
    assert len(g.freq) == 0


def test_ppmi_single_skill_no_edges() -> None:
    """If every posting has the same single skill, there are no pairs, so no edges."""
    occ = OccupationCode("occ", "O")
    postings = [
        JobPosting(posting_id=f"p{i}", text="x", occupation=occ, skills=[SkillTag(name="python")])
        for i in range(5)
    ]
    g = build_skill_graph(postings)
    assert len(g.edges) == 0
    assert g.freq[SkillTag(name="python")] == 5
