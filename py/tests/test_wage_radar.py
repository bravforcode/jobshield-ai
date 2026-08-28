"""Tests for spec v2 section 6 (centrality + Wage Radar)."""
from __future__ import annotations

import math

from jobshield.types import Centrality, OccupationCode, UnderpaymentSignal, WageStats
from jobshield.wage import (
    all_underpayment_signals,
    betweenness_centrality_brandes,
    degree_centrality,
    regression_predict,
    underpayment_signal,
)


def test_degree_centrality_star(star_transition_graph) -> None:
    cent = degree_centrality(star_transition_graph)
    # Center has degree 3 -> max -> 1.0. Each leaf has degree 1 -> 1/3.
    leaves = [n for n in star_transition_graph.nodes if n.code != "occ.center"]
    center = next(n for n in star_transition_graph.nodes if n.code == "occ.center")
    assert math.isclose(cent[center], 1.0)
    for leaf in leaves:
        assert math.isclose(cent[leaf], 1.0 / 3.0, rel_tol=1e-9)


def test_degree_centrality_single_node_is_all_zero() -> None:
    from jobshield.types import TransitionGraph

    only = OccupationCode(code="only", label="Only")
    g = TransitionGraph()
    g.nodes = {only}
    cent = degree_centrality(g)
    assert cent == {only: 0.0}


def test_betweenness_centrality_line(line_transition_graph) -> None:
    cent = betweenness_centrality_brandes(line_transition_graph)
    by_code = {n.code: v for n, v in cent.items()}
    # B sits on every shortest A<->C path -> max -> 1.0.
    assert math.isclose(by_code["occ.b"], 1.0)
    # A and C are endpoints -> 0 betweenness.
    assert math.isclose(by_code["occ.a"], 0.0)
    assert math.isclose(by_code["occ.c"], 0.0)


def test_betweenness_centrality_star(star_transition_graph) -> None:
    cent = betweenness_centrality_brandes(star_transition_graph)
    by_code = {n.code: v for n, v in cent.items()}
    # Center is on every leaf<->leaf shortest path -> max -> 1.0.
    assert math.isclose(by_code["occ.center"], 1.0)
    for i in range(3):
        assert math.isclose(by_code[f"occ.leaf{i}"], 0.0)


def test_regression_predict_recovers_linear() -> None:
    xs = [1.0, 2.0, 3.0, 4.0]
    ys = [2.0, 4.0, 6.0, 8.0]
    assert math.isclose(regression_predict(5.0, xs, ys), 10.0)
    assert math.isclose(regression_predict(0.0, xs, ys), 0.0)


def test_regression_predict_zero_variance_x_returns_mean() -> None:
    xs = [3.0, 3.0, 3.0, 3.0]
    ys = [10.0, 20.0, 30.0, 40.0]
    assert math.isclose(regression_predict(3.0, xs, ys), 25.0)


def test_regression_predict_empty_input() -> None:
    assert regression_predict(1.0, [], []) == 0.0


def test_underpayment_signal_zero_gap_when_on_regression() -> None:
    """a, b, c on the line y = 5000 + 5000*x; a sits exactly on it.

    OLS check: mean_x=0.5, mean_y=7500.
    sxx = 0.25 + 0 + 0.25 = 0.5
    sxy = 0.5*2500 + 0*0 + (-0.5)*(-2500) = 1250+0+1250 = 2500
    slope = 2500/0.5 = 5000, intercept = 7500 - 5000*0.5 = 5000.
    predicted at x=1: 10000, actual 10000 -> gap = 0.
    """
    a = OccupationCode(code="a", label="A")
    b = OccupationCode(code="b", label="B")
    c = OccupationCode(code="c", label="C")
    cent = Centrality(degree={a: 1.0, b: 0.5, c: 0.0}, betweenness={})
    wages = {a: WageStats(median=10_000), b: WageStats(median=7_500), c: WageStats(median=5_000)}
    sig = underpayment_signal(a, cent, wages, [a, b, c])
    assert math.isclose(sig.gap_ratio, 0.0, abs_tol=1e-9)


def test_underpayment_signal_explicit_below() -> None:
    """Three-occupation OLS — verify the math, not a memorized value.

    Setup: centrality x = [0, 1, 2], wages y = [5000, 20000, 30000].
    OLS: mean_x=1, mean_y=18333.33
    sxx = 1+0+1 = 2
    sxy = (0-1)(5000-18333) + 0*0 + (2-1)(30000-18333)
        = (-1)(-13333) + 0 + (1)(11667) = 13333 + 11667 = 25000
    slope = 25000/2 = 12500, intercept = 18333 - 12500 = 5833
    predicted at a(x=0) = 5833
    gap = (5833 - 5000) / 5833 = 0.143
    """
    a = OccupationCode(code="a", label="A")
    b = OccupationCode(code="b", label="B")
    c = OccupationCode(code="c", label="C")
    cent = Centrality(degree={a: 0.0, b: 1.0, c: 2.0}, betweenness={})
    wages = {a: WageStats(median=5_000), b: WageStats(median=20_000), c: WageStats(median=30_000)}
    sig = underpayment_signal(a, cent, wages, [a, b, c])
    assert math.isclose(sig.actual_wage, 5_000)
    assert math.isclose(sig.predicted_wage, 5_833.33, abs_tol=0.1)
    assert math.isclose(sig.gap_ratio, 0.143, abs_tol=0.01)
    # Positive gap = underpaid signal.
    assert sig.gap_ratio > 0


def test_all_underpayment_signals_matches_list_size() -> None:
    occs = [OccupationCode(code=f"o{i}", label=f"O{i}") for i in range(4)]
    cent = Centrality(degree={o: float(i) for i, o in enumerate(occs)}, betweenness={})
    wages = {o: WageStats(median=10_000 + i * 1000) for i, o in enumerate(occs)}
    sigs = all_underpayment_signals(cent, wages)
    assert len(sigs) == 4
    assert all(isinstance(s, UnderpaymentSignal) for s in sigs)
