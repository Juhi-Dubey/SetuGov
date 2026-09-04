"""
SetuGov AI Service — Shared Sanitization Helpers

Pure functions shared across all five brain parsers.
No domain logic, no LLM calls, no side effects beyond string transformation.
"""

from __future__ import annotations

import re
from typing import Any


# ═══════════════════════════════════════════════════════════════════════════
# List extraction
# ═══════════════════════════════════════════════════════════════════════════


def _extract_str_list(raw_val: Any) -> list[str]:
    """
    Safely extract a list of non-empty strings from varied LLM JSON outputs.
    Handles:
    - list of strings -> stripped strings
    - list of dicts -> string extraction from 'description', 'name', 'text', etc.
    - single string with newlines or commas -> split into items
    - single string without separators -> single element list
    - None or other types -> empty list
    Never splits a single string into a character-by-character list.
    """
    if raw_val is None:
        return []
    if isinstance(raw_val, str):
        cleaned = raw_val.strip()
        if not cleaned:
            return []
        if "\n" in cleaned:
            lines = [
                re.sub(r"^[\s*\-•\d.]+", "", line).strip()
                for line in cleaned.split("\n")
            ]
            return [line for line in lines if line]
        if "," in cleaned and len(cleaned.split(",")) > 1:
            items = [item.strip() for item in cleaned.split(",")]
            return [item for item in items if item]
        return [cleaned]
    if isinstance(raw_val, list):
        items: list[str] = []
        for item in raw_val:
            if isinstance(item, str) and item.strip():
                items.append(item.strip())
            elif isinstance(item, dict):
                desc = (
                    item.get("description")
                    or item.get("name")
                    or item.get("hypothesis")
                    or item.get("text")
                    or str(item)
                )
                if desc and isinstance(desc, str) and desc.strip():
                    items.append(desc.strip())
        return items
    return []


# ═══════════════════════════════════════════════════════════════════════════
# Hypothesis & assumption framing
# ═══════════════════════════════════════════════════════════════════════════


def _ensure_hypothesis(text: str) -> str:
    """Ensure a root-cause string is explicitly framed as a hypothesis."""
    cleaned = text.strip()
    lower = cleaned.lower()
    hypothesis_indicators = [
        "hypothes",
        "may ",
        "might ",
        "could ",
        "potential",
        "possible",
        "requiring validation",
        "unverified",
    ]
    if any(ind in lower for ind in hypothesis_indicators):
        return cleaned
    return f"{cleaned} (Hypothesis requiring validation)"


def _ensure_evidence_aware_assumption(text: str) -> str:
    """Ensure an assumption is explicitly evidence-aware and expresses uncertainty."""
    cleaned = text.strip()
    lower = cleaned.lower()
    evidence_indicators = [
        "subject to",
        "assumes",
        "assuming",
        "hypothesis",
        "requires validation",
        "contingent upon",
        "pending",
        "provisional",
        "uncertain",
    ]
    if any(ind in lower for ind in evidence_indicators):
        return cleaned
    return f"Subject to pilot validation: {cleaned}"


# ═══════════════════════════════════════════════════════════════════════════
# Claim sanitization
# ═══════════════════════════════════════════════════════════════════════════


def _sanitize_claim(text: str) -> str:
    """
    Ensure startup and proposal claims are not described as
    independently 'verified', 'proven', or 'demonstrated' without evidence.
    Adds objective attribution without aggressively rewriting legitimate text.
    """
    cleaned = text.strip()
    if not cleaned:
        return cleaned

    replacements = [
        (r"\bverified\s+technology\s+fit\b", "profile-indicated technology fit"),
        (r"\bverified\s+domain\s+fit\b", "profile-indicated domain fit"),
        (r"\bverified\s+domain\s+expertise\b", "profile-indicated domain expertise"),
        (r"\bproven\s+technology\s+fit\b", "profile-indicated technology fit"),
        (r"\bproven\s+domain\s+fit\b", "profile-indicated domain fit"),
        (r"\bproven\s+domain\s+expertise\b", "profile-indicated domain expertise"),
        (r"\bproven\s+technolog(y|ies)\b", r"technology described in the submission"),
        (r"\bverified\s+technolog(y|ies)\b", r"technology described in the submission"),
        (r"\bverified\s+capabilities\b", "stated capabilities"),
        (r"\bverified\s+capability\b", "stated capability"),
        (r"\bverified\s+experience\b", "stated experience"),
        (r"\bproven\s+capabilities\b", "stated capabilities"),
        (r"\bproven\s+capability\b", "stated capability"),
        (r"\bproven\s+ability\b", "stated ability"),
        (r"\bproven\s+impact\b", "reported impact"),
        (r"\bdemonstrated\s+impact\b", "reported impact"),
        (r"\bguaranteed\s+impact\b", "projected impact"),
        (r"\bguaranteed\s+performance\b", "projected performance"),
        (r"\bproven\s+track\s+record\b", "reported track record"),
        (r"\bdemonstrated\s+ability\b", "stated ability"),
        (r"\bdemonstrated\s+capabilities\b", "stated capabilities"),
        (r"\bdemonstrated\s+capability\b", "stated capability"),
        (r"\bdemonstrated\s+experience\b", "stated experience"),
        (r"\bdemonstrated\s+track\s+record\b", "reported track record"),
    ]

    for pattern_str, repl in replacements:
        cleaned = re.sub(pattern_str, repl, cleaned, flags=re.IGNORECASE)

    return cleaned
