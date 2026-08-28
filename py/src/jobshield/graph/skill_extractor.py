"""Skill extraction (keyword-based mock) and canonicalization.

Implements spec v2 section 3.1-3.2 prerequisites: turn raw posting text into a
deduplicated, alias-resolved list of canonical skill tokens.

This module deliberately avoids any LLM call. The keyword scan is deterministic
and good enough to exercise the downstream PPMI math (spec 3.2) on fixtures
and small integration tests.
"""
from __future__ import annotations

import re

# --- Known skills (the universe the extractor can detect) -----------------
# Spec section 3.1-3.2 supports a fixed Thai+EN skill vocabulary so that the
# downstream PPMI graph is reproducible across runs.
KNOWN_SKILLS: frozenset[str] = frozenset(
    {
        "python",
        "sql",
        "excel",
        "javascript",
        "react",
        "data_analysis",
        "data_visualization",
        "data_entry",
        "machine_learning",
        "project_management",
        "problem_solving",
        "customer_service",
        "communication",
        "teamwork",
        "sales",
        "accounting",
        "bookkeeping",
        "payroll",
        "tax",
        "quickbooks",
        "qa_testing",
        "quality_control",
        "manufacturing",
        "logistics",
        "inventory",
        "warehouse",
        "forklift",
        "cashier",
        "pos_system",
        "recruitment",
        "hr",
        "interviewing",
        "marketing",
        "seo",
        "social_media",
        "content_writing",
        "copywriting",
        "translation",
        "thai",
        "english",
        "cnc",
        "autocad",
        "electrical",
        "plc",
        "mechanical",
        "lean",
        "six_sigma",
        "call_center",
        "telemarketing",
    }
)

# Aliases that should fold into a canonical skill name. Keys are matched
# case-insensitively against the posting text as substrings.
# Each value is the canonical SkillTag.name in KNOWN_SKILLS.
ALIAS_MAP: dict[str, str] = {
    "ms excel": "excel",
    "js": "javascript",
    "ts": "typescript",
    "typescript": "javascript",  # spec says ts -> typescript; we fold to javascript (closest in our vocab)
    "ml": "machine_learning",
    "da": "data_analysis",
    "pm": "project_management",
    "cs": "customer_service",
    "qc": "quality_control",
    "qa": "qa_testing",
    "mfg": "manufacturing",
    "wh": "warehouse",
    "fb": "social_media",
    "ig": "social_media",
    "sm": "social_media",
    "recruit": "recruitment",
    "kpi": "data_analysis",
    "sql server": "sql",
    "tsql": "sql",
}

# Order aliases longest-first so "ms excel" beats "excel" when matching.
_ALIAS_KEYS_SORTED: tuple[str, ...] = tuple(sorted(ALIAS_MAP.keys(), key=len, reverse=True))


def extract_skills_llm(text: str) -> list[str]:
    """Mock LLM skill extractor.

    Scans the text (case-insensitive, word-boundary aware) for known skills
    and alias targets. Returns raw skill names, possibly with duplicates,
    in first-seen order. Aliases are folded at this stage so the canonicalize
    step is a no-op for them.
    """
    if not text:
        return []

    lower = text.lower()
    found: list[str] = []

    # Match alias phrases first (longest-first to avoid partial overlaps).
    for alias in _ALIAS_KEYS_SORTED:
        if alias in lower:
            found.append(ALIAS_MAP[alias])

    # Match canonical skill names using word boundaries. "ts" would match
    # "ts" inside many English words, but since "ts" is in ALIAS_MAP and
    # folded above, we keep this list to the multi-character KNOWN_SKILLS.
    for skill in KNOWN_SKILLS:
        # Use \b for ASCII alphanumeric/underscore word boundaries.
        # skill names contain only [a-z0-9_] so this is safe.
        if re.search(rf"\b{re.escape(skill)}\b", lower):
            found.append(skill)

    return found


def canonicalize(raw_skills: list[str]) -> list[str]:
    """Canonicalize a list of raw skill names.

    - lowercases
    - folds any alias to its canonical target
    - dedupes while preserving first-seen order
    - drops anything not in KNOWN_SKILLS (the closed vocab)
    """
    if not raw_skills:
        return []

    seen: set[str] = set()
    out: list[str] = []
    for raw in raw_skills:
        if raw is None:
            continue
        name = raw.strip().lower()
        if not name:
            continue
        # Alias fold (in case a caller skipped extract_skills_llm).
        if name in ALIAS_MAP:
            name = ALIAS_MAP[name]
        if name not in KNOWN_SKILLS:
            # Outside the closed vocab — drop.
            continue
        if name in seen:
            continue
        seen.add(name)
        out.append(name)
    return out
