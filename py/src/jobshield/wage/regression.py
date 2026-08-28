"""Simple 1D OLS regression used by the Wage Radar (spec 6.2).

y = a + b * x, closed-form. Handles degenerate input (n<2, zero-variance x)
by returning mean(y) — the spec says "regression_predict(centrality_value,
all_centrality_values, all_actual_wages)" so the signature stays (scalar x,
two parallel lists).
"""
from __future__ import annotations


def regression_predict(x: float, all_x: list[float], all_y: list[float]) -> float:
    """OLS predict y at x. Degenerate input -> mean(y)."""
    n = len(all_x)
    if n != len(all_y) or n == 0:
        return 0.0
    if n < 2:
        s = sum(all_y)
        return s / n
    mean_y = sum(all_y) / n
    mean_x = sum(all_x) / n
    sxx = sum((xi - mean_x) ** 2 for xi in all_x)
    if sxx == 0:
        # Zero-variance x — no slope is identifiable. Fall back to mean.
        return mean_y
    sxy = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(all_x, all_y, strict=False))
    slope = sxy / sxx
    intercept = mean_y - slope * mean_x
    return slope * x + intercept


__all__ = ["regression_predict"]
