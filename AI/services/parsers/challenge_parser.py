"""
SetuGov AI Service — Brain 1: Challenge Copilot Parser

Parses and reconciles LLM JSON into ChallengeCopilotResponse.
All user-supplied fields are treated as authoritative.
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import ValidationError

from schemas.requests import ChallengeCopilotRequest
from schemas.responses import (
    ChallengeCopilotResponse,
    PilotRecommendation,
    SuggestedKPI,
)
from services.decision_engine import DecisionEngine
from services.ollama_client import InvalidAIResponseError
from services.sanitizers import (
    _ensure_evidence_aware_assumption,
    _ensure_hypothesis,
    _extract_str_list,
)


# ═══════════════════════════════════════════════════════════════════════════
# Internal helpers
# ═══════════════════════════════════════════════════════════════════════════


def _reconcile_pilot_rationale(
    user_pilot: Optional[Any], raw_rationale: Optional[str]
) -> Optional[str]:
    """Ensure pilot rationale supports user-authoritative pilot parameters and labels alternatives clearly."""
    if not user_pilot:
        return raw_rationale

    has_user_scope = bool(user_pilot.duration or user_pilot.sites or user_pilot.budget)
    if not has_user_scope:
        return raw_rationale

    base_justification_parts = []
    if user_pilot.duration and user_pilot.sites:
        base_justification_parts.append(
            f"Validates solution performance over {user_pilot.duration} across "
            f"{len(user_pilot.sites)} designated site(s) ({', '.join(user_pilot.sites)})."
        )
    elif user_pilot.duration:
        base_justification_parts.append(
            f"Validates solution performance over the specified {user_pilot.duration} pilot duration."
        )
    elif user_pilot.sites:
        base_justification_parts.append(
            f"Validates solution performance across the designated site(s): {', '.join(user_pilot.sites)}."
        )

    base_justification = (
        " ".join(base_justification_parts)
        or "Validates solution performance under user-specified pilot parameters."
    )

    if not raw_rationale or not raw_rationale.strip():
        return base_justification

    rationale_lower = raw_rationale.lower()
    contradiction_indicators = [
        "shorten",
        "reduce duration",
        "reduce the duration",
        "fewer sites",
        "reduce sites",
        "reduce the number of sites",
        "should be reduced",
        "should be shortened",
        "alternative duration",
        "instead of",
        "change duration",
        "smaller cohort",
    ]

    is_contradictory = any(ind in rationale_lower for ind in contradiction_indicators)
    has_alt_label = "optional" in rationale_lower or "alternative" in rationale_lower

    if is_contradictory and not has_alt_label:
        return f"{base_justification} [Optional Alternative Suggestion]: {raw_rationale.strip()}"
    elif is_contradictory and has_alt_label:
        return f"{base_justification} {raw_rationale.strip()}"

    return raw_rationale.strip()


def _match_kpi(
    user_kpi: Any, raw_kpis: list[dict[str, Any]], index: int
) -> Optional[dict[str, Any]]:
    """Match a user-provided KPI to an LLM suggestion by name or position."""
    user_name = user_kpi.name.strip().lower()
    for rk in raw_kpis:
        if isinstance(rk, dict):
            rk_name = str(rk.get("name", "")).strip().lower()
            if rk_name == user_name:
                return rk
    for rk in raw_kpis:
        if isinstance(rk, dict):
            rk_name = str(rk.get("name", "")).strip().lower()
            if rk_name and (rk_name in user_name or user_name in rk_name):
                return rk
    if 0 <= index < len(raw_kpis) and isinstance(raw_kpis[index], dict):
        return raw_kpis[index]
    return None


# ═══════════════════════════════════════════════════════════════════════════
# Public parser
# ═══════════════════════════════════════════════════════════════════════════


def parse_challenge_response(
    raw: dict[str, Any],
    request: Optional[ChallengeCopilotRequest] = None,
) -> ChallengeCopilotResponse:
    """
    Safely parse and reconcile LLM JSON into ChallengeCopilotResponse.
    Explicit user-provided fields are authoritative and preserved.
    """
    try:
        # ── Root Causes (Hypotheses) ──────────────────────────────────
        raw_hypotheses = _extract_str_list(raw.get("root_cause_hypotheses"))
        hypotheses = [_ensure_hypothesis(h) for h in raw_hypotheses]

        # ── Desired Outcome & Success Definition ──────────────────────
        if request and request.outcome and request.outcome.desired_outcome and request.outcome.desired_outcome.strip():
            desired_outcome = request.outcome.desired_outcome
        else:
            desired_outcome = raw.get("desired_outcome")

        if request and request.outcome and request.outcome.success_definition and request.outcome.success_definition.strip():
            success_definition = request.outcome.success_definition
        else:
            success_definition = raw.get("success_definition")

        # ── KPIs Reconciliation ───────────────────────────────────────
        raw_kpis = raw.get("suggested_kpis", [])
        if not isinstance(raw_kpis, list):
            raw_kpis = []

        kpis: list[SuggestedKPI] = []
        warnings: list[str] = _extract_str_list(raw.get("warnings"))

        if request and request.measurement and request.measurement.kpis:
            # User provided authoritative KPIs
            user_weights: list[float] = []
            has_user_weights = False

            for i, user_kpi in enumerate(request.measurement.kpis):
                match = _match_kpi(user_kpi, raw_kpis, i)

                kpi_name = user_kpi.name
                kpi_desc = user_kpi.description or (
                    match.get("description") if match else None
                ) or f"Measures {user_kpi.name}"
                kpi_unit = user_kpi.unit or (match.get("unit") if match else None)
                # Baseline: strictly user-provided (None if not provided)
                kpi_baseline = user_kpi.baseline
                # Target: user-provided if present, else AI suggestion
                kpi_target = user_kpi.target if user_kpi.target is not None else (
                    match.get("target") if match and isinstance(match.get("target"), (int, float)) else None
                )
                kpi_direction = user_kpi.direction or (
                    match.get("direction") if match else None
                )
                kpi_method = user_kpi.measurement_method or (
                    match.get("measurement_method") if match else None
                )

                # Weight: user-provided weight is authoritative
                if user_kpi.weight is not None:
                    kpi_weight = float(user_kpi.weight)
                    user_weights.append(kpi_weight)
                    has_user_weights = True
                else:
                    kpi_weight = float(match.get("suggested_weight")) if match and match.get("suggested_weight") is not None else None

                kpi_reason = (match.get("reason") if match else None) or "User-provided KPI"

                kpis.append(
                    SuggestedKPI(
                        name=kpi_name,
                        description=kpi_desc,
                        unit=kpi_unit,
                        baseline=kpi_baseline,
                        target=kpi_target,
                        direction=kpi_direction,
                        measurement_method=kpi_method,
                        suggested_weight=kpi_weight,
                        reason=kpi_reason,
                    )
                )

            # Only warn if explicitly provided weights exceed 100%
            if has_user_weights and user_weights:
                total_w = sum(user_weights)
                if total_w > 100.0:
                    warnings.append(
                        f"User-provided KPI weights sum to {total_w:.0f}%, which exceeds 100%. "
                        "Please review weight allocation."
                    )
        else:
            # User provided NO KPIs — parse AI suggestions
            for k in raw_kpis:
                if isinstance(k, dict):
                    k_copy = dict(k)
                    # AI must never invent a baseline
                    k_copy["baseline"] = None
                    if not k_copy.get("description"):
                        k_copy["description"] = f"Measures {k_copy.get('name', 'KPI')}"
                    try:
                        kpis.append(SuggestedKPI(**k_copy))
                    except Exception:
                        pass

            # Normalize pure AI-suggested weights if they don't sum to 100
            if kpis:
                ai_weights = [
                    k.suggested_weight
                    for k in kpis
                    if k.suggested_weight is not None
                ]
                if ai_weights and not DecisionEngine.validate_kpi_weights(ai_weights):
                    normalized = DecisionEngine.normalize_kpi_weights(ai_weights)
                    wi = 0
                    for kpi in kpis:
                        if kpi.suggested_weight is not None:
                            kpi.suggested_weight = normalized[wi]
                            wi += 1

        # ── Pilot Recommendation ──────────────────────────────────────
        pilot_rec: Optional[PilotRecommendation] = None
        raw_pilot = raw.get("pilot_recommendation")
        if not isinstance(raw_pilot, dict):
            raw_pilot = {}

        if request and request.pilot:
            s_duration = request.pilot.duration or raw_pilot.get("suggested_duration")
            s_sites = (
                list(request.pilot.sites)
                if request.pilot.sites is not None
                else _extract_str_list(raw_pilot.get("suggested_sites"))
            )
            s_budget = request.pilot.budget or raw_pilot.get("suggested_budget_considerations")
            s_rationale = _reconcile_pilot_rationale(request.pilot, raw_pilot.get("rationale"))
            pilot_rec = PilotRecommendation(
                suggested_duration=s_duration,
                suggested_sites=s_sites,
                suggested_budget_considerations=s_budget,
                rationale=s_rationale,
            )
        elif raw_pilot:
            try:
                pilot_rec = PilotRecommendation(
                    suggested_duration=raw_pilot.get("suggested_duration"),
                    suggested_sites=_extract_str_list(raw_pilot.get("suggested_sites")),
                    suggested_budget_considerations=raw_pilot.get("suggested_budget_considerations"),
                    rationale=raw_pilot.get("rationale"),
                )
            except Exception:
                pilot_rec = None

        # ── Requirements & Domain ─────────────────────────────────────
        if request and request.requirements and request.requirements.technologies and len(request.requirements.technologies) > 0:
            tech_categories = list(request.requirements.technologies)
        else:
            tech_categories = _extract_str_list(raw.get("technology_categories"))

        if request and request.requirements and request.requirements.domain and request.requirements.domain.strip():
            domain = request.requirements.domain
        else:
            domain = raw.get("domain")

        if request and request.requirements and request.requirements.eligibility and len(request.requirements.eligibility) > 0:
            eligibility = list(request.requirements.eligibility)
        else:
            eligibility = _extract_str_list(raw.get("eligibility_considerations"))

        if request and request.requirements and request.requirements.documents and len(request.requirements.documents) > 0:
            user_docs = list(request.requirements.documents)
            raw_docs = _extract_str_list(raw.get("suggested_documents"))
            ai_docs = [d for d in raw_docs if d not in user_docs]
            suggested_docs = user_docs + ai_docs
        else:
            suggested_docs = _extract_str_list(raw.get("suggested_documents"))

        # ── Missing Information ───────────────────────────────────────
        missing_info = _extract_str_list(raw.get("missing_information"))
        if request:
            has_measurable_problem_baseline = (
                request.problem.baseline is not None
                and DecisionEngine.is_measurable_baseline(request.problem.baseline)
            )
            has_kpi_baseline = (
                request.measurement is not None
                and any(k.baseline is not None for k in request.measurement.kpis)
            )
            if not has_measurable_problem_baseline and not has_kpi_baseline:
                if not any("baseline" in m.lower() for m in missing_info):
                    missing_info.append(
                        "Quantitative baseline data not provided or not consistently measured."
                    )

        # ── Assumptions ───────────────────────────────────────────────
        raw_assumptions = _extract_str_list(raw.get("assumptions"))
        assumptions = [_ensure_evidence_aware_assumption(a) for a in raw_assumptions]

        return ChallengeCopilotResponse(
            problem_summary=raw.get("problem_summary", "No summary provided."),
            stakeholders=_extract_str_list(raw.get("stakeholders")),
            root_cause_hypotheses=hypotheses,
            desired_outcome=desired_outcome,
            success_definition=success_definition,
            suggested_kpis=kpis,
            pilot_recommendation=pilot_rec,
            technology_categories=tech_categories,
            domain=domain,
            eligibility_considerations=eligibility,
            suggested_documents=suggested_docs,
            missing_information=missing_info,
            assumptions=assumptions,
            warnings=warnings,
        )
    except (ValidationError, TypeError, KeyError) as exc:
        raise InvalidAIResponseError(
            f"Failed to parse challenge response: {exc}"
        ) from exc
