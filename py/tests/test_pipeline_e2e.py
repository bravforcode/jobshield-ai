"""End-to-end pipeline test on the mock dataset."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from jobshield.cli.build import build_pipeline

REPO_ROOT = Path(__file__).resolve().parents[2]
MOCK_DIR = REPO_ROOT / "data" / "mock"


def test_full_pipeline_runs_and_produces_artifacts_dict() -> None:
    artifacts, per_source = build_pipeline(
        str(MOCK_DIR / "job_postings.json"),
        str(MOCK_DIR / "wage_data.json"),
        str(MOCK_DIR / "risk_scores.json"),
    )

    payload = artifacts.to_dict()
    assert "skill_graph" in payload
    assert "transition_graph" in payload
    assert "centrality" in payload
    assert "wage_data" in payload
    assert "risk_scores" in payload

    # Every occupation has at least one recommendation (other than itself).
    for code, recs in per_source.items():
        assert recs, f"no recommendations for {code}"
        for r in recs:
            assert r["target"] != code, f"{code} recommends itself"


def test_cli_exits_zero_and_writes_artifacts_json(tmp_path: Path) -> None:
    """End-to-end smoke: the CLI must run, write artifacts.json, exit 0."""
    out_path = tmp_path / "artifacts.json"
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "jobshield.cli.build",
            "--mock",
            "--out",
            str(out_path),
        ],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT / "py"),
    )
    assert result.returncode == 0, (
        f"CLI failed (exit {result.returncode}):\nstdout={result.stdout}\nstderr={result.stderr}"
    )
    # The output JSON must contain the canonical fields.
    with open(out_path, encoding="utf-8") as f:
        data = json.loads(f.read())
    assert "skill_graph" in data
    assert "transition_graph" in data
    assert "centrality" in data
    assert "recommendations" in data
