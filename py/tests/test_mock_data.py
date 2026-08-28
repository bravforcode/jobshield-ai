"""Sanity checks for the mock data loaders (spec §9)."""
from __future__ import annotations

import pytest

from jobshield.data import load_postings, load_risk_scores, load_wage_data
from jobshield.types import JobPosting, OccupationCode


@pytest.fixture(scope="module")
def postings() -> list[JobPosting]:
    return load_postings("C:/jobsume/data/mock/job_postings.json")


@pytest.fixture(scope="module")
def wage() -> dict[OccupationCode, object]:
    return load_wage_data("C:/jobsume/data/mock/wage_data.json")


@pytest.fixture(scope="module")
def risk() -> dict[OccupationCode, float]:
    return load_risk_scores("C:/jobsume/data/mock/risk_scores.json")


def test_postings_total_meets_mvp_floor(postings: list[JobPosting]) -> None:
    assert len(postings) >= 150, f"expected >=150 postings, got {len(postings)}"


def test_every_occupation_has_postings(postings: list[JobPosting]) -> None:
    by_occ: dict[OccupationCode, int] = {}
    for p in postings:
        by_occ[p.occupation] = by_occ.get(p.occupation, 0) + 1
    # 18 occupations (per spec §9), each with at least 6 postings.
    assert len(by_occ) >= 15
    for occ, n in by_occ.items():
        assert n >= 6, f"occupation {occ.code} has only {n} postings"


def test_every_occupation_has_wage_and_risk(
    postings: list[JobPosting], wage, risk
) -> None:
    occ_codes = {p.occupation.code for p in postings}
    for code in occ_codes:
        assert any(o.code == code for o in wage), f"missing wage for {code}"
        assert any(o.code == code for o in risk), f"missing risk for {code}"


def test_extractor_populated_skills(postings: list[JobPosting]) -> None:
    """At least some postings should have extracted skills (not all empty)."""
    with_skills = [p for p in postings if p.skills]
    assert len(with_skills) > 100, f"only {len(with_skills)} postings got skills"
    # Spot-check: data_entry postings should produce data_entry / excel / data_analysis
    for p in postings:
        if p.occupation.code == "occ.data_entry":
            names = {s.name for s in p.skills}
            assert "excel" in names or "data_entry" in names, (
                f"data_entry posting {p.posting_id} lost expected skills: {names}"
            )
            break


def test_wage_values_in_realistic_range(wage) -> None:
    for occ, stats in wage.items():
        assert 10_000 <= stats.median <= 60_000, (
            f"{occ.code} wage {stats.median} out of expected 10k-60k range"
        )


def test_risk_values_in_unit_interval(risk) -> None:
    for occ, r in risk.items():
        assert 0.0 <= r <= 1.0, f"{occ.code} risk {r} not in [0, 1]"
