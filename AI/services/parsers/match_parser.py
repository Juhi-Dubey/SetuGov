"""
SetuGov AI Service — Brain 2: Startup Match Parser

Parses and sanitizes LLM match explanation JSON.
The deterministic score (MatchScoreBreakdown) is ALWAYS passed in from Python —
the LLM output score field is intentionally ignored.
"""

from __future__ import annotations

from typing import Any

from pydantic import ValidationError

from schemas.responses import MatchExplanationResponse, MatchScoreBreakdown
from services.ollama_client import InvalidAIResponseError
from services.sanitizers import _extract_str_list, _sanitize_claim


def parse_match_response(
    raw: dict[str, Any],
    score: MatchScoreBreakdown,
) -> MatchExplanationResponse:
    """
    Build MatchExplanationResponse from LLM JSON + deterministic score.
    The score comes entirely from DecisionEngine — the LLM score field is ignored.
    All qualitative strings are sanitized to remove unverified claims.
    """
    try:
        return MatchExplanationResponse(
            score=score,  # deterministic — NOT from LLM
            why_matched=_sanitize_claim(
                str(raw.get("why_matched") or "No explanation provided.")
            ),
            strengths=[
                _sanitize_claim(s)
                for s in _extract_str_list(raw.get("strengths"))
            ],
            concerns=[
                _sanitize_claim(c)
                for c in _extract_str_list(raw.get("concerns"))
            ],
            missing_information=[
                _sanitize_claim(m)
                for m in _extract_str_list(raw.get("missing_information"))
            ],
            deployment_considerations=[
                _sanitize_claim(d)
                for d in _extract_str_list(raw.get("deployment_considerations"))
            ],
        )
    except (ValidationError, TypeError) as exc:
        raise InvalidAIResponseError(
            f"Failed to parse match response: {exc}"
        ) from exc
