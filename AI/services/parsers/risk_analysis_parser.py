"""
SetuGov AI Service — Risk Analysis Parser

The LLM identifies risks (open-ended). Python is the sole authority on the
resulting severity counts and overall score — computed from the LLM's own
risk list via DecisionEngine.summarize_identified_risks, never trusted from
the LLM directly.
"""

from __future__ import annotations

from typing import Any

from pydantic import ValidationError

from providers.base import InvalidAIResponseError
from schemas.responses import IdentifiedRisk, RiskAnalysisResponse, RiskSeverity
from services.decision_engine import DecisionEngine
from services.sanitizers import _sanitize_claim

_VALID_SEVERITIES = {s.value for s in RiskSeverity}


def _coerce_severity(value: Any) -> RiskSeverity:
    text = str(value or "MEDIUM").strip().upper()
    if text not in _VALID_SEVERITIES:
        text = "MEDIUM"
    return RiskSeverity(text)


def parse_risk_analysis_response(raw: dict[str, Any]) -> RiskAnalysisResponse:
    """Build RiskAnalysisResponse. Severity counts and overall score are
    always recomputed deterministically from the parsed risk list."""
    raw_risks = raw.get("risks")
    if not isinstance(raw_risks, list):
        raw_risks = []

    risks: list[IdentifiedRisk] = []
    for item in raw_risks:
        if not isinstance(item, dict):
            continue
        description = item.get("description")
        if not description or not str(description).strip():
            continue
        try:
            risks.append(
                IdentifiedRisk(
                    category=_sanitize_claim(str(item.get("category") or "General")),
                    description=_sanitize_claim(str(description)),
                    severity=_coerce_severity(item.get("severity")),
                    probability=_coerce_severity(item.get("probability")),
                    mitigation_suggestion=(
                        _sanitize_claim(str(item["mitigation_suggestion"]))
                        if item.get("mitigation_suggestion")
                        else None
                    ),
                )
            )
        except (ValidationError, TypeError):
            continue

    high, medium, low, score = DecisionEngine.summarize_identified_risks(risks)
    risk_summary = (
        f"Risk analysis identified {len(risks)} categorized risk area(s): "
        f"{high} High, {medium} Medium, {low} Low severity."
    )

    try:
        return RiskAnalysisResponse(
            risks=risks,
            overall_risk_score=score,        # deterministic
            high_risk_count=high,            # deterministic
            medium_risk_count=medium,        # deterministic
            low_risk_count=low,              # deterministic
            risk_summary=risk_summary,
        )
    except (ValidationError, TypeError) as exc:
        raise InvalidAIResponseError(
            f"Failed to parse risk analysis response: {exc}"
        ) from exc
