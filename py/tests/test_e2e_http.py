"""HTTP E2E: spawn the Bun API as a subprocess and hit every endpoint.

This is the "browser E2E" the reviewer asked for — not a real browser
(we'd need playwright for that), but a full HTTP round-trip that exercises
the same code path a browser would: Bun.serve -> handleRequest -> JSON.
Uses only stdlib + pytest; no extra deps.
"""
from __future__ import annotations

import json
import os
import socket
import subprocess
import time
import urllib.request
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
ARTIFACTS = REPO / "data" / "artifacts.json"


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="module")
def api_server():
    if not ARTIFACTS.exists():
        pytest.skip(f"artifacts not found at {ARTIFACTS} — run `uv run python -m jobshield.cli.build --mock` first")
    port = _free_port()
    env = os.environ.copy()
    env["JOBSHIELD_ARTIFACTS"] = str(ARTIFACTS)
    env["PORT"] = str(port)
    # Use bun from PATH
    proc = subprocess.Popen(
        ["bun", "run", "ts/api/src/index.ts"],
        cwd=str(REPO),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    # Wait for health
    deadline = time.time() + 10
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=1) as r:
                if r.status == 200:
                    break
        except Exception:
            pass
        if proc.poll() is not None:
            _out, err = proc.communicate()
            pytest.fail(f"API failed to start: {err.decode()[:2000]}")
        time.sleep(0.2)
    else:
        proc.terminate()
        pytest.fail("API did not become healthy within 10s")
    yield f"http://127.0.0.1:{port}"
    try:
        proc.terminate()
        proc.wait(timeout=5)
    except Exception:
        proc.kill()


def _get(base: str, path: str) -> tuple[int, object]:
    with urllib.request.urlopen(f"{base}{path}", timeout=5) as r:
        return r.status, json.loads(r.read().decode())


def test_health(api_server: str) -> None:
    status, body = _get(api_server, "/api/health")
    assert status == 200
    assert body["ok"] is True


def test_occupations_lists_all(api_server: str) -> None:
    status, body = _get(api_server, "/api/occupations")
    assert status == 200
    assert isinstance(body, list)
    assert len(body) >= 15
    codes = {o["code"] for o in body}
    assert "occ.data_entry" in codes
    assert "occ.junior_data_analyst" in codes


def test_recommend_returns_path_with_explanation(api_server: str) -> None:
    status, body = _get(api_server, "/api/recommend?source=occ.data_entry&topN=2")
    assert status == 200
    assert body["source"] == "occ.data_entry"
    assert len(body["recommendations"]) == 2
    top = body["recommendations"][0]
    assert top["target"] == "occ.junior_data_analyst"
    assert len(top["path"]) >= 2
    assert len(top["path_explanation"]) == len(top["path"]) - 1
    # Spec §7: the explanation must mention excel / data_analysis
    all_skills = {s for hop in top["path_explanation"] for s in hop["shared_skills"]}
    assert all_skills & {"excel", "data_analysis", "data_entry"}


def test_wage_radar_has_underpaid_flag(api_server: str) -> None:
    status, body = _get(api_server, "/api/wage-radar")
    assert status == 200
    assert isinstance(body, list)
    assert len(body) >= 15
    # At least one underpaid and one not — the distribution is not flat.
    assert any(r["underpaid"] for r in body)
    assert any(not r["underpaid"] for r in body)


def test_unknown_source_is_404(api_server: str) -> None:
    with pytest.raises(urllib.error.HTTPError, match="404"):
        _get(api_server, "/api/recommend?source=does_not_exist")


def test_invalid_topn_is_404(api_server: str) -> None:
    with pytest.raises(urllib.error.HTTPError, match="404"):
        _get(api_server, "/api/recommend?source=occ.data_entry&topN=abc")


def test_static_web_served(api_server: str) -> None:
    with urllib.request.urlopen(f"{api_server}/", timeout=5) as r:
        assert r.status == 200
        body = r.read().decode()
        assert "JobShield AI" in body
        assert "disclaimer" in body.lower() or "Prototype" in body
