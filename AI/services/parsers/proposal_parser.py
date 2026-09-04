"""
SetuGov AI Service — Brain 3: Proposal Analysis Parser

Parses LLM proposal analysis JSON and applies deterministic sanitization:
- Claim attribution (no invented "verified"/"proven" language)
- Technology readiness framing (no invented TRL levels)
- Missing information reconciliation (no false gaps)
- Risk normalization
"""

from __future__ import annotations

import re
from typing import Any, Optional

from pydantic import ValidationError

from schemas.requests import ProposalAnalysisRequest
from schemas.responses import (
    ProposalAnalysisResponse,
    ProposalRisk,
    RiskSeverity,
)
from services.ollama_client import InvalidAIResponseError
from services.sanitizers import _extract_str_list, _sanitize_claim


# ═══════════════════════════════════════════════════════════════════════════
# Internal helpers
# ═══════════════════════════════════════════════════════════════════════════


def _parse_proposal_risks(raw_risks: Any) -> list[ProposalRisk]:
    """
    Safely parse and normalize proposal risk entries.
    Handles list of dicts, single dict, string lists, or malformed entries.
    """
    if not raw_risks:
        return []

    valid_categories = {
        "technical", "data", "cybersecurity", "deployment",
        "adoption", "scalability", "governance", "operational",
    }
    severity_map = {
        "LOW": RiskSeverity.LOW,
        "MEDIUM": RiskSeverity.MEDIUM,
        "HIGH": RiskSeverity.HIGH,
    }

    items: list[Any] = raw_risks if isinstance(raw_risks, list) else [raw_risks]
    risks: list[ProposalRisk] = []

    for item in items:
        if isinstance(item, str) and item.strip():
            desc = _sanitize_claim(item.strip())
            risks.append(
                ProposalRisk(
                    category="operational",
                    description=desc,
                    severity=RiskSeverity.MEDIUM,
                    mitigation_suggestion=None,
                )
            )
        elif isinstance(item, dict):
            desc = (
                item.get("description")
                or item.get("risk")
                or item.get("text")
                or item.get("summary")
            )
            if not desc or not isinstance(desc, str) or not desc.strip():
                continue
            desc = _sanitize_claim(desc.strip())

            raw_cat = str(item.get("category", "")).strip().lower()
            category = raw_cat if raw_cat in valid_categories else "operational"

            raw_sev = str(item.get("severity", "")).strip().upper()
            severity = severity_map.get(raw_sev, RiskSeverity.MEDIUM)

            mitigation = item.get("mitigation_suggestion") or item.get("mitigation")
            mitigation_str = (
                _sanitize_claim(str(mitigation).strip())
                if mitigation and isinstance(mitigation, str) and mitigation.strip()
                else None
            )

            risks.append(
                ProposalRisk(
                    category=category,
                    description=desc,
                    severity=severity,
                    mitigation_suggestion=mitigation_str,
                )
            )

    return risks


def _sanitize_technology_readiness(
    raw_readiness: Optional[str], request: ProposalAnalysisRequest
) -> Optional[str]:
    """
    Ensure technology readiness description does not invent TRL numbers,
    claim unverified production readiness, or infer maturity solely from
    technology names.
    """
    techs = ", ".join(
        request.startup.technologies
        or (request.challenge.technology_categories or [])
    )
    default_readiness = (
        f"The submitted proposal describes {techs} technologies. "
        "Available information is insufficient to independently assess technology maturity."
        if techs
        else "Available information is insufficient to independently assess technology maturity."
    )

    if not raw_readiness or not raw_readiness.strip():
        return default_readiness

    cleaned = _sanitize_claim(raw_readiness.strip())

    # Strip invented TRL references (e.g. TRL 7, TRL 9)
    cleaned = re.sub(
        r"\bTRL\s*\d+[^.,;:\n]*[.,;:\n]?", "", cleaned, flags=re.IGNORECASE
    ).strip()
    cleaned = re.sub(r"^[\s\-—:]+", "", cleaned).strip()

    # Reframe unverified maturity and production readiness claims
    cleaned = re.sub(
        r"\b(proven|confirmed|certified)\s+maturity\b",
        "stated maturity",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"\b(proven|confirmed|guaranteed)\s+production\s+readiness\b",
        "reported readiness",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"\bdemonstrated\s+production\s+readiness\b",
        "stated readiness",
        cleaned,
        flags=re.IGNORECASE,
    )

    lower = cleaned.lower()
    uncertainty_present = any(
        phrase in lower
        for phrase in [
            "insufficient",
            "cannot be independently assessed",
            "cannot be fully assessed",
            "unverified",
            "requires validation",
            "subject to",
            "stated maturity",
            "claims",
            "self-reported",
        ]
    )

    if not uncertainty_present:
        cleaned = (
            f"{cleaned.rstrip('.')} — available information is insufficient to "
            "independently assess technology maturity."
        )

    return cleaned or default_readiness


def _reconcile_proposal_missing_information(
    raw_missing: list[str], request: ProposalAnalysisRequest
) -> list[str]:
    """
    Reconcile missing_information to ensure it NEVER falsely contradicts
    supplied proposal, startup, or eligibility data.
    """
    has_cost = bool(
        request.proposal and request.proposal.estimated_cost
        and request.proposal.estimated_cost.strip()
    )
    has_timeline = bool(
        request.proposal and request.proposal.implementation_timeline
        and request.proposal.implementation_timeline.strip()
    )
    has_team = bool(
        request.proposal and request.proposal.team_composition
        and request.proposal.team_composition.strip()
    )
    has_tech_approach = bool(
        request.proposal and request.proposal.technical_approach
        and request.proposal.technical_approach.strip()
    )
    has_experience = bool(
        (request.proposal and request.proposal.past_experience and request.proposal.past_experience.strip())
        or (request.startup and request.startup.experience and request.startup.experience.strip())
        or (request.startup and request.startup.deployments and len(request.startup.deployments) > 0)
    )
    has_certs = bool(
        (request.startup and request.startup.certifications and len(request.startup.certifications) > 0)
        or (request.eligibility and request.eligibility.certifications and len(request.eligibility.certifications) > 0)
    )
    has_eligibility = bool(request.eligibility)

    filtered: list[str] = []
    for item in raw_missing:
        cleaned = item.strip()
        if not cleaned:
            continue
        lower = cleaned.lower()

        if has_cost:
            if "estimated cost" in lower or (
                ("cost" in lower or "budget" in lower) and "breakdown" not in lower
            ):
                continue
            if has_timeline and ("cost" in lower and "timeline" in lower):
                continue

        if has_timeline:
            if "implementation timeline" in lower or "timeline" in lower or "schedule" in lower:
                continue

        if has_team:
            if "team composition" in lower or "team size" in lower:
                continue

        if has_tech_approach:
            if "technical approach" in lower or "technical solution" in lower:
                continue

        if has_experience:
            if "past experience" in lower or "prior experience" in lower or "deployment experience" in lower:
                continue

        if has_certs:
            if "certification" in lower and not any(
                v in lower for v in ["verif", "valid", "authent", "document"]
            ):
                continue

        filtered.append(_sanitize_claim(cleaned))

    # Deterministically add genuinely missing fields
    if not has_tech_approach:
        if not any("technical approach" in m.lower() or "architecture" in m.lower() for m in filtered):
            filtered.append("Detailed technical approach and solution architecture not provided.")

    if not has_cost:
        if not any("cost" in m.lower() or "budget" in m.lower() for m in filtered):
            filtered.append("Estimated cost and budget breakdown not provided.")

    if not has_timeline:
        if not any(
            "timeline" in m.lower() or "schedule" in m.lower() or "milestone" in m.lower()
            for m in filtered
        ):
            filtered.append("Implementation timeline and milestone schedule not provided.")

    if not has_team:
        if not any("team" in m.lower() or "personnel" in m.lower() for m in filtered):
            filtered.append("Team composition and key personnel qualifications not provided.")

    if not has_experience:
        if not any(
            "experience" in m.lower() or "deployment" in m.lower() or "track record" in m.lower()
            for m in filtered
        ):
            filtered.append("Past project experience and deployment track record not provided.")

    if not has_eligibility:
        if not any(
            "eligibility" in m.lower() or "dpiit" in m.lower() or "incorporation" in m.lower()
            for m in filtered
        ):
            filtered.append(
                "Eligibility documentation and statutory registration details not provided."
            )

    return filtered


# ═══════════════════════════════════════════════════════════════════════════
# Public parser
# ═══════════════════════════════════════════════════════════════════════════


def parse_proposal_response(
    raw: dict[str, Any],
    request: ProposalAnalysisRequest,
) -> ProposalAnalysisResponse:
    """
    Parse and sanitize LLM proposal analysis.
    Authoritative cost & timeline come from the request, never from the LLM.
    """
    # Authoritative Cost & Timeline Preservation
    if request.proposal and request.proposal.estimated_cost and request.proposal.estimated_cost.strip():
        final_cost = request.proposal.estimated_cost.strip()
    else:
        final_cost = None

    if (
        request.proposal
        and request.proposal.implementation_timeline
        and request.proposal.implementation_timeline.strip()
    ):
        final_timeline = request.proposal.implementation_timeline.strip()
    else:
        final_timeline = None

    exec_summary = _sanitize_claim(
        str(raw.get("executive_summary") or "No summary provided.")
    ).strip()
    tech_approach = (
        _sanitize_claim(str(raw.get("technical_approach"))).strip()
        if raw.get("technical_approach")
        else None
    )
    expected_impact = (
        _sanitize_claim(str(raw.get("expected_impact"))).strip()
        if raw.get("expected_impact")
        else None
    )
    tech_readiness = _sanitize_technology_readiness(raw.get("technology_readiness"), request)

    risks = _parse_proposal_risks(raw.get("risks"))

    raw_missing = _extract_str_list(raw.get("missing_information"))
    missing_info = _reconcile_proposal_missing_information(raw_missing, request)
    questions = [
        _sanitize_claim(q)
        for q in _extract_str_list(raw.get("questions_for_evaluator"))
    ]

    try:
        return ProposalAnalysisResponse(
            executive_summary=exec_summary,
            technical_approach=tech_approach,
            expected_impact=expected_impact,
            technology_readiness=tech_readiness,
            risks=risks,
            estimated_cost=final_cost,
            implementation_timeline=final_timeline,
            missing_information=missing_info,
            questions_for_evaluator=questions,
        )
    except (ValidationError, TypeError) as exc:
        raise InvalidAIResponseError(
            f"Failed to parse proposal response: {exc}"
        ) from exc
