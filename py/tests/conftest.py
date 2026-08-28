"""Shared pytest fixtures for the JobShield test suite (subagent B's slice).

Names are kept distinct from anything subagent A might add (`test_skill_graph.py`
defines `_OCC` and `_posting` locally, not in conftest). The fixtures here
build a tiny synthetic SkillGraph + a few JobPostings with pre-canonicalized
skills so the distance/vector tests are deterministic.
"""
from __future__ import annotations

import pytest

from jobshield.types import (
    JobPosting,
    OccupationCode,
    SkillGraph,
    SkillTag,
    TransitionEdge,
    TransitionGraph,
    WageStats,
)

# ---------- skill tag aliases (raw names -> canonical) -----------------------

def s(name: str) -> SkillTag:
    """Shorthand for a SkillTag — keeps fixture declarations readable."""
    return SkillTag(name=name)


# ---------- occupation aliases ------------------------------------------------

OCC_A = OccupationCode(code="occ.a", label="Occupation A")
OCC_B = OccupationCode(code="occ.b", label="Occupation B")
OCC_C = OccupationCode(code="occ.c", label="Occupation C")


# ---------- minimal SkillGraph fixture ---------------------------------------

@pytest.fixture
def small_skill_graph() -> SkillGraph:
    """A tiny PPMI-like graph used by the occupation distance tests.

    Topology (PPMI weights are illustrative — only relative magnitudes matter
    for these tests):

        python ── sql   (weight 2.0, high PPMI)
        python ── excel (weight 0.5)
        sql    ── excel (weight 0.5)
        python ── warehouse (weight 0.1)   # python is high-degree here

    So `python` has degree 3, `sql`/`excel` have degree 2, `warehouse` has 1.
    `python` (high-degree, generic) should be down-weighted in vectors.
    """
    g = SkillGraph()
    py, sq, xl, wh = s("python"), s("sql"), s("excel"), s("warehouse")
    g.nodes = {py, sq, xl, wh}
    g.freq = {py: 4, sq: 3, xl: 2, wh: 1}

    def _k(a: SkillTag, b: SkillTag) -> tuple[SkillTag, SkillTag]:
        return (a, b) if a.name <= b.name else (b, a)

    g.edges = {
        _k(py, sq): 2.0,
        _k(py, xl): 0.5,
        _k(sq, xl): 0.5,
        _k(py, wh): 0.1,
    }
    return g


@pytest.fixture
def two_postings() -> list[JobPosting]:
    """Two distinct occupations, one shared skill, one not."""
    py, sq, kdb = s("python"), s("sql"), s("kdb_plus")
    return [
        JobPosting(
            posting_id="a1",
            text="data analyst",
            occupation=OCC_A,
            skills=[py, sq],
        ),
        JobPosting(
            posting_id="b1",
            text="quant dev",
            occupation=OCC_B,
            skills=[py, kdb],
        ),
    ]


# ---------- fixtures for path-finding (subagent C) --------------------------

# Five occupations with hand-tuned skill mixes for the multi-objective test:
#  occ.x  -> occ.y    direct, low wage gain
#  occ.x  -> occ.z    direct, larger wage gain
#  occ.x  -> occ.w    2-hop via occ.y
PATH_OCC_X = OccupationCode(code="occ.x", label="X")
PATH_OCC_Y = OccupationCode(code="occ.y", label="Y")
PATH_OCC_Z = OccupationCode(code="occ.z", label="Z")
PATH_OCC_W = OccupationCode(code="occ.w", label="W")
PATH_OCC_FAR = OccupationCode(code="occ.far", label="Far")  # not connected to anything


@pytest.fixture
def path_transition_graph() -> TransitionGraph:
    """Hand-built transition graph: X - Y, X - Z, Y - W, all at distance 0.4."""
    g = TransitionGraph()
    g.nodes = {PATH_OCC_X, PATH_OCC_Y, PATH_OCC_Z, PATH_OCC_W, PATH_OCC_FAR}

    def _e(a: OccupationCode, b: OccupationCode, d: float = 0.4) -> tuple[int, int]:
        fwd = TransitionEdge(source=a, target=b, skill_distance=d)
        rev = TransitionEdge(source=b, target=a, skill_distance=d)
        fi = len(g.edges)
        g.edges.append(fwd)
        ri = len(g.edges)
        g.edges.append(rev)
        g.adj.setdefault(a, []).append(fi)
        g.adj.setdefault(b, []).append(ri)
        return fi, ri

    _e(PATH_OCC_X, PATH_OCC_Y)
    _e(PATH_OCC_X, PATH_OCC_Z)
    _e(PATH_OCC_Y, PATH_OCC_W)
    return g


@pytest.fixture
def path_wage_data() -> dict[OccupationCode, WageStats]:
    """Wage ladder: X=10000, Y=11000, Z=20000, W=30000, Far=9000."""
    return {
        PATH_OCC_X: WageStats(median=10_000),
        PATH_OCC_Y: WageStats(median=11_000),
        PATH_OCC_Z: WageStats(median=20_000),
        PATH_OCC_W: WageStats(median=30_000),
        PATH_OCC_FAR: WageStats(median=9_000),
    }


@pytest.fixture
def path_risk_scores() -> dict[OccupationCode, float]:
    return {
        PATH_OCC_X: 0.5,
        PATH_OCC_Y: 0.5,
        PATH_OCC_Z: 0.3,
        PATH_OCC_W: 0.1,
        PATH_OCC_FAR: 0.5,
    }


# ---------- fixtures for wage / centrality (subagent D) ---------------------


@pytest.fixture
def star_transition_graph() -> TransitionGraph:
    """Star: center O, leaves A,B,C. Center degree 3, leaves degree 1."""
    g = TransitionGraph()
    center = OccupationCode(code="occ.center", label="Center")
    leaves = [OccupationCode(code=f"occ.leaf{i}", label=f"Leaf{i}") for i in range(3)]
    g.nodes = {center, *leaves}
    for leaf in leaves:
        fwd = TransitionEdge(source=center, target=leaf, skill_distance=0.5)
        rev = TransitionEdge(source=leaf, target=center, skill_distance=0.5)
        fi = len(g.edges)
        g.edges.append(fwd)
        ri = len(g.edges)
        g.edges.append(rev)
        g.adj.setdefault(center, []).append(fi)
        g.adj.setdefault(leaf, []).append(ri)
    return g


@pytest.fixture
def line_transition_graph() -> TransitionGraph:
    """Line: A - B - C. B should have the highest betweenness."""
    g = TransitionGraph()
    a = OccupationCode(code="occ.a", label="A")
    b = OccupationCode(code="occ.b", label="B")
    c = OccupationCode(code="occ.c", label="C")
    g.nodes = {a, b, c}
    for u, v in [(a, b), (b, c)]:
        fwd = TransitionEdge(source=u, target=v, skill_distance=0.4)
        rev = TransitionEdge(source=v, target=u, skill_distance=0.4)
        fi = len(g.edges)
        g.edges.append(fwd)
        ri = len(g.edges)
        g.edges.append(rev)
        g.adj.setdefault(u, []).append(fi)
        g.adj.setdefault(v, []).append(ri)
    return g
