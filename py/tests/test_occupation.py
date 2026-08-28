"""Tests for spec v2 section 4.1-4.2 (occupation vectors + distance)."""
from __future__ import annotations

import itertools
import math

import pytest

from jobshield.occupation import build_occupation_vectors, occupation_distance
from jobshield.types import (
    JobPosting,
    OccupationCode,
    OccupationVectors,
    SkillGraph,
    SkillTag,
)


def s(name: str) -> SkillTag:
    return SkillTag(name=name)


# ---------- 4.1 build_occupation_vectors ------------------------------------


def test_vector_is_l2_normalized(small_skill_graph, two_postings):
    """Every non-empty occupation vector must have L2 norm ≈ 1."""
    occ_vecs = build_occupation_vectors(two_postings, small_skill_graph)
    for occ, vec in occ_vecs.vectors.items():
        assert vec, f"empty vector for {occ.code}"
        norm_sq = sum(v * v for v in vec.values())
        assert math.isclose(norm_sq, 1.0, abs_tol=1e-9), (
            f"L2 norm squared for {occ.code} = {norm_sq} (expected 1.0)"
        )


def test_specificity_downweights_high_degree_skill(small_skill_graph):
    """A high-degree skill should receive a smaller per-skill weight than a
    low-degree skill that appears the same number of times — BEFORE the
    L2-normalize step cancels some of that out.

    Here `python` (degree 3) and `warehouse` (degree 1) each appear once
    in a single-occupation corpus. Their raw (pre-normalize) weights must
    satisfy warehouse > python by the specificity ratio (1/2) / (1/4) = 2x.
    """
    postings = [
        JobPosting(
            posting_id="x",
            text="some posting",
            occupation=OccupationCode(code="occ.x", label="X"),
            skills=[s("python"), s("warehouse")],
        )
    ]
    occ_vecs = build_occupation_vectors(postings, small_skill_graph)
    vec = occ_vecs.vectors[OccupationCode(code="occ.x", label="X")]

    # Inspect the *raw* specificity*tf by walking the counts and the same
    # formula the builder used.
    py, wh = s("python"), s("warehouse")
    raw_py = (1 / 2) * (1.0 / (small_skill_graph.degree(py) + 1))   # tf=1/2, deg=3
    raw_wh = (1 / 2) * (1.0 / (small_skill_graph.degree(wh) + 1))   # tf=1/2, deg=1
    # Sanity: the builder's formula should be a linear reweight of these raws,
    # so the ratio survives L2-normalize (positive rescaling preserves order).
    assert raw_wh > raw_py
    assert math.isclose(vec[wh] / vec[py], raw_wh / raw_py, rel_tol=1e-9), (
        f"ratio after normalize ({vec[wh] / vec[py]:.6f}) != "
        f"expected ratio ({raw_wh / raw_py:.6f})"
    )


def test_counts_preserved_for_debug(small_skill_graph, two_postings):
    """The `counts` field is the raw pre-normalize counts — used for
    debugging / fallback heuristics. It must reflect each posting's skills."""
    occ_vecs = build_occupation_vectors(two_postings, small_skill_graph)
    counts_a = occ_vecs.counts[OccupationCode(code="occ.a", label="Occupation A")]
    counts_b = occ_vecs.counts[OccupationCode(code="occ.b", label="Occupation B")]
    assert counts_a[s("python")] == 1
    assert counts_a[s("sql")] == 1
    assert counts_b[s("python")] == 1
    assert counts_b[s("kdb_plus")] == 1


def test_empty_postings_returns_empty_vectors(small_skill_graph):
    occ_vecs = build_occupation_vectors([], small_skill_graph)
    assert occ_vecs.vectors == {}
    assert occ_vecs.counts == {}


def test_posting_with_no_skills_is_skipped(small_skill_graph):
    """A posting whose `skills` list is empty contributes nothing."""
    postings = [
        JobPosting(
            posting_id="empty",
            text="",
            occupation=OccupationCode(code="occ.e", label="E"),
            skills=[],
        )
    ]
    occ_vecs = build_occupation_vectors(postings, small_skill_graph)
    assert occ_vecs.vectors == {}


# ---------- 4.2 occupation_distance -----------------------------------------


def _make_occ_vectors(occ, skills: list[str]) -> OccupationVectors:
    """Build a one-occupation OccupationVectors from raw skill names."""
    occ_skills = [s(name) for name in skills]
    return build_occupation_vectors(
        [
            JobPosting(
                posting_id="p",
                text="",
                occupation=occ,
                skills=occ_skills,
            )
        ],
        # Empty graph: tests that rely on the graph pass a real one.
        SkillGraph(),
    )


def test_distance_identical_vectors_is_zero(small_skill_graph):
    occ = OccupationCode(code="occ.x", label="X")
    occ_vecs = build_occupation_vectors(
        [
            JobPosting(posting_id="p", text="", occupation=occ, skills=[s("python"), s("sql")]),
        ],
        small_skill_graph,
    )
    d, explanation = occupation_distance(occ, occ, occ_vecs, small_skill_graph)
    assert math.isclose(d, 0.0, abs_tol=1e-9)
    # Explanation should include the shared skills.
    assert {sk.name for sk in explanation} == {"python", "sql"}


def test_distance_orthogonal_occupations_is_one(small_skill_graph):
    """Two occupations sharing no skills and connected by no PPMI edge
    must have distance 1.0 (similarity = 0)."""
    # Use an empty graph so only direct overlap contributes to similarity.
    # (The fixture's `small_skill_graph` has a python-warehouse PPMI edge,
    #  so reusing it here would let indirect overlap bring d below 1.0.)
    empty_g = SkillGraph()
    occ_x = OccupationCode(code="occ.x", label="X")
    occ_y = OccupationCode(code="occ.y", label="Y")
    occ_vecs = build_occupation_vectors(
        [
            JobPosting(posting_id="x1", text="", occupation=occ_x, skills=[s("alpha")]),
            JobPosting(posting_id="y1", text="", occupation=occ_y, skills=[s("beta")]),
        ],
        empty_g,
    )
    d, explanation = occupation_distance(occ_x, occ_y, occ_vecs, empty_g)
    assert math.isclose(d, 1.0, abs_tol=1e-9)
    assert explanation == []


def test_indirect_ppmi_edge_reduces_distance(small_skill_graph):
    """Two occupations with no shared skill but a PPMI edge between their
    unique skills must have distance < 1.0 (similarity > 0 from indirect)."""
    occ_x = OccupationCode(code="occ.x", label="X")
    occ_y = OccupationCode(code="occ.y", label="Y")
    # x has only `sql`; y has only `excel`. The fixture has an `sql -- excel`
    # edge with PPMI weight 0.5, so indirect > 0.
    occ_vecs = build_occupation_vectors(
        [
            JobPosting(posting_id="x1", text="", occupation=occ_x, skills=[s("sql")]),
            JobPosting(posting_id="y1", text="", occupation=occ_y, skills=[s("excel")]),
        ],
        small_skill_graph,
    )
    d, explanation = occupation_distance(occ_x, occ_y, occ_vecs, small_skill_graph)
    assert 0.0 <= d < 1.0, f"expected dist in (0, 1) from indirect PPMI, got {d}"
    assert explanation == []  # no direct overlap


def test_indirect_reduction_beats_no_indirect(small_skill_graph):
    """Distance with the PPMI edge must be smaller than distance without
    (i.e. similarity is larger when the bridge exists)."""
    occ_x = OccupationCode(code="occ.x", label="X")
    occ_y = OccupationCode(code="occ.y", label="Y")
    occ_vecs = build_occupation_vectors(
        [
            JobPosting(posting_id="x1", text="", occupation=occ_x, skills=[s("sql")]),
            JobPosting(posting_id="y1", text="", occupation=occ_y, skills=[s("excel")]),
        ],
        small_skill_graph,
    )
    # With the PPMI edge (fixture)
    d_with, _ = occupation_distance(occ_x, occ_y, occ_vecs, small_skill_graph)
    # Without the edge: use an empty graph (only direct overlap counts)
    empty_g = SkillGraph()
    d_without, _ = occupation_distance(occ_x, occ_y, occ_vecs, empty_g)
    assert d_with < d_without, (
        f"PPMI bridge should reduce distance: with={d_with:.6f} "
        f"without={d_without:.6f}"
    )


@pytest.mark.parametrize(
    ("occ_x_skills", "occ_y_skills"),
    [
        # Identical
        (["python", "sql"], ["python", "sql"]),
        # Disjoint
        (["alpha"], ["beta"]),
        # Partial overlap
        (["python", "sql"], ["python", "excel"]),
        # Indirect-only (PPMI bridge)
        (["sql"], ["excel"]),
    ],
)
def test_distance_is_in_unit_interval(
    small_skill_graph, occ_x_skills, occ_y_skills
):
    occ_x = OccupationCode(code="occ.x", label="X")
    occ_y = OccupationCode(code="occ.y", label="Y")
    occ_vecs = build_occupation_vectors(
        [
            JobPosting(posting_id="x1", text="", occupation=occ_x, skills=[s(n) for n in occ_x_skills]),
            JobPosting(posting_id="y1", text="", occupation=occ_y, skills=[s(n) for n in occ_y_skills]),
        ],
        small_skill_graph,
    )
    d, _ = occupation_distance(occ_x, occ_y, occ_vecs, small_skill_graph)
    assert 0.0 <= d <= 1.0, f"distance {d} not in [0, 1]"


def test_distance_is_symmetric(small_skill_graph):
    occ_x = OccupationCode(code="occ.x", label="X")
    occ_y = OccupationCode(code="occ.y", label="Y")
    occ_vecs = build_occupation_vectors(
        [
            JobPosting(posting_id="x1", text="", occupation=occ_x, skills=[s("python"), s("sql")]),
            JobPosting(posting_id="y1", text="", occupation=occ_y, skills=[s("python"), s("excel")]),
        ],
        small_skill_graph,
    )
    d_xy, exp_xy = occupation_distance(occ_x, occ_y, occ_vecs, small_skill_graph)
    d_yx, exp_yx = occupation_distance(occ_y, occ_x, occ_vecs, small_skill_graph)
    assert math.isclose(d_xy, d_yx, abs_tol=1e-12)
    assert {sk.name for sk in exp_xy} == {sk.name for sk in exp_yx}


def test_explanation_top5_in_descending_order(small_skill_graph):
    """When >5 skills are shared, the explanation must be the top-5 by
    min(vec_a[s], vec_b[s]) in strictly non-increasing order."""
    occ_x = OccupationCode(code="occ.x", label="X")
    occ_y = OccupationCode(code="occ.y", label="Y")
    # 7 shared skills with deliberately different counts in each occupation.
    shared = [f"sk{i}" for i in range(7)]
    # In x: each shared appears 1..7 times respectively.
    # In y: each shared appears 1 time.
    # So the min weight grows with the count-in-x.
    x_skills = []
    for i, name in enumerate(shared):
        x_skills.extend([s(name)] * (i + 1))
    y_skills = [s(name) for name in shared]

    occ_vecs = build_occupation_vectors(
        [
            JobPosting(posting_id="x1", text="", occupation=occ_x, skills=x_skills),
            JobPosting(posting_id="y1", text="", occupation=occ_y, skills=y_skills),
        ],
        small_skill_graph,
    )
    _, explanation = occupation_distance(occ_x, occ_y, occ_vecs, small_skill_graph)
    assert len(explanation) == 5

    # Recompute the min-weights and check the explanation matches the top-5.
    vec_x = occ_vecs.vectors[occ_x]
    vec_y = occ_vecs.vectors[occ_y]
    mins = [(min(vec_x[s(name)], vec_y[s(name)]), name) for name in shared]
    mins.sort(reverse=True)
    expected_top5_names = [name for _, name in mins[:5]]
    assert [sk.name for sk in explanation] == expected_top5_names

    # Monotonic non-increasing: explanation[i+1].min <= explanation[i].min.
    weights = [min(vec_x[s(name)], vec_y[s(name)]) for name in expected_top5_names]
    for a, b in itertools.pairwise(weights):
        assert a >= b, f"explanation not in non-increasing order: {weights}"
