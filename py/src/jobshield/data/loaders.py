"""Mock dataset loaders (spec §9 + §7).

Each call to `load_postings` runs `extract_skills_llm` + `canonicalize` on
the posting text so we exercise the extractor end-to-end against realistic
data — not a fixed pre-baked skill list.
"""
from __future__ import annotations

import json
from pathlib import Path

from jobshield.graph import canonicalize, extract_skills_llm
from jobshield.types import JobPosting, OccupationCode, SkillTag, WageStats


def _occ_label(code: str) -> str:
    """Look up a human label by code from the mock dataset.

    Falls back to the code itself if not found — keeps the loader robust
    against partial mock data (e.g. when a reviewer trims an occupation
    for a smoke test).
    """
    try:
        from jobshield.data import mock_data

        for o in mock_data.OCCUPATIONS:
            if o["code"] == code:
                return o["label"]
    except Exception:
        pass
    return code


def load_postings(path: str | Path) -> list[JobPosting]:
    """Load job_postings.json and run the extractor on each text.

    Each entry in the JSON file is `{"code", "label", "wage", "risk", "postings": [text, ...]}`.
    """
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    out: list[JobPosting] = []
    for _occ_idx, entry in enumerate(raw):
        occ = OccupationCode(code=entry["code"], label=entry["label"])
        for j, text in enumerate(entry["postings"]):
            raw_skills = extract_skills_llm(text)
            skill_names = canonicalize(raw_skills)
            posting = JobPosting(
                posting_id=f"{occ.code}.{j:03d}",
                text=text,
                occupation=occ,
                skills=[SkillTag(name=s) for s in skill_names],
                wage_median=float(entry.get("wage", 0)) or None,
            )
            out.append(posting)
    return out


def load_wage_data(path: str | Path) -> dict[OccupationCode, WageStats]:
    """wage_data.json is `{code: median_THB}`. Expand to WageStats."""
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    out: dict[OccupationCode, WageStats] = {}
    for code, median in raw.items():
        out[OccupationCode(code=code, label=_occ_label(code))] = WageStats(median=float(median))
    return out


def load_risk_scores(path: str | Path) -> dict[OccupationCode, float]:
    """risk_scores.json is `{code: risk_0_1}`."""
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    return {OccupationCode(code=code, label=_occ_label(code)): float(v) for code, v in raw.items()}


__all__ = ["load_postings", "load_risk_scores", "load_wage_data"]
