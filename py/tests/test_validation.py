"""Spec §7 validation suite.

For each known-close occupation pair, assert the skill_distance is below
the graph median. This is the sanity gate the spec mandates before the
graph output is trusted.
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
    # fails the "below median" check loudly.
    return 1.0


def _all_distances(pipeline_artifacts) -> list[float]:
    artifacts, _ = pipeline_artifacts
    g = artifacts.transition_graph
    # Every pair of (source, target) with source < target gives one undirected dist.
    return [e.skill_distance for e in g.edges if e.source.code < e.target.code]


def test_call_center_to_customer_success_below_median(pipeline_artifacts) -> None:
    """Spec §7 row 1: call_center -> customer_success should be near each other."""
    all_d = _all_distances(pipeline_artifacts)
    median_d = statistics.median(all_d)
    d = _distance(pipeline_artifacts, "occ.call_center_agent", "occ.customer_success")
    assert d < median_d, (
        f"call_center -> customer_success distance {d:.3f} not below median {median_d:.3f}"
    )


def test_factory_technician_to_qa_below_median(pipeline_artifacts) -> None:
    all_d = _all_distances(pipeline_artifacts)
    median_d = statistics.median(all_d)
    d = _distance(pipeline_artifacts, "occ.factory_technician", "occ.qa_quality_control")
    assert d < median_d, (
        f"factory_technician -> qa distance {d:.3f} not below median {median_d:.3f}"
    )


def test_cashier_to_retail_sales_1_2_hop_path(pipeline_artifacts) -> None:
    """Spec §7 row 3: cashier -> retail_sales_assistant at 1-2 hops, all hops below median.

    The Layer-2 ranking may put junior_data_analyst ahead (huge wage gain),
    so we look at the *transition graph* directly, not the Layer-2 list.
    """
    artifacts, _ = pipeline_artifacts
    g = artifacts.transition_graph

    def _dist(src: str, dst: str) -> float:
        for e in g.edges:
            if e.source.code == src and e.target.code == dst:
                return e.skill_distance
        return 1.0

    # Undirected direct distance.
    d = _dist("occ.cashier", "occ.retail_sales_assistant")
    all_d = [e.skill_distance for e in g.edges if e.source.code < e.target.code]
    median_d = statistics.median(all_d)
    # 1 hop exists and is below median (cashier and retail share cashier+pos+customer_service).
    assert d < median_d, (
        f"cashier <-> retail_sales distance {d:.3f} not below median {median_d:.3f}"
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
    # Collect all skill names mentioned across the path.
    all_skills: set[str] = set()
    for h in target["path_explanation"]:
        all_skills.update(h["shared_skills"])
    # Adjacent skill names also count (the explanations may name direct
    # overlap plus indirect bridges, but spec asks for one of these to be
    # in the explanation).
    expected = {"excel", "data_entry", "data_analysis"}
    matched = expected & all_skills
    assert matched, (
        f"data_entry -> junior_data_analyst explanation has no expected skill. "
        f"got {all_skills}, expected one of {expected}"
    )
