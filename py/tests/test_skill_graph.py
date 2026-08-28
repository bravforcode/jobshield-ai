"""Tests for spec v2 section 3.1-3.2 (skill extraction + PPMI graph)."""
from __future__ import annotations

import math

import pytest

from jobshield.graph import build_skill_graph, canonicalize, extract_skills_llm
from jobshield.types import JobPosting, OccupationCode, SkillGraph, SkillTag

_OCC = OccupationCode(code="occ.test", label="Test")


def _posting(pid: str, text: str, skills: list[str] | None = None) -> JobPosting:
    return JobPosting(
        posting_id=pid,
        text=text,
        occupation=_OCC,
        skills=[SkillTag(name=s) for s in (skills or [])],
    )


# ---------- extract_skills_llm ---------------------------------------------


def test_extract_finds_known_english_skill():
    assert "python" in extract_skills_llm("We need a Python developer with SQL.")


def test_extract_finds_known_multiword_skill_via_alias():
    # "ms excel" is the alias — extractor must fold it to "excel".
    assert "excel" in extract_skills_llm("Must know MS Excel and accounting.")


def test_extract_finds_thai_universe_skill():
    # Skills from the EN+TH universe; "warehouse" is the canonical token.
    assert "warehouse" in extract_skills_llm("Warehouse supervisor for night shift.")


def test_extract_returns_deduped_in_order():
    # extract_skills_llm dedups internally (one entry per KNOWN_SKILL hit).
    # Canonicalize is also idempotent, so two mentions of "python" yield one.
    out = extract_skills_llm("python python")
    assert out == ["python"]
    assert out.count("python") == 1


def test_extract_empty_text_returns_empty():
    assert extract_skills_llm("") == []


def test_extract_unknown_skill_dropped_by_canonicalize():
    # "rock-climbing" is not in our universe; canonicalize must drop it.
    assert "rock-climbing" not in canonicalize(["rock-climbing", "python"])
    assert "python" in canonicalize(["rock-climbing", "python"])


# ---------- canonicalize ----------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        # direct aliases
        (["MS Excel"], ["excel"]),
        (["js"], ["javascript"]),
        (["ml"], ["machine_learning"]),
        (["da"], ["data_analysis"]),
        (["pm"], ["project_management"]),
        (["cs"], ["customer_service"]),
        (["qc"], ["quality_control"]),
        (["qa"], ["qa_testing"]),
        (["mfg"], ["manufacturing"]),
        (["wh"], ["warehouse"]),
        # dedup preserving first-seen order
        (["python", "python", "sql"], ["python", "sql"]),
        # case folding
        (["PYTHON", "Sql"], ["python", "sql"]),
        # mixed alias + canonical
        (["ML", "python", "ml"], ["machine_learning", "python"]),
    ],
)
def test_canonicalize_aliases_and_dedup(raw, expected):
    assert canonicalize(raw) == expected


def test_canonicalize_empty():
    assert canonicalize([]) == []


def test_canonicalize_preserves_first_seen_order():
    out = canonicalize(["warehouse", "python", "warehouse", "sql", "python"])
    assert out == ["warehouse", "python", "sql"]


# ---------- build_skill_graph ----------------------------------------------


def test_build_skill_graph_empty_postings_returns_empty_graph():
    g = build_skill_graph([])
    assert isinstance(g, SkillGraph)
    assert g.nodes == set()
    assert g.edges == {}
    assert g.freq == {}


def test_build_skill_graph_extracts_skills_when_posting_skills_blank():
    # Postings without pre-cached .skills should fall back to text extraction.
    postings = [
        _posting("p1", "Need python and sql developer."),
        _posting("p2", "Python, sql, excel required."),
    ]
    g = build_skill_graph(postings)
    assert {n.name for n in g.nodes} >= {"python", "sql", "excel"}
    assert g.freq[SkillTag(name="python")] == 2
    assert g.freq[SkillTag(name="sql")] == 2


def test_build_skill_graph_ppmi_is_nonnegative_for_all_edges():
    postings = [
        _posting("p1", "python sql excel"),
        _posting("p2", "python sql"),
        _posting("p3", "python excel"),
        _posting("p4", "sql excel"),
        _posting("p5", "warehouse logistics inventory"),
    ]
    g = build_skill_graph(postings)
    assert g.edges, "expected some co-occurrence edges"
    for w in g.edges.values():
        assert w > 0.0  # spec: only store if ppmi > 0


def test_build_skill_graph_edge_key_is_sorted_canonical():
    postings = [
        _posting("p1", "python sql"),
        _posting("p2", "python sql"),
        _posting("p3", "sql python"),
    ]
    g = build_skill_graph(postings)
    # Every edge key must be (smaller, larger) by name.
    for (a, b) in g.edges:
        assert a.name <= b.name, f"non-canonical edge key: {(a.name, b.name)}"


def test_build_skill_graph_high_cooccurrence_means_high_ppmi():
    # Two pairs {python,sql} and {warehouse,inventory}. PPMI uses JOINT vs
    # product of marginals (not just co-occurrence ratio), so the pair with
    # the higher joint-vs-marginal surprise wins — not the pair that's
    # always together. With N=18:
    #   {python,sql}:     p=10/18, p=10/18, joint=10/18  -> log(1.8)  ≈ 0.588
    #   {warehouse,inv}:  p=5/18,  p=5/18,  joint=2/18   -> log(1.44) ≈ 0.365
    # So python+sql beats warehouse+inventory even though the latter has
    # a higher *conditional* co-occurrence rate (2/3 > 10/10 isn't true,
    # 10/10 = 1.0; but 2/3 ≈ 0.667 also beats 0.5 — yet PPMI does not care).
    postings = []
    for i in range(10):
        postings.append(_posting(f"a{i}", f"posting {i}", skills=["python", "sql"]))
    for i in range(3):
        postings.append(_posting(f"b{i}", f"posting {i}", skills=["warehouse"]))
    for i in range(3):
        postings.append(_posting(f"c{i}", f"posting {i}", skills=["inventory"]))
    for i in range(2):
        postings.append(_posting(f"d{i}", f"posting {i}", skills=["warehouse", "inventory"]))

    g = build_skill_graph(postings)
    py, sq = SkillTag(name="python"), SkillTag(name="sql")
    wh, inv = SkillTag(name="warehouse"), SkillTag(name="inventory")

    p_pysq = g.edge_weight(py, sq)
    p_whinv = g.edge_weight(wh, inv)
    assert p_pysq > 0
    assert p_whinv > 0
    assert p_pysq > p_whinv, (
        f"expected python-sql PPMI ({p_pysq:.3f}) > "
        f"warehouse-inventory PPMI ({p_whinv:.3f})"
    )


def test_build_skill_graph_ppmi_matches_formula():
    # Hand-rolled corpus: control everything so we can compute PPMI by hand.
    # postings: 4 with {a, b}, 4 with only {a}, 4 with only {b} -> N = 12
    # p(a) = 8/12, p(b) = 8/12, p(a,b) = 4/12
    # pmi = log((4/12) / ((8/12)*(8/12))) = log((4/12) / (64/144))
    #     = log(0.333... / 0.444...) = log(0.75) ≈ -0.28768
    # ppmi = max(pmi, 0) = 0 -> no edge stored (proves the spec's "if ppmi > 0" gate).
    postings = []
    for i in range(4):
        postings.append(_posting(f"x{i}", "", skills=["alpha", "beta"]))
    for i in range(4):
        postings.append(_posting(f"y{i}", "", skills=["alpha"]))
    for i in range(4):
        postings.append(_posting(f"z{i}", "", skills=["beta"]))

    g = build_skill_graph(postings)
    alpha, beta = SkillTag(name="alpha"), SkillTag(name="beta")
    # PPMI is clamped to 0 — edge should NOT exist.
    assert g.edge_weight(alpha, beta) == 0.0
    assert not g.has_edge(alpha, beta)


def test_build_skill_graph_ppmi_strictly_positive_case():
    # Build a corpus where co-occurrence is clearly above independence:
    # 6 postings with {a, b}, 1 with only {a}, 1 with only {b} -> N = 8
    # p(a) = 7/8, p(b) = 7/8, p(a,b) = 6/8
    # pmi = log((6/8) / (49/64)) = log(0.75 / 0.765625) = log(0.97959) ≈ -0.0206
    # That's still < 0. Need stronger signal:
    # 5 postings with {a, b}, 0 with only a, 0 with only b -> trivial edge case,
    # pmi = log(5/5) = 0. So instead use 5 with {a, b} out of 6 total where
    # both a and b appear in all 6 -> pmi = log(5/6 / 1) = log(0.833) < 0.
    # Real positive PPMI requires the JOINT to exceed the PRODUCT of marginals.
    # Use 4 postings {a, b} + 1 {a} + 1 {}  -> N=6, p(a)=5/6, p(b)=4/6, p(a,b)=4/6
    # pmi = log((4/6) / (5/6 * 4/6)) = log(1 / (5/6)) = log(6/5) ≈ 0.1823 > 0 ✓
    postings = []
    for i in range(4):
        postings.append(_posting(f"p{i}", "", skills=["alpha", "beta"]))
    postings.append(_posting("p4", "", skills=["alpha"]))
    postings.append(_posting("p5", "", skills=[]))  # neither skill

    g = build_skill_graph(postings)
    alpha, beta = SkillTag(name="alpha"), SkillTag(name="beta")
    expected = math.log(6 / 5)
    assert g.has_edge(alpha, beta)
    assert math.isclose(g.edge_weight(alpha, beta), expected, rel_tol=1e-9)


def test_build_skill_graph_nodes_set_contains_all_observed_skills():
    postings = [
        _posting("a", "python"),
        _posting("b", "sql excel"),
    ]
    g = build_skill_graph(postings)
    names = {n.name for n in g.nodes}
    assert names == {"python", "sql", "excel"}


def test_extract_alias_does_not_match_substring_of_unrelated_word():
    """Regression: short aliases ('cs', 'pm', 'qa', 'qc', 'ts', 'wh', 'ml')
    used to match as substrings of unrelated words ('discuss' contains 'cs',
    'implementation' contains 'pm', 'discussing' contains 'cs'). The fix
    anchors the match on a word boundary (negative-lookahead for [a-z0-9])."""
    assert "customer_service" not in extract_skills_llm("let's discuss the process")
    assert "project_management" not in extract_skills_llm("implementation is hard")
    assert "customer_service" not in extract_skills_llm("discussion group")
    assert "qa_testing" not in extract_skills_llm("the squabble was loud")
    assert "warehouse" not in extract_skills_llm("the wharf is busy")  # 'wharf' is not 'wh'
    # Positive control: a real 'cs' token should still match.
    assert "customer_service" in extract_skills_llm("we need a cs lead")
    assert "project_management" in extract_skills_llm("hiring a pm now")
    assert "qa_testing" in extract_skills_llm("hiring a qa engineer")
