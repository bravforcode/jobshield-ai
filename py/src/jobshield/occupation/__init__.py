"""Occupation-level layer (spec v2 section 4).

  build_occupation_vectors  — TF * skill-specificity vectors, L2-normalized
  occupation_distance       — explainable distance with direct + indirect overlap
"""
from __future__ import annotations

from jobshield.occupation.build_vectors import build_occupation_vectors
from jobshield.occupation.distance import occupation_distance

__all__ = ["build_occupation_vectors", "occupation_distance"]
