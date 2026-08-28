"""JobShield AI — Thai Occupation Mobility Network core.

Layered pipeline:
  graph (PPMI skill graph)
  -> occupation (vectors + distance)
  -> path (Dijkstra + rank)
  -> wage (centrality + underpayment)
"""
from __future__ import annotations

__version__ = "0.1.0"
