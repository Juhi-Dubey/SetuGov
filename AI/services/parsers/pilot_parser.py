"""
SetuGov AI Service — Brain 4: Pilot Intelligence Parser

Parses LLM pilot interpretation JSON.
Deterministic KPI calculations are passed in — the LLM cannot alter them.
Evidence gaps are reconciled deterministically against supplied data.
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import ValidationError

from schemas.requests import PilotIntelligenceRequest
from schemas.responses import KPIAnalysis, KPIStatus, PilotIntelligenceResponse
from services.ollama_client import InvalidAIResponseError
from services.sanitizers import _extract_str_list, _sanitize_claim


# ═══════════════════════════════════════════════════════════════════════════
# Internal helpers
# ═══════════════════════════════════════════════════════════════════════════


def _reconcile_pilot_evidence_gaps(
    raw_gaps: list[str],
    request: PilotIntelligenceRequest,
    kpi_analyses: list[KPIAnalysis],
) -> list[str]:
    """
    Reconcile and filter evidence_gaps for pilot intelligence.
    Deterministically injects missing data entries for KPIs with
    INSUFFICIENT_DATA, unverified evidence, or absent feedback/validation
    without falsely reporting supplied evidence as missing.
    """
    sanitized: list[str] = [
        _sanitize_claim(g) for g in raw_gaps if g and g.strip()
    ]

    # 1. Deterministic gap for KPIs with INSUFFICIENT_DATA
    for kpi in kpi_analyses:
        if kpi.status == KPIStatus.INSUFFICIENT_DATA:
            missing_parts = []
            if kpi.baseline is None:
                missing_parts.append("baseline")
            if kpi.target is None:
                missing_parts.append("target")
            if kpi.actual is None:
                missing_parts.append("actual measurement")
            kpi_name_lower = kpi.name.lower()
            if not any(
                kpi_name_lower in s.lower()
                and (
                    "missing" in s.lower()
                    or "incomplete" in s.lower()
                    or "baseline" in s.lower()
                    or "actual" in s.lower()
                )
                for s in sanitized
            ):
                sanitized.append(
                    f"Incomplete measurement data for KPI '{kpi.name}': "
                    f"missing {', '.join(missing_parts)}."
                )

    # 2. Unverified evidence items
    if request.evidence:
        unverified_items = [
            e.description
            for e in request.evidence
            if e.verified is False or e.verified is None
        ]
        if unverified_items and not any(
            "unverified" in s.lower()
            or "third-party" in s.lower()
            or "verification" in s.lower()
            for s in sanitized
        ):
            sanitized.append(
                f"Supplied evidence items ({len(unverified_items)}) lack "
                "independent third-party verification."
            )

    # 3. Absent user feedback
    if not (request.user_feedback and request.user_feedback.strip()):
        if not any(
            "user feedback" in s.lower() or "stakeholder feedback" in s.lower()
            for s in sanitized
        ):
            sanitized.append(
                "End-user and operational stakeholder feedback not documented."
            )

    # 4. Absent independent validation
    if not (request.independent_validation and request.independent_validation.strip()):
        if not any(
            "independent validation" in s.lower()
            or "external audit" in s.lower()
            or "third-party validation" in s.lower()
            for s in sanitized
        ):
            sanitized.append(
                "Independent third-party validation or technical audit not conducted."
            )

    return sanitized


# ═══════════════════════════════════════════════════════════════════════════
# Public parser
# ═══════════════════════════════════════════════════════════════════════════


def parse_pilot_response(
    raw: dict[str, Any],
    request: PilotIntelligenceRequest,
    kpi_analyses: list[KPIAnalysis],
    milestone_rate: Optional[float],
    risk_counts: dict[str, int],
    risk_summary: str,
) -> PilotIntelligenceResponse:
    """
    Build PilotIntelligenceResponse.
    Deterministic fields (kpi_analyses, milestone_rate, risk_counts, risk_summary)
    come from Python — the LLM only provides qualitative interpretation.
    """
    overall_assessment = _sanitize_claim(
        str(raw.get("overall_assessment") or "No qualitative assessment provided.")
    ).strip()
    observations = [
        _sanitize_claim(o) for o in _extract_str_list(raw.get("observations"))
    ]
    concerns = [
        _sanitize_claim(c) for c in _extract_str_list(raw.get("concerns"))
    ]
    raw_evidence_gaps = _extract_str_list(raw.get("evidence_gaps"))
    evidence_gaps = _reconcile_pilot_evidence_gaps(raw_evidence_gaps, request, kpi_analyses)
    recommended_actions = [
        _sanitize_claim(a) for a in _extract_str_list(raw.get("recommended_actions"))
    ]

    try:
        return PilotIntelligenceResponse(
            kpi_analyses=kpi_analyses,               # deterministic
            milestone_completion_rate=milestone_rate, # deterministic
            risk_summary=risk_summary,               # deterministic
            risk_counts=risk_counts,                 # deterministic
            overall_assessment=overall_assessment,
            observations=observations,
            concerns=concerns,
            evidence_gaps=evidence_gaps,
            recommended_actions=recommended_actions,
        )
    except (ValidationError, TypeError) as exc:
        raise InvalidAIResponseError(
            f"Failed to parse pilot response: {exc}"
        ) from exc
