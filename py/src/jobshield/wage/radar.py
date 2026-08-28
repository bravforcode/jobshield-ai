"""Wage Radar: per-occupation underpayment signal (spec 6.2).

Regress actual median wage on centrality over the whole market, then compare
the predicted wage (what the occupation "should" earn given its network
position) to its actual median. Positive gap = underpayment signal.
"""
from __future__ import annotations

from jobshield.types import (
    Centrality,
    OccupationCode,
    UnderpaymentSignal,
    WageStats,
)
from jobshield.wage.regression import regression_predict


def underpayment_signal(
    occ: OccupationCode,
    centrality: Centrality,
    wage_data: dict[OccupationCode, WageStats],
    all_occupations: list[OccupationCode],
) -> UnderpaymentSignal:
    """Compute (predicted, actual, gap_ratio) for `occ`.

    `centrality` must have both `degree` and (optionally) `betweenness`. We
    use degree centrality for the regression — it's the must-have, and
    spec 6.2 says Brandes is the stretch goal that we *also* compute, but
    the regression itself can run on either; degree is the simpler and
    more interpretable predictor.
    """
    xs = [centrality.degree[o] for o in all_occupations]
    ys = [wage_data[o].median for o in all_occupations]
    actual = wage_data[occ].median
    predicted = regression_predict(centrality.degree[occ], xs, ys)
    gap = (predicted - actual) / predicted if predicted != 0 else 0.0
    return UnderpaymentSignal(
        occ=occ,
        actual_wage=actual,
        predicted_wage=predicted,
        gap_ratio=gap,
    )


def all_underpayment_signals(
    centrality: Centrality,
    wage_data: dict[OccupationCode, WageStats],
) -> list[UnderpaymentSignal]:
    occs = list(wage_data.keys())
    return [underpayment_signal(o, centrality, wage_data, occs) for o in occs]


__all__ = ["all_underpayment_signals", "underpayment_signal"]
