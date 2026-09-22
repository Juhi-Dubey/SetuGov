"""
SetuGov AI Service — Input Sanitizer & Prompt Injection Defense

Protects AI prompts against malicious instruction overrides, role hijacking,
delimiters, and control sequence injection in user-supplied text.

Wiring
------
``sanitize_request`` is the entry point used by every LLM-backed route in
``main.py``. It cleans every string in a validated request model (recursively,
including nested models and lists) *before* the request reaches the prompt
builders, and returns human-readable warnings describing what was filtered.
A regression test (``tests/test_input_hardening.py``) fails if an ``/ai/*``
route is added without calling it.

Design notes
------------
* Filtering must not corrupt legitimate government text. Line-anchored
  patterns therefore only fire on instruction-like continuations
  (``system: you must ...``), not on ordinary labels such as
  ``System: manual token queue`` or headings such as ``### System Architecture``,
  and they never swallow the surrounding newline.
* Zero-width joiner / non-joiner (U+200D / U+200C) are preserved: they are
  part of correct Devanagari (Marathi/Hindi) text. Other invisible format
  characters (zero-width space, BOM, bidi overrides, ...) are stripped.
"""

from __future__ import annotations

import logging
import re
import unicodedata
from typing import Any, Optional, TypeVar

from pydantic import BaseModel

logger = logging.getLogger("setugov.ai.sanitizer")

FILTER_MARKER = "[security filtered: instruction override attempt]"

# Invisible characters that carry meaning in Indic scripts and must survive.
_PRESERVED_FORMAT_CHARS = frozenset({"\u200c", "\u200d"})

# Instruction-like words that must follow a bare "system:" label for it to
# count as role spoofing (as opposed to a normal "System: <description>" line).
_ROLE_SPOOF_FOLLOWERS = (
    r"(?:you\b|ignore\b|disregard\b|forget\b|override\b|new\s+instructions?\b|"
    r"from\s+now\b|act\s+as\b|do\s+not\b|don'?t\b|always\b|never\b|must\b|"
    r"respond\b|reveal\b|output\b|approve\b|mark\b|score\b|rank\b|select\b)"
)

# Prompt injection pattern signatures
_INJECTION_PATTERNS = [
    # System / instruction override phrases
    r"(?i)\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|directions|prompts|rules|commands)\b",
    r"(?i)\bdisregard\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|rules|constraints)\b",
    r"(?i)\bforget\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|rules)\b",
    r"(?i)\boverride\s+(?:system|developer|safety)\s+(?:instructions|prompts|rules)\b",
    r"(?i)\byou\s+are\s+now\s+(?:a|an)?\s*(?:unrestricted|jailbroken|dan|developer|root|admin)\b",
    r"(?i)\bact\s+as\s+(?:an?\s+)?(?:unrestricted|jailbroken|god|admin|root|system)\b",
    r"(?i)\benter\s+(?:sudo|jailbreak|developer|unrestricted)\s+mode\b",
    # Delimiters and pseudo-system roles
    r"(?i)<\s*\|\s*(?:im_start|im_end|system|user|assistant)\s*\|?\s*>",
    r"(?i)\[\s*(?:INST|SYS|SYSTEM|DEVELOPER)\s*\]",
    r"(?i)\[\s*/\s*(?:INST|SYS|SYSTEM|DEVELOPER)\s*\]",
    r"(?i)<<\s*SYS\s*>>",
    r"(?i)<<\s*/\s*SYS\s*>>",
    # Line-anchored role spoofing. Anchored with (?m)^ and a lookahead so the
    # newline is preserved and ordinary "System: ..." lines are left alone.
    r"(?im)^[ \t]*system[ \t]*:[ \t]*(?=" + _ROLE_SPOOF_FOLLOWERS + r")",
    r"(?im)^[ \t]*###[ \t]*(?:system(?:[ \t]+(?:prompt|override|message))?[ \t]*:|instructions?[ \t]*:|override\b)",
]

_COMPILED_PATTERNS = [re.compile(p) for p in _INJECTION_PATTERNS]


def _sanitize_text(text: str) -> tuple[str, int]:
    """Clean one string. Returns (cleaned_text, number_of_injection_matches)."""
    # 1. Normalize Unicode (NFKC) — also defeats fullwidth-letter bypasses.
    cleaned = unicodedata.normalize("NFKC", text)

    # 2. Strip control / invisible format characters, except newline, CR, tab,
    #    and the Indic joiners ZWJ / ZWNJ.
    cleaned = "".join(
        ch
        for ch in cleaned
        if ch in ("\n", "\r", "\t")
        or ch in _PRESERVED_FORMAT_CHARS
        or unicodedata.category(ch)[0] != "C"
    )

    # 3. Detect and neutralize prompt injection attempts
    hits = 0
    for pattern in _COMPILED_PATTERNS:
        cleaned, n = pattern.subn(FILTER_MARKER, cleaned)
        hits += n

    return cleaned, hits


def sanitize_user_input(text: Optional[str]) -> Optional[str]:
    """
    Sanitize a user-provided text string against prompt injection and control exploits.
    Returns cleaned text, or None if input is None.
    """
    if text is None:
        return None
    return _sanitize_text(text)[0]


def sanitize_string_list(items: Optional[list[str]]) -> list[str]:
    """Sanitize a list of strings."""
    if not items:
        return []
    return [sanitize_user_input(item) or "" for item in items if item is not None]


# ═══════════════════════════════════════════════════════════════════════════
# Request-level sanitization (used by the API routes)
# ═══════════════════════════════════════════════════════════════════════════


def sanitize_payload(value: Any, path: str = "") -> tuple[Any, list[str]]:
    """
    Recursively sanitize every string inside dicts / lists / tuples.

    Returns ``(cleaned_value, warnings)``. Warnings name the field path and the
    number of matches but never echo the offending text.
    """
    if isinstance(value, str):
        cleaned, hits = _sanitize_text(value)
        warnings = (
            [f"{path or 'input'}: text matching an instruction-override pattern was filtered ({hits} match{'es' if hits != 1 else ''})"]
            if hits
            else []
        )
        return cleaned, warnings

    if isinstance(value, dict):
        out: dict[Any, Any] = {}
        warnings: list[str] = []
        for key, item in value.items():
            child_path = f"{path}.{key}" if path else str(key)
            out[key], w = sanitize_payload(item, child_path)
            warnings.extend(w)
        return out, warnings

    if isinstance(value, (list, tuple)):
        items: list[Any] = []
        warnings = []
        for idx, item in enumerate(value):
            cleaned_item, w = sanitize_payload(item, f"{path}[{idx}]")
            items.append(cleaned_item)
            warnings.extend(w)
        return (items if isinstance(value, list) else tuple(items)), warnings

    return value, []


M = TypeVar("M", bound=BaseModel)


def sanitize_request(request: M) -> tuple[M, list[str]]:
    """
    Sanitize a validated request model.

    Returns ``(clean_request, warnings)``. If sanitization changes nothing the
    original object is returned untouched. Otherwise the cleaned data is
    re-validated into a fresh instance of the same model class, so downstream
    code (prompt builders, parsers, the deterministic engine) only ever sees
    the cleaned values.
    """
    original = request.model_dump()
    cleaned, warnings = sanitize_payload(original)

    if warnings:
        logger.warning(
            "Input sanitizer filtered content in %s: %s",
            type(request).__name__,
            "; ".join(warnings),
        )

    if cleaned == original:
        return request, warnings

    return type(request).model_validate(cleaned), warnings
