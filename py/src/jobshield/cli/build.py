"""End-to-end pipeline runner (CLI: `python -m jobshield.cli.build`).

Composes every layer:

  mock postings -> skill graph -> occupation vectors -> transition graph
                -> dijkstra + rank per source -> centrality + underpayment
                -> PipelineArtifacts -> JSON to --out

Writes a summary to stdout: occ count, edge count, top-1 recommendation
per source.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from jobshield.data import load_postings, load_risk_scores, load_wage_data
from jobshield.graph import build_skill_graph
from jobshield.occupation import build_occupation_vectors
from jobshield.path import (
    build_transition_graph,
    normalize_edge_weights,
    recommend_career_paths,
)
from jobshield.types import Centrality, PipelineArtifacts
from jobshield.wage import (
    betweenness_centrality_brandes,
    degree_centrality,
)


def _resolve_mock_paths() -> tuple[Path, Path, Path]:
    """Default mock dataset paths (sibling of py/)."""
    repo = Path(__file__).resolve().parents[4]  # jobsume/
    mock = repo / "data" / "mock"
    return (
        mock / "job_postings.json",
        mock / "wage_data.json",
        mock / "risk_scores.json",
    )


def build_pipeline(
    postings_path: Path,
    wage_path: Path,
    risk_path: Path,
    top_n: int = 5,
) -> tuple[PipelineArtifacts, dict[str, list[dict]]]:
    """Run the full pipeline and return (artifacts, per_source_top1)."""
    postings = load_postings(postings_path)
    wage_data = load_wage_data(wage_path)
    risk_scores = load_risk_scores(risk_path)

    # Layer 1: skill graph
    skill_graph = build_skill_graph(postings)

    # Layer 2: occupation vectors
    occ_vectors = build_occupation_vectors(postings, skill_graph)

    # Layer 3: transition graph
    occupations = list(occ_vectors.vectors.keys())
    transition_graph = build_transition_graph(occupations, occ_vectors, skill_graph)
    normalize_edge_weights(transition_graph, risk_scores)

    # Layer 4: centrality
    cent = Centrality(
        degree=degree_centrality(transition_graph),
        betweenness=betweenness_centrality_brandes(transition_graph),
    )

    # Layer 5: per-source top-1 recommendations (for CLI summary)
    per_source: dict[str, list[dict]] = {}
    for source in occupations:
        recs = recommend_career_paths(
            source,
            transition_graph,
            wage_data,
            risk_scores,
            top_n=top_n,
        )
        per_source[source.code] = [
            {
                "target": r.target.code,
                "target_label": r.target.label,
                "score": r.score,
                "wage_delta": r.wage_delta,
                "path_cost": r.path_cost,
                "target_risk": r.target_risk,
                "path": [o.code for o in r.path],
                "path_explanation": [
                    {
                        "from": h.from_occ.code,
                        "to": h.to_occ.code,
                        "shared_skills": [s.name for s in h.shared_skills],
                    }
                    for h in r.path_explanation
                ],
            }
            for r in recs
        ]

    artifacts = PipelineArtifacts(
        skill_graph=skill_graph,
        occ_vectors=occ_vectors,
        transition_graph=transition_graph,
        centrality=cent,
        wage_data=wage_data,
        risk_scores=risk_scores,
    )
    return artifacts, per_source


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the JobShield AI pipeline artifacts.")
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Use the bundled mock dataset (default).",
    )
    parser.add_argument(
        "--postings",
        type=Path,
        default=None,
        help="Path to job_postings.json (overrides --mock).",
    )
    parser.add_argument(
        "--wage",
        type=Path,
        default=None,
        help="Path to wage_data.json (overrides --mock).",
    )
    parser.add_argument(
        "--risk",
        type=Path,
        default=None,
        help="Path to risk_scores.json (overrides --mock).",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Path to write artifacts.json. Default: <repo>/data/artifacts.json",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=5,
        help="Number of top recommendations to compute per source (default 5).",
    )
    args = parser.parse_args()

    if args.postings or args.wage or args.risk:
        if not (args.postings and args.wage and args.risk):
            parser.error("When overriding --mock, all three of --postings, --wage, --risk are required")
        postings_path, wage_path, risk_path = args.postings, args.wage, args.risk
    else:
        postings_path, wage_path, risk_path = _resolve_mock_paths()

    artifacts, per_source = build_pipeline(
        postings_path, wage_path, risk_path, top_n=args.top_n
    )

    # Serialize. PipelineArtifacts.to_dict() has the per-edge data but not
    # the per-source recommendations; merge them in.
    payload = artifacts.to_dict()
    payload["recommendations"] = per_source

    out_path = args.out or (Path(__file__).resolve().parents[4] / "data" / "artifacts.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    # Stdout summary.
    occ_count = len(artifacts.transition_graph.nodes)
    edge_count = len(artifacts.transition_graph.edges) // 2  # undirected
    skill_count = len(artifacts.skill_graph.nodes)
    print(f"  occupations: {occ_count}")
    print(f"  skills:      {skill_count}")
    print(f"  edges:       {edge_count}  (undirected)")
    print(f"  output:      {out_path}")
    print()
    print("  top recommendation per source:")
    for code, recs in per_source.items():
        if not recs:
            continue
        top = recs[0]
        path_str = " -> ".join(top["path"])
        print(
            f"    {code:30s} -> {top['target']:30s} "
            f"score={top['score']:+.3f} wage_delta={top['wage_delta']:+,.0f} THB "
            f"path={path_str}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
