"""
SetuGov AI Service — Input Sanitizer & Prompt Injection Defense

Protects AI prompts against malicious instruction overrides, role hijacking,
delimiters, and control sequence injection in user-supplied text.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Optional


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
    r"(?i)(?:^|\n)\s*system\s*:\s*",
    r"(?i)(?:^|\n)\s*###\s*(?:system|instruction|override)\b",
]


def sanitize_user_input(text: Optional[str]) -> Optional[str]:
    """
    Sanitize a user-provided text string against prompt injection and control exploits.
    Returns cleaned text, or None if input is None.
    """
    if text is None:
        return None

    # 1. Normalize Unicode (NFKC)
    cleaned = unicodedata.normalize("NFKC", text)

    # 2. Strip non-printable control characters except newline, carriage return, and tab
    cleaned = "".join(
        ch for ch in cleaned
        if ch in ("\n", "\r", "\t") or (unicodedata.category(ch)[0] != "C")
    )

    # 3. Detect and neutralize prompt injection attempts
    for pattern in _INJECTION_PATTERNS:
        cleaned = re.sub(
            pattern,
            "[security filtered: instruction override attempt]",
            cleaned,
        )

    return cleaned


def sanitize_string_list(items: Optional[list[str]]) -> list[str]:
    """Sanitize a list of strings."""
    if not items:
        return []
    return [sanitize_user_input(item) or "" for item in items if item is not None]
