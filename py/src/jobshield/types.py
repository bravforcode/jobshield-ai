"""Shared typed contracts for the JobShield pipeline.

These types are the public surface between layers. Keep them stable —
they are the contract subagents and reviewers rely on.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class SkillTag:
    """A canonicalized skill token, e.g. 'sql', 'data_visualization'."""

    name: str


@dataclass(frozen=True)
class OccupationCode:
    """Stable occupation identifier (e.g. 'occ.call_center_agent')."""

    code: str
    label: str  # human-readable Thai/EN label

    def __lt__(self, other: OccupationCode) -> bool:
        return self.code < other.code


@dataclass
class JobPosting:
    """Raw job posting (or a record derived from one)."""

    posting_id: str
    text: str
    occupation: OccupationCode
    skills: list[SkillTag] = field(default_factory=list)
    wage_median: float | None = None  # THB / month, optional


@dataclass
class SkillGraph:
    """Skill co-occurrence graph with PPMI-weighted edges."""

    nodes: set[SkillTag] = field(default_factory=set)
    edges: dict[tuple[SkillTag, SkillTag], float] = field(default_factory=dict)
    freq: dict[SkillTag, int] = field(default_factory=dict)

    def has_edge(self, a: SkillTag, b: SkillTag) -> bool:
        key = (a, b) if a.name <= b.name else (b, a)
        return key in self.edges

    def edge_weight(self, a: SkillTag, b: SkillTag) -> float:
        key = (a, b) if a.name <= b.name else (b, a)
        return self.edges.get(key, 0.0)

    def degree(self, s: SkillTag) -> int:
        return sum(1 for (x, y) in self.edges if x == s or y == s)


@dataclass
class OccupationVectors:
    """TF * skill-specificity vectors, L2-normalized, per occupation."""

    vectors: dict[OccupationCode, dict[SkillTag, float]]
    # raw counts (pre-normalization) for debugging / fallback
    counts: dict[OccupationCode, dict[SkillTag, int]] = field(default_factory=dict)

    def get(self, occ: OccupationCode) -> dict[SkillTag, float]:
        return self.vectors.get(occ, {})


@dataclass
class TransitionEdge:
    """Undirected edge in the occupation transition graph."""

    source: OccupationCode
    target: OccupationCode
    skill_distance: float  # in [0, 1]
    shared_skills: list[SkillTag] = field(default_factory=list)
    dist_norm: float = 0.0
    risk_norm: float = 0.0
    cost: float = 0.0  # alpha * dist_norm + gamma * risk_norm


@dataclass
class TransitionGraph:
    nodes: set[OccupationCode] = field(default_factory=set)
    edges: list[TransitionEdge] = field(default_factory=list)
    # adjacency: occ -> list of edge indices
    adj: dict[OccupationCode, list[int]] = field(default_factory=dict)

    def edges_from(self, occ: OccupationCode) -> list[TransitionEdge]:
        return [self.edges[i] for i in self.adj.get(occ, [])]

    def neighbors(self, occ: OccupationCode) -> list[OccupationCode]:
        return [e.target for e in self.edges_from(occ)]


@dataclass
class PathHopExplanation:
    from_occ: OccupationCode
    to_occ: OccupationCode
    shared_skills: list[SkillTag]


@dataclass
class CareerRecommendation:
    target: OccupationCode
    score: float
    wage_delta: float  # THB / month
    path: list[OccupationCode]
    path_explanation: list[PathHopExplanation]
    target_risk: float
    path_cost: float


@dataclass
class WageStats:
    """Wage data per occupation."""

    median: float  # THB / month
    p25: float = 0.0
    p75: float = 0.0
    sample_count: int = 0


@dataclass
class Centrality:
    """Centrality scores per occupation in the transition graph."""

    degree: dict[OccupationCode, float] = field(default_factory=dict)
    betweenness: dict[OccupationCode, float] = field(default_factory=dict)


@dataclass
class UnderpaymentSignal:
    occ: OccupationCode
    actual_wage: float
    predicted_wage: float  # regression(centrality)
    gap_ratio: float  # (predicted - actual) / predicted  ; >0 => underpaid


# Pipeline orchestration result — used by API and tests
@dataclass
class PipelineArtifacts:
    skill_graph: SkillGraph
    occ_vectors: OccupationVectors
    transition_graph: TransitionGraph
    centrality: Centrality
    wage_data: dict[OccupationCode, WageStats]
    risk_scores: dict[OccupationCode, float]

    def to_dict(self) -> dict[str, Any]:
        """Serialise to JSON-friendly dict for the TS API."""
        return {
            "skill_graph": {
                "nodes": sorted(s.name for s in self.skill_graph.nodes),
                "freq": {s.name: c for s, c in self.skill_graph.freq.items()},
                "edges": [
                    {"a": a.name, "b": b.name, "ppmi": w}
                    for (a, b), w in self.skill_graph.edges.items()
                ],
            },
            "transition_graph": {
                "nodes": sorted(o.code for o in self.transition_graph.nodes),
                "edges": [
                    {
                        "source": e.source.code,
                        "target": e.target.code,
                        "skill_distance": e.skill_distance,
                        "shared_skills": [s.name for s in e.shared_skills],
                    }
                    for e in self.transition_graph.edges
                ],
            },
            "centrality": {
                "degree": {o.code: v for o, v in self.centrality.degree.items()},
                "betweenness": {o.code: v for o, v in self.centrality.betweenness.items()},
            },
            "wage_data": {o.code: vars(s) for o, s in self.wage_data.items()},
            "risk_scores": {o.code: v for o, v in self.risk_scores.items()},
        }
