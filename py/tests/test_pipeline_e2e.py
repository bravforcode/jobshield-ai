"""End-to-end pipeline test on the mock dataset."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from jobshield.cli.build import build_pipeline


def test_full_pipeline_runs_and_produces_artifacts_dict() -> None:
    artifacts, per_source = build_pipeline(
        "C:/jobsume/data/mock/job_postings.json",
        "C:/jobsume/data/mock/wage_data.json",
        "C:/jobsume/data/mock/risk_scores.json",
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


def test_cli_exits_zero_and_writes_artifacts_json() -> None:
    """End-to-end smoke: the CLI must run, write artifacts.json, exit 0."""
    # Use the venv's Python so `jobshield` is importable.
    venv_python = Path("C:/jobsume/py/.venv/Scripts/python.exe")
    cmd_python = str(venv_python) if venv_python.exists() else sys.executable
    result = subprocess.run(
        [
            cmd_python,
            "-m",
            "jobshield.cli.build",
            "--mock",
            "--out",
            "C:/jobsume/data/_test_artifacts.json",
        ],
        capture_output=True,
        text=True,
        cwd="C:/jobsume/py",
    )
    assert result.returncode == 0, (
        f"CLI failed (exit {result.returncode}):\nstdout={result.stdout}\nstderr={result.stderr}"
    )
    # The output JSON must contain the canonical fields.
    with open("C:/jobsume/data/_test_artifacts.json", encoding="utf-8") as f:
        data = json.loads(f.read())
    assert "skill_graph" in data
    assert "transition_graph" in data
    assert "centrality" in data
    assert "recommendations" in data
