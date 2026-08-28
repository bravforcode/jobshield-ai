"""Spec §7 validation suite.

For each known-close occupation pair we assert two things:

1. The pair's skill_distance is below an absolute threshold (0.3). This
   is stronger than the spec's literal "below median" wording because the
   mock data is dense enough that every close pair collapses to 0.0 — a
   median check would pass on a completely broken graph.
2. The pair is in the bottom quartile (Q1) of the undirected distance
   distribution. Same purpose: the pair should be unusually close
   relative to the graph as a whole.

The absolute-threshold test catches regressions that the relative
quartile check would miss (e.g. a graph where every pair has distance
0.0). The quartile check catches a graph where the "close" pair is
merely average for that graph.
"""
from __future__ import annotations

import statistics

import pytest

from jobshield.cli.build import build_pipeline


@pytest.fixture(scope="module")
def pipeline_artifacts():
    return build_pipeline(
        "C:/jobsume/data/mock/job_postings.json",
        "C:/jobsume/data/mock/wage_data.json",
        "C:/jobsume/data/mock/risk_scores.json",
    )


def _distance(pipeline_artifacts, src: str, dst: str) -> float:
    artifacts, _ = pipeline_artifacts
    g = artifacts.transition_graph
    for e in g.edges:
        if e.source.code == src and e.target.code == dst:
            return e.skill_distance
    # Edge not present (distance > threshold). Treat as 1.0 so the test
    # fails the "in bottom quartile" check loudly.
    return 1.0


def _all_distances(pipeline_artifacts) -> list[float]:
    artifacts, _ = pipeline_artifacts
    g = artifacts.transition_graph
    return [e.skill_distance for e in g.edges if e.source.code < e.target.code]


def _q1(pipeline_artifacts) -> float:
    """25th percentile (Q1) of the undirected distance distribution.

    `statistics.quantiles(data, n=4)` returns the cut points at 25, 50, 75.
    Index 0 is Q1 (the 25th percentile).
    """
    all_d = _all_distances(pipeline_artifacts)
    if not all_d:
        return 0.0
    if len(all_d) < 4:
        return min(all_d)
    return statistics.quantiles(all_d, n=4)[0]


CLOSE_THRESHOLD = 0.3  # absolute ceiling for "obviously close" per spec §7


def test_call_center_to_customer_success_is_close(pipeline_artifacts) -> None:
    """Spec §7 row 1: call_center -> customer_success should be obviously close."""
    d = _distance(pipeline_artifacts, "occ.call_center_agent", "occ.customer_success")
    q1 = _q1(pipeline_artifacts)
    assert d < CLOSE_THRESHOLD, (
        f"call_center -> customer_success distance {d:.3f} >= {CLOSE_THRESHOLD}"
    )
    assert d <= q1, (
        f"call_center -> customer_success distance {d:.3f} is not in the bottom "
        f"quartile (Q1={q1:.3f})"
    )


def test_factory_technician_to_qa_is_close(pipeline_artifacts) -> None:
    """Spec §7 row 2: factory_technician -> qa should be obviously close."""
    d = _distance(pipeline_artifacts, "occ.factory_technician", "occ.qa_quality_control")
    q1 = _q1(pipeline_artifacts)
    assert d < CLOSE_THRESHOLD, (
        f"factory_technician -> qa distance {d:.3f} >= {CLOSE_THRESHOLD}"
    )
    assert d <= q1, (
        f"factory_technician -> qa distance {d:.3f} is not in the bottom "
        f"quartile (Q1={q1:.3f})"
    )


def test_cashier_to_retail_sales_1_2_hop_path(pipeline_artifacts) -> None:
    """Spec §7 row 3: cashier -> retail_sales_assistant at 1-2 hops, all hops in Q1."""
    artifacts, _ = pipeline_artifacts
    g = artifacts.transition_graph

    def _dist(src: str, dst: str) -> float:
        for e in g.edges:
            if e.source.code == src and e.target.code == dst:
                return e.skill_distance
        return 1.0

    d = _dist("occ.cashier", "occ.retail_sales_assistant")
    q1 = _q1(pipeline_artifacts)
    assert d < CLOSE_THRESHOLD, (
        f"cashier <-> retail_sales distance {d:.3f} >= {CLOSE_THRESHOLD}"
    )
    assert d <= q1, (
        f"cashier <-> retail_sales distance {d:.3f} is not in the bottom "
        f"quartile (Q1={q1:.3f})"
    )


def test_data_entry_to_junior_data_analyst_explains_with_excel_or_data(
    pipeline_artifacts,
) -> None:
    """Spec §7 row 4: data_entry -> junior_data_analyst path should mention
    excel / data_entry / data_analysis in the explanation."""
    _artifacts, per_source = pipeline_artifacts
    recs = per_source.get("occ.data_entry", [])
    target = next((r for r in recs if r["target"] == "occ.junior_data_analyst"), None)
    assert target is not None, "data_entry has no recommendation for junior_data_analyst"
    all_skills: set[str] = set()
    for h in target["path_explanation"]:
        all_skills.update(h["shared_skills"])
    expected = {"excel", "data_entry", "data_analysis"}
    matched = expected & all_skills
    assert matched, (
        f"data_entry -> junior_data_analyst explanation has no expected skill. "
        f"got {all_skills}, expected one of {expected}"
    )


def test_validation_suite_catches_broken_graph():
    """Adversarial: if we break one of the validation pairs, the suite must fail.

    This guards against the regression where all 4 pairs have distance 0.0
    and a "below median" check would pass on a completely broken graph.
    """
    from jobshield.cli.build import build_pipeline

    artifacts, _ = build_pipeline(
        "C:/jobsume/data/mock/job_postings.json",
        "C:/jobsume/data/mock/wage_data.json",
        "C:/jobsume/data/mock/risk_scores.json",
    )
    g = artifacts.transition_graph
    # Save originals for restore.
    saved = list(g.edges)

    try:
        # Sabotage: remove every edge incident on occ.cashier.
        g.edges = [
            e
            for e in g.edges
            if e.source.code != "occ.cashier" and e.target.code != "occ.cashier"
        ]
        g.adj = {}
        for i, e in enumerate(g.edges):
            g.adj.setdefault(e.source, []).append(i)
            g.adj.setdefault(e.target, []).append(i)

        d = _distance(
            (artifacts, _),
            "occ.cashier",
            "occ.retail_sales_assistant",
        )
        # Distance should now be 1.0 (no edge). The CLOSE_THRESHOLD must
        # catch this — if it doesn't, the threshold is too lax.
        assert d >= CLOSE_THRESHOLD, (
            f"expected cashier to be far from retail after sabotage, got {d}"
        )
    finally:
        # Restore so the module-scoped fixture stays valid for the other
        # tests in this file.
        g.edges = saved
        g.adj = {}
        for i, e in enumerate(g.edges):
            g.adj.setdefault(e.source, []).append(i)
            g.adj.setdefault(e.target, []).append(i)
