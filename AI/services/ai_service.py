"""
SetuGov AI Service — AI Service Orchestrator

Coordinates the five AI brains:
1. Receives typed requests
2. Runs deterministic calculations (via DecisionEngine)
3. Builds prompts
4. Calls OllamaClient
5. Parses and validates responses via Pydantic
6. Returns typed responses
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

from pydantic import ValidationError

from prompts.challenge_copilot import build_challenge_prompt
from prompts.document_assistance import build_document_prompt
from prompts.match_explanation import build_match_prompt
from prompts.pilot_intelligence import build_pilot_prompt
from prompts.proposal_analysis import build_proposal_prompt
from schemas.requests import (
    ChallengeCopilotRequest,
    DocumentAssistanceRequest,
    DocumentType,
    MatchExplanationRequest,
    PilotIntelligenceRequest,
    ProposalAnalysisRequest,
)
from schemas.responses import (
    ChallengeCopilotResponse,
    DocumentAssistanceResponse,
    KPIAnalysis,
    KPIStatus,
    MatchExplanationResponse,
    MatchScoreBreakdown,
    PilotIntelligenceResponse,
    PilotRecommendation,
    ProposalAnalysisResponse,
    ProposalRisk,
    RiskSeverity,
    SuggestedKPI,
)
from services.decision_engine import DecisionEngine
from services.ollama_client import InvalidAIResponseError, OllamaClient
from services.parsers.challenge_parser import parse_challenge_response
from services.parsers.document_parser import parse_document_response
from services.parsers.match_parser import parse_match_response
from services.parsers.pilot_parser import parse_pilot_response
from services.parsers.proposal_parser import parse_proposal_response

logger = logging.getLogger("setugov.ai.service")


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
                desc = item.get("description") or item.get("name") or item.get("hypothesis") or item.get("text") or str(item)
                if desc and isinstance(desc, str) and desc.strip():
                    items.append(desc.strip())
        return items
    return []


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


def _parse_proposal_risks(raw_risks: Any) -> list[ProposalRisk]:
    """
    Safely parse and normalize proposal risk entries.
    Handles list of dicts, single dict, string lists, or malformed entries.
    """
    if not raw_risks:
        return []

    valid_categories = {
        "technical", "data", "cybersecurity", "deployment", "adoption", "scalability", "governance", "operational"
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
            desc = item.get("description") or item.get("risk") or item.get("text") or item.get("summary")
            if not desc or not isinstance(desc, str) or not desc.strip():
                continue
            desc = _sanitize_claim(desc.strip())

            raw_cat = str(item.get("category", "")).strip().lower()
            category = raw_cat if raw_cat in valid_categories else "operational"

            raw_sev = str(item.get("severity", "")).strip().upper()
            severity = severity_map.get(raw_sev, RiskSeverity.MEDIUM)

            mitigation = item.get("mitigation_suggestion") or item.get("mitigation")
            mitigation_str = _sanitize_claim(str(mitigation).strip()) if mitigation and isinstance(mitigation, str) and mitigation.strip() else None

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
    claim unverified production readiness, or infer maturity solely from technology names.
    """
    techs = ", ".join(
        request.startup.technologies
        or (request.challenge.technology_categories or [])
    )
    default_readiness = (
        f"The submitted proposal describes {techs} technologies. Available information is insufficient to independently assess technology maturity."
        if techs
        else "Available information is insufficient to independently assess technology maturity."
    )

    if not raw_readiness or not raw_readiness.strip():
        return default_readiness

    cleaned = _sanitize_claim(raw_readiness.strip())

    # Strip invented TRL references (e.g. TRL 7, TRL 9)
    cleaned = re.sub(r"\bTRL\s*\d+[^.,;:\n]*[.,;:\n]?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"^[\s\-—:]+", "", cleaned).strip()

    # Reframe unverified maturity and production readiness claims
    cleaned = re.sub(r"\b(proven|confirmed|certified)\s+maturity\b", "stated maturity", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b(proven|confirmed|guaranteed)\s+production\s+readiness\b", "reported readiness", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bdemonstrated\s+production\s+readiness\b", "stated readiness", cleaned, flags=re.IGNORECASE)

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
        cleaned = f"{cleaned.rstrip('.')} — available information is insufficient to independently assess technology maturity."

    return cleaned or default_readiness


def _reconcile_proposal_missing_information(
    raw_missing: list[str], request: ProposalAnalysisRequest
) -> list[str]:
    """
    Reconcile missing_information to ensure it NEVER falsely contradicts
    supplied proposal, startup, or eligibility data.
    """
    has_cost = bool(request.proposal and request.proposal.estimated_cost and request.proposal.estimated_cost.strip())
    has_timeline = bool(request.proposal and request.proposal.implementation_timeline and request.proposal.implementation_timeline.strip())
    has_team = bool(request.proposal and request.proposal.team_composition and request.proposal.team_composition.strip())
    has_tech_approach = bool(request.proposal and request.proposal.technical_approach and request.proposal.technical_approach.strip())
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

        # Filter items that contradict supplied data
        if has_cost:
            # If cost is supplied, filter out claims that "estimated cost" or general "cost" is missing
            if "estimated cost" in lower or (("cost" in lower or "budget" in lower) and "breakdown" not in lower):
                continue
            # If item combines cost and timeline, filter if both are supplied
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
            # Do not claim certification is missing if it was provided (verification of cert is ok)
            if "certification" in lower and not any(v in lower for v in ["verif", "valid", "authent", "document"]):
                continue

        filtered.append(_sanitize_claim(cleaned))

    # Deterministically add genuinely missing fields if absent from filtered list
    if not has_tech_approach:
        if not any("technical approach" in m.lower() or "architecture" in m.lower() for m in filtered):
            filtered.append("Detailed technical approach and solution architecture not provided.")

    if not has_cost:
        if not any("cost" in m.lower() or "budget" in m.lower() for m in filtered):
            filtered.append("Estimated cost and budget breakdown not provided.")

    if not has_timeline:
        if not any("timeline" in m.lower() or "schedule" in m.lower() or "milestone" in m.lower() for m in filtered):
            filtered.append("Implementation timeline and milestone schedule not provided.")

    if not has_team:
        if not any("team" in m.lower() or "personnel" in m.lower() for m in filtered):
            filtered.append("Team composition and key personnel qualifications not provided.")

    if not has_experience:
        if not any("experience" in m.lower() or "deployment" in m.lower() or "track record" in m.lower() for m in filtered):
            filtered.append("Past project experience and deployment track record not provided.")

    if not has_eligibility:
        if not any("eligibility" in m.lower() or "dpiit" in m.lower() or "incorporation" in m.lower() for m in filtered):
            filtered.append("Eligibility documentation and statutory registration details not provided.")

    return filtered


def _reconcile_pilot_evidence_gaps(
    raw_gaps: list[str],
    request: PilotIntelligenceRequest,
    kpi_analyses: list[KPIAnalysis],
) -> list[str]:
    """
    Reconcile and filter evidence_gaps for pilot intelligence.
    Deterministically injects missing data entries for KPIs with INSUFFICIENT_DATA,
    unverified evidence, or absent feedback/validation without falsely reporting
    supplied evidence as missing.
    """
    sanitized: list[str] = [_sanitize_claim(g) for g in raw_gaps if g and g.strip()]

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
            if not any(kpi_name_lower in s.lower() and ("missing" in s.lower() or "incomplete" in s.lower() or "baseline" in s.lower() or "actual" in s.lower()) for s in sanitized):
                sanitized.append(f"Incomplete measurement data for KPI '{kpi.name}': missing {', '.join(missing_parts)}.")

    # 2. Unverified evidence items
    if request.evidence:
        unverified_items = [e.description for e in request.evidence if e.verified is False or e.verified is None]
        if unverified_items and not any("unverified" in s.lower() or "third-party" in s.lower() or "verification" in s.lower() for s in sanitized):
            sanitized.append(f"Supplied evidence items ({len(unverified_items)}) lack independent third-party verification.")

    # 3. Absent user feedback
    if not (request.user_feedback and request.user_feedback.strip()):
        if not any("user feedback" in s.lower() or "stakeholder feedback" in s.lower() for s in sanitized):
            sanitized.append("End-user and operational stakeholder feedback not documented.")

    # 4. Absent independent validation
    if not (request.independent_validation and request.independent_validation.strip()):
        if not any("independent validation" in s.lower() or "external audit" in s.lower() or "third-party validation" in s.lower() for s in sanitized):
            sanitized.append("Independent third-party validation or technical audit not conducted.")

    return sanitized


def _build_default_document_content(request: DocumentAssistanceRequest) -> str:
    """Build a structured multi-section document template integrating all supplied facts."""
    title = request.challenge_title or "Government Innovation Challenge"
    desc = request.challenge_description or "Operational challenge details."
    startup = request.startup_name or "[STARTUP NAME]"
    duration = request.pilot_duration or "[PILOT DURATION]"
    sites = ", ".join(request.pilot_sites) if request.pilot_sites else "[PILOT SITES]"
    budget = request.pilot_budget or "[PILOT BUDGET]"

    kpi_lines = []
    if request.kpis:
        for k in request.kpis:
            line = f"- {k.name}"
            if k.unit:
                line += f" ({k.unit})"
            if k.baseline is not None and k.target is not None:
                line += f": baseline={k.baseline}, target={k.target}"
            kpi_lines.append(line)
    kpis_text = "\n".join(kpi_lines) if kpi_lines else "- [KEY PERFORMANCE INDICATORS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]"

    obj_lines = [f"- {o}" for o in request.objectives] if request.objectives else ["- [OBJECTIVES NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]"]
    objectives_text = "\n".join(obj_lines)

    if request.document_type == DocumentType.PILOT_AGREEMENT_DRAFT:
        return f"""## 1. Pilot Scope
This Pilot Agreement Draft outlines the operational scope and testing terms for the pilot solution '{title}' undertaken in collaboration with {startup}.

## 2. Objectives
The primary objectives of this pilot deployment are:
{objectives_text}

## 3. Duration & Timeline
The authorized duration for this pilot deployment is {duration}, commencing upon formal deployment authorization.

## 4. Pilot Sites
The pilot implementation will be conducted at the following designated location(s):
- {sites}

## 5. Government & Startup Responsibilities
Government Entity Responsibilities:
- Facilitate authorized facility access, operational site readiness, and departmental coordination at pilot locations.
- Provide designated operational focal points for monitoring and oversight.

Startup ({startup}) Responsibilities:
- Deploy and maintain the pilot solution in accordance with agreed technical specifications.
- Provide operational orientation and technical support to designated departmental personnel.

## 6. Milestones & Deliverables
- Milestone 1: Site readiness, deployment configuration, and baseline verification.
- Milestone 2: Mid-point operational review and interim data capture.
- Milestone 3: Final pilot evaluation, KPI measurement consolidation, and completion reporting.

## 7. Key Performance Indicators & Target Outcomes
The success of the pilot will be evaluated against the following parameters:
{kpis_text}

## 8. Budget & Payment Terms
Total Pilot Budget: {budget}
Disbursement Schedule: [PAYMENT SCHEDULE NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]

## 9. Data Governance & Handling
All operational, administrative, and citizen data handled during the pilot shall be processed in strict compliance with applicable government data protection policies.
Specific Data Handling Terms: [DATA GOVERNANCE PROTOCOL — SUBJECT TO AUTHORIZED REVIEW]

## 10. Intellectual Property Considerations
[IP OWNERSHIP TERMS NOT SPECIFIED — SUBJECT TO AUTHORIZED LEGAL REVIEW]

## 11. Cybersecurity Responsibilities
The startup shall maintain appropriate technical and organizational safeguards.
Cybersecurity Verification: [CYBERSECURITY STANDARDS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]

## 12. Risk Management
Both parties shall promptly notify and coordinate regarding operational disruptions or technical bottlenecks.
Risk Mitigation Plan: [RISK MANAGEMENT PLAN NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]

## 13. Termination Conditions
[TERMINATION CONDITIONS NOT SPECIFIED — SUBJECT TO AUTHORIZED REVIEW]

## 14. Extension Conditions
[EXTENSION CONDITIONS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]

## 15. Review & Authorized Signatories
Authorized Signatories: [AUTHORIZED SIGNATORIES AND OFFICIAL ENTITY ADDRESSES NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]
Execution Date: [EXECUTION DATE NOT SPECIFIED]"""

    elif request.document_type == DocumentType.CHALLENGE_STATEMENT:
        return f"""## 1. Problem Statement
{desc}

## 2. Operational Background
Background and context regarding the problem '{title}'.

## 3. Desired Outcomes
{objectives_text}

## 4. Success Criteria
Demonstrated operational improvement across pilot deployment sites.

## 5. Key Performance Indicators & Baseline Metrics
{kpis_text}

## 6. Pilot Parameters
- Duration: {duration}
- Designated Sites: {sites}
- Estimated Pilot Budget: {budget}

## 7. Technology Scope & Requirements
Solution approach: [TECHNOLOGY SCOPE — OUTCOME-BASED]

## 8. Eligibility Guidelines
Eligible entities must satisfy standard innovation procurement criteria.

## 9. Submission & Review Process
Submissions will be evaluated by an authorized departmental review panel."""

    else:
        return f"""## 1. Overview
Document draft for '{title}'.

## 2. Objectives & Scope
{objectives_text}

## 3. Key Parameters
- Duration: {duration}
- Sites: {sites}
- Budget: {budget}

## 4. Measurement & Governance
{kpis_text}

## 5. Authorized Review & Next Steps
[DETAILED TERMS SUBJECT TO AUTHORIZED REVIEW]"""


def _extract_supplied_field(context: Optional[str], keywords: list[str]) -> Optional[str]:
    """
    Extract a supplied key-value pair from additional_context or description if present.
    Returns the cleaned value string, or None if not supplied or if the value is itself a placeholder.
    """
    if not context:
        return None
    for kw in keywords:
        # Match "start date: 2026-09-15" or "payment schedule: 50% on X, 50% on Y."
        pattern = r"(?:^|[.\n;])\s*" + re.escape(kw) + r"\s*[:=-]\s*([^\n;\.]+)"
        m = re.search(pattern, context, flags=re.IGNORECASE)
        if m:
            val = m.group(1).strip().strip("'\"")
            if val and not any(val.lower().startswith(p) for p in ["[requires", "[subject", "not specified", "not provided", "tbd", "to be determined"]):
                return val
    return None


def _sanitize_document_content(
    content: str, request: DocumentAssistanceRequest
) -> str:
    """
    Sanitize generated document draft content:
    1. Replaces template variables with supplied values (if provided) or explicit review placeholders.
    2. Preserves intentional missing-data placeholders when fields are not supplied.
    3. Reconciles user targets, baselines, and objective percentages against LLM alteration.
    4. Prevents unauthorized claims that the document is final, approved, or binding.
    5. Replaces invented IP, payment splits, termination, and cybersecurity terms with review placeholders if unsupplied.
    6. Ensures structured section content is present (enriches if output is too thin).
    7. Ensures mandatory review label is present at the top.
    """
    cleaned = content.strip() if content else ""

    # If the LLM returned essentially empty content (< 60 chars or lacks section headings)
    if len(cleaned) < 60 or not any(h in cleaned for h in ["##", "1.", "Pilot Scope", "Objectives", "Scope:"]):
        cleaned = _build_default_document_content(request)

    # General claim sanitization
    cleaned = _sanitize_claim(cleaned)

    # Extract any fields supplied via additional_context
    supplied_start_date = _extract_supplied_field(
        request.additional_context, ["start date", "commencement date", "pilot start date", "commencing on", "commences on", "start_date"]
    )
    supplied_end_date = _extract_supplied_field(
        request.additional_context, ["end date", "completion date", "pilot end date", "pilot completion date", "end_date"]
    )
    supplied_govt = _extract_supplied_field(
        request.additional_context, ["government entity", "government department", "department", "procuring agency", "client entity", "government_name", "government_entity"]
    ) or _extract_supplied_field(request.challenge_description, ["department of", "ministry of"])
    supplied_reviewer = _extract_supplied_field(
        request.additional_context, ["reviewer", "reviewed by", "authorizing officer", "nodal officer"]
    )
    supplied_payment = _extract_supplied_field(
        request.additional_context, ["payment schedule", "disbursement schedule", "payment milestone", "payment terms"]
    )
    supplied_ip = _extract_supplied_field(
        request.additional_context, ["ip ownership", "intellectual property", "ip terms", "ip rights"]
    )
    supplied_cyber = _extract_supplied_field(
        request.additional_context, ["cybersecurity standards", "cybersecurity", "security standards", "security compliance"]
    )
    supplied_signatories = _extract_supplied_field(
        request.additional_context, ["signatories", "authorized signatories", "authorized signers", "signatory"]
    )
    supplied_jurisdiction = _extract_supplied_field(
        request.additional_context, ["jurisdiction", "dispute resolution", "governing jurisdiction", "arbitration"]
    )
    supplied_termination = _extract_supplied_field(
        request.additional_context, ["termination conditions", "termination notice", "notice period"]
    )
    supplied_extension = _extract_supplied_field(
        request.additional_context, ["extension conditions", "extension terms", "extension timeline"]
    )

    # ───────────────────────────────────────────────────────────────────
    # 1. Standardize Placeholders & Prevent Template Leaks
    # ───────────────────────────────────────────────────────────────────
    # Standardize review placeholders that may contain underscores
    cleaned = re.sub(r"\[SUBJECT_TO_AUTHORIZED_LEGAL_REVIEW\]", "[SUBJECT TO AUTHORIZED LEGAL REVIEW]", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[SUBJECT_TO_AUTHORIZED_LEGAL REVIEW\]", "[SUBJECT TO AUTHORIZED LEGAL REVIEW]", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[CYBERSECURITY_STANDARDS\s*—\s*REQUIRES\s*AUTHORIZED\s*REVIEW\]", "[CYBERSECURITY STANDARDS — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[MILESTONE_DELIVERABLES_NOT_SPECIFIED\s*—\s*REQUIRES\s*AUTHORIZED\s*REVIEW\]", "[MILESTONE DELIVERABLES NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[EXTENSION_CONDITIONS_NOT_SPECIFIED\s*—\s*REQUIRES\s*AUTHORIZED\s*REVIEW\]", "[EXTENSION CONDITIONS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)

    # Prevent [STARTUP_NAME] from leaking into date / commencement positions
    date_startup_patterns = [
        r"\bcommence\s+on\s+\[STARTUP(?:_|\s+)NAME\]",
        r"\bcommencing\s+on\s+\[STARTUP(?:_|\s+)NAME\]",
        r"\bstarting\s+on\s+\[STARTUP(?:_|\s+)NAME\]",
        r"\bterminate\s+on\s+\[STARTUP(?:_|\s+)NAME\]",
        r"\[STARTUP(?:_|\s+)NAME\]\s*day\b",
        r"\[STARTUP(?:_|\s+)NAME\]\s*[(‘']Commencement Date[’')]",
    ]
    start_date_rep = supplied_start_date or "[START DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]"
    for pat in date_startup_patterns:
        cleaned = re.sub(pat, f"commence on {start_date_rep}", cleaned, flags=re.IGNORECASE)

    # Standardize or resolve date placeholders
    if supplied_start_date:
        cleaned = re.sub(r"\[(?:(?:STARTUP_)?START\s*DATE|(?:STARTUP_)?START_DATE|(?:STARTUP_)?STARTDATE|(?:STARTUP)?_?COMMENCEMENT_DATE|COMMENCEMENT\s*DATE)(?:\s*[—–-][^\]]*)?\]", supplied_start_date, cleaned, flags=re.IGNORECASE)
    else:
        cleaned = re.sub(r"\[(?:(?:STARTUP_)?START\s*DATE|(?:STARTUP_)?START_DATE|(?:STARTUP_)?STARTDATE|(?:STARTUP)?_?COMMENCEMENT_DATE|COMMENCEMENT\s*DATE)(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\]", "[START DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)

    if supplied_end_date:
        cleaned = re.sub(r"\[(?:END\s*DATE|END_DATE|ENDDATE|COMPLETION\s*DATE|COMPLETION_DATE|COMPLETIONDATE)(?:\s*[—–-][^\]]*)?\]", supplied_end_date, cleaned, flags=re.IGNORECASE)
    else:
        cleaned = re.sub(r"\[(?:END\s*DATE|END_DATE|ENDDATE)(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\]", "[END DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\[(?:COMPLETION\s*DATE|COMPLETION_DATE|COMPLETIONDATE)(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\]", "[COMPLETION DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)

    cleaned = re.sub(r"\[(?:DEPLOYMENT\s*DATE|DEPLOYMENT_DATE|DEPLOYMENTDATE)(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\]", "[DEPLOYMENT DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[(?:TERMINATION\s*NOTICE|TERMINATION_NOTICE|TERMINATIONNOTICE)(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\]", "[TERMINATION NOTICE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[DATE(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\]", "[DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[(?:TIMEFRAME|TIMELINE_NOT_SPECIFIED)\]", "[TIMEFRAME — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)

    if supplied_signatories:
        cleaned = re.sub(r"\[(?:AUTHORIZED\s+)?SIGNATORIES[^\]]*\]", supplied_signatories, cleaned, flags=re.IGNORECASE)
    else:
        cleaned = re.sub(r"\[SIGNATORIES\]", "[AUTHORIZED SIGNATORIES AND OFFICIAL ENTITY ADDRESSES NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)

    if supplied_govt:
        cleaned = re.sub(r"\[GOVERNMENT(?:_|\s+)(?:NAME|ENTITY|DEPARTMENT)[^\]]*\]", supplied_govt, cleaned, flags=re.IGNORECASE)
    else:
        cleaned = re.sub(r"\[GOVERNMENT(?:_|\s+)NAME\]", "Government Entity", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\[GOVERNMENT(?:_|\s+)(?:ENTITY|DEPARTMENT)(?:\s*[—–-]\s*NOT\s*SPECIFIED)?(?:\s*[—–-]\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\]", "[GOVERNMENT ENTITY — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)

    if supplied_payment:
        cleaned = re.sub(r"\[(?:PAYMENT\s+SCHEDULE|PAYMENT|DISBURSEMENT\s+TERMS)[^\]]*\]", f"Payment Schedule: {supplied_payment}", cleaned, flags=re.IGNORECASE)

    if supplied_cyber:
        cleaned = re.sub(r"\[(?:CYBERSECURITY(?:\s+STANDARDS)?|SECURITY\s+PROTOCOLS)[^\]]*\]", f"Cybersecurity Standards: {supplied_cyber}", cleaned, flags=re.IGNORECASE)

    if supplied_ip:
        cleaned = re.sub(r"\[(?:IP\s+OWNERSHIP(?:\s+TERMS)?|INTELLECTUAL\s+PROPERTY)[^\]]*\]", f"IP Ownership Terms: {supplied_ip}", cleaned, flags=re.IGNORECASE)

    if supplied_jurisdiction:
        cleaned = re.sub(r"\[(?:DISPUTE\s+RESOLUTION|GOVERNING\s+JURISDICTION)[^\]]*\]", f"Dispute Resolution & Jurisdiction: {supplied_jurisdiction}", cleaned, flags=re.IGNORECASE)

    if supplied_termination:
        cleaned = re.sub(r"\[(?:TERMINATION\s+NOTICE|EXTENSION\s+CONDITIONS)[^\]]*\]", f"Termination Notice: {supplied_termination}", cleaned, flags=re.IGNORECASE)

    # Normalize accidental duplicated punctuation (e.g. ".." -> ".", "!!" -> "!", "??" -> "?")
    cleaned = re.sub(r"(?<!\.)\.\.(?!\.)", ".", cleaned)
    cleaned = re.sub(r"!{2,}", "!", cleaned)
    cleaned = re.sub(r"\?{2,}", "?", cleaned)

    # ───────────────────────────────────────────────────────────────────
    # 2. Authoritative Fact Injection (Replace template placeholders)
    # ───────────────────────────────────────────────────────────────────
    if request.startup_name:
        cleaned = re.sub(r"\[STARTUP(?:_|\s+)NAME\]", request.startup_name, cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\[STARTUP\]", request.startup_name, cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\[COMPANY(?:_|\s+)NAME\]", request.startup_name, cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\[VENDOR(?:_|\s+)NAME\]", request.startup_name, cleaned, flags=re.IGNORECASE)
        if request.startup_name not in cleaned:
            if re.search(r"\bThe\s+Startup\b", cleaned):
                cleaned = re.sub(r"\bThe\s+Startup\b", request.startup_name, cleaned)
            elif re.search(r"\bStartup\b", cleaned):
                cleaned = re.sub(r"\bStartup\b", request.startup_name, cleaned)
            elif "## 1. Pilot Scope" in cleaned:
                cleaned = re.sub(r"(##\s*1\.\s*Pilot\s*Scope[^\n]*\n+)", r"\1Pilot deployment for " + request.startup_name + r".\n\n", cleaned)
    else:
        cleaned = re.sub(r"\[STARTUP(?:_|\s+)NAME\]", "[STARTUP NAME NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\[STARTUP\]", "[STARTUP NAME NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)

    if request.pilot_duration:
        cleaned = re.sub(r"\[PILOT(?:_|\s+)DURATION\](?:\s*days)?", request.pilot_duration, cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\[DURATION\](?:\s*days)?", request.pilot_duration, cleaned, flags=re.IGNORECASE)
        # Ensure duration is present in Duration & Timeline section
        if request.pilot_duration not in cleaned:
            cleaned = re.sub(
                r"(##\s*3\.\s*Duration\s*&\s*Timeline[^\n]*\n+)",
                r"\1The authorized duration for this pilot deployment is " + request.pilot_duration + r", commencing upon formal deployment authorization.\n\n",
                cleaned,
                flags=re.IGNORECASE,
            )

    if request.pilot_budget:
        cleaned = re.sub(r"\[PILOT(?:_|\s+)BUDGET\]", request.pilot_budget, cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\[BUDGET\]", request.pilot_budget, cleaned, flags=re.IGNORECASE)
        if request.pilot_budget not in cleaned:
            if "## 8. Budget" in cleaned or "## 8. Pilot Budget" in cleaned:
                cleaned = re.sub(r"(##\s*8\.\s*[^\n]*\n+)", r"\1Total Pilot Budget: " + request.pilot_budget + r"\n\n", cleaned)

    if request.pilot_sites:
        sites_str = ", ".join(request.pilot_sites)
        cleaned = re.sub(r"\[PILOT(?:_|\s+)SITES\]", sites_str, cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\[SITES\]", sites_str, cleaned, flags=re.IGNORECASE)
        # Ensure pilot sites are present if omitted
        if not any(site in cleaned for site in request.pilot_sites):
            sites_lines = "\n".join(f"- {s}" for s in request.pilot_sites)
            if "## 4. Pilot Sites" in cleaned:
                cleaned = re.sub(r"(##\s*4\.\s*Pilot\s*Sites[^\n]*\n+)", r"\1" + sites_lines + r"\n\n", cleaned)
            else:
                cleaned += f"\n\n## 4. Pilot Sites\n{sites_lines}"

    if request.challenge_title:
        cleaned = re.sub(r"\[CHALLENGE(?:_|\s+)TITLE\]", request.challenge_title, cleaned, flags=re.IGNORECASE)

    # Clean programming variable leaks (e.g. {{startup_name}}, {startup_name}, <START_DATE>)
    programming_leaks = [
        (r"\{\{\s*startup_name\s*\}\}", request.startup_name or "[STARTUP NAME NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]"),
        (r"\{\s*startup_name\s*\}", request.startup_name or "[STARTUP NAME NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]"),
        (r"\{\{\s*government_name\s*\}\}", supplied_govt or "Government Entity"),
        (r"\{\s*government_name\s*\}", supplied_govt or "Government Entity"),
        (r"\{\{\s*pilot_duration\s*\}\}", request.pilot_duration or "[PILOT DURATION NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]"),
        (r"\{\s*pilot_duration\s*\}", request.pilot_duration or "[PILOT DURATION NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]"),
        (r"\{\{\s*pilot_budget\s*\}\}", request.pilot_budget or "[PILOT BUDGET NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]"),
        (r"\{\s*pilot_budget\s*\}", request.pilot_budget or "[PILOT BUDGET NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]"),
        (r"<\s*START_DATE\s*>", supplied_start_date or "[START DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]"),
        (r"<\s*END_DATE\s*>", supplied_end_date or "[END DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]"),
        (r"<\s*STARTUP_NAME\s*>", request.startup_name or "[STARTUP NAME NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]"),
        (r"<\s*GOVERNMENT_NAME\s*>", supplied_govt or "Government Entity"),
    ]
    for leak_pat, leak_rep in programming_leaks:
        cleaned = re.sub(leak_pat, leak_rep, cleaned, flags=re.IGNORECASE)

    # ───────────────────────────────────────────────────────────────────
    # 3. Target & Objective Percentage Reconciliation (Anti-Altering)
    # ───────────────────────────────────────────────────────────────────
    if request.objectives:
        for obj in request.objectives:
            pct_match = re.search(r"(\d+(?:\.\d+)?)\s*%", obj)
            if pct_match:
                authoritative_pct = pct_match.group(1)
                # Replace [PERCENTAGE] placeholder if output by LLM
                cleaned = re.sub(r"\[PERCENTAGE\]", f"{authoritative_pct}%", cleaned, flags=re.IGNORECASE)
                # Replace any altered percentages in waiting times reduction/improvement milestones
                cleaned = re.sub(
                    r"\b(?!(?:" + re.escape(authoritative_pct) + r"))\d+(?:\.\d+)?%\s*(?:reduction|decrease|improvement|drop)\b",
                    f"{authoritative_pct}% reduction",
                    cleaned,
                    flags=re.IGNORECASE,
                )
        # Ensure objectives are present in content if omitted entirely
        if not any(o in cleaned for o in request.objectives):
            obj_lines = "\n".join(f"- {o}" for o in request.objectives)
            if "## 2. Objectives" in cleaned:
                cleaned = re.sub(r"(##\s*2\.\s*Objectives[^\n]*\n+)", r"\1" + obj_lines + r"\n\n", cleaned)
            else:
                cleaned = re.sub(r"(##\s*1\.\s*[^\n]*\n+[^\n#]+(?:\n+[^\n#]+)*\n*)", r"\1\n## 2. Objectives\n" + obj_lines + r"\n\n", cleaned)

    if request.kpis:
        for kpi in request.kpis:
            if kpi.target is not None:
                target_val = int(kpi.target) if kpi.target == int(kpi.target) else kpi.target
                unit_str = f" {kpi.unit}" if kpi.unit else ""
                # Replace altered targets like "target=50.0", "target: 50", "target of 50 minutes"
                cleaned = re.sub(
                    r"\btarget\s*[=:]\s*(?:(?!" + re.escape(str(target_val)) + r"\b)\d+(?:\.\d+)?)",
                    f"target={target_val}",
                    cleaned,
                    flags=re.IGNORECASE,
                )
                cleaned = re.sub(
                    r"\btarget\s+(?:of\s+)?(?:(?!" + re.escape(str(target_val)) + r"\b)\d+(?:\.\d+)?)(?:\s+minutes)?\b",
                    f"target of {target_val}{unit_str}",
                    cleaned,
                    flags=re.IGNORECASE,
                )
            if kpi.baseline is not None:
                baseline_val = int(kpi.baseline) if kpi.baseline == int(kpi.baseline) else kpi.baseline
                unit_str = f" {kpi.unit}" if kpi.unit else ""
                # Replace altered baselines like "baseline=100.0", "baseline: 100", "baseline of 100 minutes"
                cleaned = re.sub(
                    r"\bbaseline\s*[=:]\s*(?:(?!" + re.escape(str(baseline_val)) + r"\b)\d+(?:\.\d+)?)",
                    f"baseline={baseline_val}",
                    cleaned,
                    flags=re.IGNORECASE,
                )
            # If KPI is mentioned in text but baseline or target is omitted, format the full authoritative line
            if kpi.baseline is not None and kpi.target is not None:
                if str(baseline_val) not in cleaned or str(target_val) not in cleaned:
                    kpi_pat = r"-\s*" + re.escape(kpi.name) + r"[^\n]*"
                    if re.search(kpi_pat, cleaned):
                        cleaned = re.sub(
                            kpi_pat,
                            f"- {kpi.name} ({kpi.unit}): baseline={kpi.baseline}, target={kpi.target}",
                            cleaned,
                            count=1,
                        )

        # Ensure KPIs are present in content if omitted entirely
        if not any(k.name in cleaned for k in request.kpis):
            kpi_lines = "\n".join(
                f"- {k.name} ({k.unit}): baseline={k.baseline}, target={k.target}"
                if k.baseline is not None and k.target is not None
                else f"- {k.name}"
                for k in request.kpis
            )
            if "## 7. Key Performance Indicators" in cleaned or "## 7. KPI" in cleaned:
                cleaned = re.sub(r"(##\s*7\.\s*[^\n]*\n+)", r"\1" + kpi_lines + r"\n\n", cleaned)
            else:
                cleaned += f"\n\n## 7. Key Performance Indicators & Target Outcomes\n{kpi_lines}"

    # ───────────────────────────────────────────────────────────────────
    # 4. Anti-Finalization & Unauthorized Claims Sanitization
    # ───────────────────────────────────────────────────────────────────
    final_patterns = [
        r"\b(?:This\s+(?:Agreement|document|draft)\s+has\s+been\s+reviewed\s+by[^\n.]*\s+and\s+is\s+the\s+final\s+version[^\n.]*)",
        r"\b(?:is|as)\s+the\s+final\s+version[^\n.]*",
        r"\bThis\s+is\s+a\s+legally\s+binding\s+agreement[^\n.]*",
        r"\bThis\s+agreement\s+is\s+(?:approved|authorized|executed)\s+and\s+binding[^\n.]*",
        r"\bThis\s+agreement\s+is\s+the\s+final\s+version[^\n.]*",
        r"\bThis\s+(?:agreement|document|pilot)\s+has\s+been\s+reviewed\s+and\s+approved[^\n.]*",
        r"\bhas\s+been\s+reviewed\s+and\s+approved\s+by[^\n.]*",
        r"\breviewed\s+and\s+approved\s+by\s+(?:the\s+)?authorized\s+representatives[^\n.]*",
    ]
    for pat in final_patterns:
        cleaned = re.sub(
            pat,
            "This document has not been finalized and requires review by authorized government, legal, and procurement officials before use.",
            cleaned,
            flags=re.IGNORECASE,
        )

    # ───────────────────────────────────────────────────────────────────
    # 5. IP Ownership Sanitization
    # ───────────────────────────────────────────────────────────────────
    has_ip_context = bool(supplied_ip or (
        request.additional_context
        and any(
            term in request.additional_context.lower()
            for term in ["intellectual property", "ip ownership", "ip rights", "retains all ip"]
        )
    ))
    if not has_ip_context:
        ip_patterns = [
            r"\b[A-Za-z0-9\s/]+ retains (ownership|all intellectual property|all IP rights)[^\n.]*[.\n]?",
            r"\b[A-Za-z0-9\s/]+ is granted a (non-exclusive|exclusive) license[^\n.]*[.\n]?",
            r"Intellectual property rights will be governed by (?!\[)[^\n.]*[.\n]?",
        ]
        for pat in ip_patterns:
            cleaned = re.sub(
                pat,
                "[IP OWNERSHIP TERMS NOT SPECIFIED — SUBJECT TO AUTHORIZED LEGAL REVIEW]\n",
                cleaned,
                flags=re.IGNORECASE,
            )

    # ───────────────────────────────────────────────────────────────────
    # 6. Payment Split / Installment Sanitization
    # ───────────────────────────────────────────────────────────────────
    has_payment_schedule = bool(supplied_payment or (
        request.additional_context
        and any(
            term in request.additional_context.lower()
            for term in ["installment", "milestone 1 payment", "disbursement schedule", "payment schedule", "payment terms"]
        )
    ))
    if not has_payment_schedule:
        installment_patterns = [
            r"Payment will be made in\s+\w+\s+installments[^\n.]*[.\n]?",
            r"Payable in\s+\w+\s+installments[^\n.]*[.\n]?",
            r"Payment will be made in\s+\d+\s+installments[^\n.]*[.\n]?",
            r"Payable in\s+\d+\s+installments[^\n.]*[.\n]?",
            r"-\s*₹?\d+(?:\.\d+)?\s*(?:lakh|crore|thousand|INR|\$)?\s+upon[^\n.]*[.\n]?",
            r"-\s*(?:First|Second|Third|Initial|Final)\s+installment[^\n.]*[.\n]?",
            r"disbursed as follows:\s*\n*(?:-\s*[^\n]+\n*)+",
        ]
        for pat in installment_patterns:
            cleaned = re.sub(
                pat,
                "[PAYMENT SCHEDULE NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]\n",
                cleaned,
                flags=re.IGNORECASE,
            )

    # ───────────────────────────────────────────────────────────────────
    # 7. Termination & Extension Sanitization
    # ───────────────────────────────────────────────────────────────────
    has_termination_context = bool(supplied_termination or (
        request.additional_context
        and any(
            term in request.additional_context.lower()
            for term in ["terminate upon", "termination notice", "notice period", "termination conditions"]
        )
    ))
    if not has_termination_context:
        term_patterns = [
            r"\b(?:Either|Both|Any)\s+part(?:y|ies)\s+may\s+terminate[^\n.]*[.\n]?",
            r"\bTermination\s+upon\s+\d+\s+days['\s]+(?:written\s+)?notice[^\n.]*[.\n]?",
            r"\bThe termination conditions will be specified in a separate[^\n.]*[.\n]?",
        ]
        for pat in term_patterns:
            cleaned = re.sub(
                pat,
                "[TERMINATION CONDITIONS NOT SPECIFIED — SUBJECT TO AUTHORIZED REVIEW]\n",
                cleaned,
                flags=re.IGNORECASE,
            )

    has_extension_context = bool(supplied_extension or (
        request.additional_context
        and "extension" in request.additional_context.lower()
    ))
    if not has_extension_context:
        ext_patterns = [
            r"\bIf the pilot is extended, the extended duration[^\n.]*[.\n]?",
        ]
        for pat in ext_patterns:
            cleaned = re.sub(
                pat,
                "[EXTENSION CONDITIONS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]\n",
                cleaned,
                flags=re.IGNORECASE,
            )

    # ───────────────────────────────────────────────────────────────────
    # 8. Contractual Commitment & Cybersecurity Sanitization
    # ───────────────────────────────────────────────────────────────────
    has_cybersecurity_context = bool(supplied_cyber or (
        request.additional_context
        and any(
            term in request.additional_context.lower()
            for term in ["iso 27001", "cert-in", "soc 2", "cybersecurity standard", "security compliance"]
        )
    ))
    if not has_cybersecurity_context:
        cyber_patterns = [
            r"\b[A-Za-z0-9\s/]+ will ensure\b[^\n.]*(?:secure|security|compliant|standards|cyber)[^\n.]*[.\n]?",
            r"\bBoth parties will ensure\b[^\n.]*[.\n]?",
            r"\bThe cybersecurity responsibilities\b[^\n.]*[.\n]?",
        ]
        for pat in cyber_patterns:
            cleaned = re.sub(
                pat,
                "Applicable cybersecurity responsibilities and standards: [CYBERSECURITY STANDARDS — REQUIRES AUTHORIZED REVIEW]\n",
                cleaned,
                flags=re.IGNORECASE,
            )

    # ───────────────────────────────────────────────────────────────────
    # 9. Dispute Resolution & Warranties Sanitization
    # ───────────────────────────────────────────────────────────────────
    has_legal_context = bool(supplied_jurisdiction or (
        request.additional_context
        and any(
            term in request.additional_context.lower()
            for term in ["arbitration", "jurisdiction", "governing law", "court of"]
        )
    ))
    if not has_legal_context:
        legal_patterns = [
            r"\b(?:Disputes?|Arbitration|Jurisdiction)\s+(?:will|shall)\s+be\s+(?:settled|resolved|governed)[^\n.]*[.\n]?",
            r"\b[A-Za-z0-9\s/]+ (?:warrants|indemnifies|guarantees)[^\n.]*[.\n]?",
        ]
        for pat in legal_patterns:
            cleaned = re.sub(
                pat,
                "[DISPUTE RESOLUTION AND GOVERNING JURISDICTION NOT SPECIFIED — SUBJECT TO AUTHORIZED LEGAL REVIEW]\n",
                cleaned,
                flags=re.IGNORECASE,
            )

    # ───────────────────────────────────────────────────────────────────
    # 10. Mandatory Review Label
    # ───────────────────────────────────────────────────────────────────
    review_label = "AI-generated draft — requires authorized review."
    if review_label not in cleaned:
        cleaned = f"{review_label}\n\n{cleaned}"

    return cleaned


def _reconcile_document_missing_information(
    raw_missing: list[str], request: DocumentAssistanceRequest
) -> list[str]:
    """
    Deterministically reconcile missing information for document assistance:
    1. Filters out generic boilerplate or self-referential entries.
    2. Filters out false claims about supplied information.
    3. Transforms raw bracketed placeholders into clean human-readable evaluator strings.
    4. Surfaces genuine missing document inputs as 'Subject: Not provided — requires authorized review.'
    5. Deduplicates semantically equivalent entries.
    """
    raw_sanitized: list[str] = [_sanitize_claim(m) for m in raw_missing if m and m.strip()]
    sanitized: list[str] = []

    # Extract supplied items
    supplied_start_date = _extract_supplied_field(
        request.additional_context, ["start date", "commencement date", "pilot start date", "commencing on", "commences on", "start_date"]
    )
    supplied_end_date = _extract_supplied_field(
        request.additional_context, ["end date", "completion date", "pilot end date", "pilot completion date", "end_date"]
    )
    supplied_govt = _extract_supplied_field(
        request.additional_context, ["government entity", "government department", "department", "procuring agency", "client entity", "government_name", "government_entity"]
    ) or _extract_supplied_field(request.challenge_description, ["department of", "ministry of"])
    supplied_reviewer = _extract_supplied_field(
        request.additional_context, ["reviewer", "reviewed by", "authorizing officer", "nodal officer"]
    )
    supplied_payment = _extract_supplied_field(
        request.additional_context, ["payment schedule", "disbursement schedule", "payment milestone", "payment terms"]
    )
    supplied_ip = _extract_supplied_field(
        request.additional_context, ["ip ownership", "intellectual property", "ip terms", "ip rights"]
    )
    supplied_cyber = _extract_supplied_field(
        request.additional_context, ["cybersecurity standards", "cybersecurity", "security standards", "security compliance"]
    )
    supplied_signatories = _extract_supplied_field(
        request.additional_context, ["signatories", "authorized signatories", "authorized signers", "signatory"]
    )
    supplied_jurisdiction = _extract_supplied_field(
        request.additional_context, ["jurisdiction", "dispute resolution", "governing jurisdiction", "arbitration"]
    )
    supplied_termination = _extract_supplied_field(
        request.additional_context, ["termination conditions", "termination notice", "notice period"]
    )
    supplied_extension = _extract_supplied_field(
        request.additional_context, ["extension conditions", "extension terms", "extension timeline"]
    )

    # Generic placeholder junk patterns to reject
    generic_patterns = [
        r"^\[?\s*(?:requires|subject to)\s+authorized(?:\s+legal)?\s+review\s*\]?(?:\s*[—–-]\s*(?:requires|subject to)\s+authorized(?:\s+legal)?\s+review\.?)?$",
        r"^\[?\s*requires\s+authorized\s+review\s*\]?$",
        r"^\[?\s*subject\s+to\s+authorized\s+legal\s+review\s*\]?$",
        r"^\[?\s*subject\s+to\s+authorized\s+review\s*\]?$",
    ]

    raw_bracket_map = [
        (r"^\[?(?:(?:STARTUP_)?START\s*DATE|(?:STARTUP_)?START_DATE|(?:STARTUP_)?STARTDATE|COMMENCEMENT\s*DATE)(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\.?\]?$", "Pilot start date: Not provided — requires authorized review."),
        (r"^\[?(?:END\s*DATE|END_DATE|ENDDATE|COMPLETION\s*DATE|COMPLETIONDATE)(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\.?\]?$", "Pilot end/completion date: Not provided — requires authorized review."),
        (r"^\[?DEPLOYMENT\s*DATE(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\.?\]?$", "Deployment date: Not provided — requires authorized review."),
        (r"^\[?DATE(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\.?\]?$", "Execution date: Not provided — requires authorized review."),
        (r"^\[?GOVERNMENT\s*(?:ENTITY|NAME|DEPARTMENT)(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\.?\]?$", "Government entity and department: Not provided — requires authorized review."),
        (r"^\[?REVIEWER(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\.?\]?$", "Authorizing reviewer: Not provided — requires authorized review."),
        (r"^\[?TERMINATION\s*NOTICE(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\.?\]?$", "Termination notice period: Not provided — requires authorized review."),
        (r"^\[?TERMINATION\s*CONDITIONS(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*(?:REQUIRES|SUBJECT\s*TO)\s*AUTHORIZED\s*REVIEW)?\.?\]?$", "Termination notice and extension conditions: Not provided — requires authorized review."),
        (r"^\[?PAYMENT\s*SCHEDULE(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\.?\]?$", "Payment milestone disbursement schedule: Not provided — requires authorized review."),
        (r"^\[?IP\s*OWNERSHIP(?:\s*TERMS)?(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*SUBJECT\s*TO\s*AUTHORIZED\s*LEGAL\s*REVIEW)?\.?\]?$", "Intellectual property ownership and licensing terms: Not provided — requires authorized review."),
        (r"^\[?EXTENSION\s*CONDITIONS(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\.?\]?$", "Termination notice and extension conditions: Not provided — requires authorized review."),
        (r"^\[?CYBERSECURITY\s*STANDARDS(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\.?\]?$", "Cybersecurity standards and protocols: Not provided — requires authorized review."),
        (r"^\[?DATA\s*GOVERNANCE(?:\s*PROTOCOL)?(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*SUBJECT\s*TO\s*AUTHORIZED\s*REVIEW)?\.?\]?$", "Data governance protocol: Not provided — requires authorized review."),
        (r"^\[?AUTHORIZED\s*SIGNATORIES(?:\s*AND\s*OFFICIAL\s*ENTITY\s*ADDRESSES)?(?:\s*[—–-]?\s*NOT\s*PROVIDED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\.?\]?$", "Authorized signatories and official entity addresses: Not provided — requires authorized review."),
        (r"^\[?DISPUTE\s*RESOLUTION(?:\s*AND\s*GOVERNING\s*JURISDICTION)?(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*SUBJECT\s*TO\s*AUTHORIZED\s*LEGAL\s*REVIEW)?\.?\]?$", "Dispute resolution and governing jurisdiction: Not provided — requires authorized review."),
    ]

    for item in raw_sanitized:
        item_str = item.strip()
        # Skip generic boilerplate items
        if any(re.match(p, item_str, flags=re.IGNORECASE) for p in generic_patterns):
            continue

        item_lower = item_str.lower()
        # Skip if subject is just generic placeholder bracket
        if item_lower.startswith("[requires authorized review]") or item_lower.startswith("[subject to authorized"):
            continue

        # Filter out false missing claims if data was actually supplied
        if request.pilot_budget and ("budget" in item_lower or "cost" in item_lower) and "schedule" not in item_lower and "installment" not in item_lower and "disbursement" not in item_lower:
            continue
        if request.pilot_duration and ("duration" in item_lower or "timeline" in item_lower) and "milestone" not in item_lower and "start date" not in item_lower and "end date" not in item_lower:
            continue
        if request.pilot_sites and ("site" in item_lower or "location" in item_lower) and "address" not in item_lower:
            continue
        if request.startup_name and ("startup" in item_lower or "vendor" in item_lower) and "signat" not in item_lower and "contact" not in item_lower:
            continue
        if request.kpis and ("kpi" in item_lower or "metric" in item_lower):
            continue
        if request.objectives and "objective" in item_lower:
            continue
        if supplied_start_date and ("start date" in item_lower or "commencement" in item_lower):
            continue
        if supplied_end_date and ("end date" in item_lower or "completion date" in item_lower):
            continue
        if supplied_govt and ("government entity" in item_lower or "government department" in item_lower):
            continue
        if supplied_reviewer and ("reviewer" in item_lower or "reviewed by" in item_lower):
            continue
        if supplied_payment and ("payment" in item_lower or "disbursement" in item_lower):
            continue
        if supplied_ip and ("ip" in item_lower or "intellectual property" in item_lower):
            continue
        if supplied_cyber and ("cybersecurity" in item_lower or "security standard" in item_lower):
            continue
        if supplied_signatories and ("signator" in item_lower or "official entity address" in item_lower):
            continue
        if supplied_jurisdiction and ("jurisdiction" in item_lower or "dispute" in item_lower or "arbitration" in item_lower):
            continue
        if supplied_termination and ("termination" in item_lower or "notice period" in item_lower):
            continue

        # Transform raw bracketed items into clean descriptive missing info strings
        transformed = None
        item_str_nobrackets = re.sub(r"[\[\]]", "", item_str).strip()
        for pat, replacement in raw_bracket_map:
            if re.match(pat, item_str, flags=re.IGNORECASE) or re.match(pat, item_str_nobrackets, flags=re.IGNORECASE):
                transformed = replacement
                break

        if transformed:
            sanitized.append(transformed)
        elif "not provided" in item_str.lower() and "requires authorized review" in item_str.lower() and not any(p in item_str.upper() for p in ["STARTDATE", "ENDDATE", "MILESTONE"]):
            sanitized.append(item_str)
        else:
            # Clean generic bracket wrapping and strip redundant suffix if present
            item_clean = re.sub(r"[\[\]]", "", item_str).replace("_", " ").strip()
            item_clean = re.sub(r"\s*:\s*Not provided.*$", "", item_clean, flags=re.IGNORECASE).strip()
            item_clean = re.sub(r"\s*[—–-]?\s*(?:NOT PROVIDED|NOT SPECIFIED)?\s*[—–-]?\s*(?:REQUIRES|SUBJECT TO)\s*(?:AUTHORIZED\s*)?(?:LEGAL\s*)?REVIEW\.?$", "", item_clean, flags=re.IGNORECASE).strip()
            if not any(item_clean.endswith(s) for s in ["requires authorized review.", "requires review.", "authorized review."]):
                item_clean = f"{item_clean}: Not provided — requires authorized review."
            sanitized.append(item_clean)

    if request.document_type == DocumentType.PILOT_AGREEMENT_DRAFT:
        if not supplied_payment and not (request.additional_context and any(term in request.additional_context.lower() for term in ["payment schedule", "installment", "disbursement"])):
            if not any("payment" in s.lower() or "disbursement" in s.lower() for s in sanitized):
                sanitized.append("Payment milestone disbursement schedule: Not provided — requires authorized review.")

        if not supplied_ip and not (request.additional_context and any(term in request.additional_context.lower() for term in ["intellectual property", "ip ownership", "ip rights"])):
            if not any("ip" in s.lower() or "intellectual property" in s.lower() for s in sanitized):
                sanitized.append("Intellectual property ownership and licensing terms: Not provided — requires authorized review.")

        if not supplied_signatories and not any("signator" in s.lower() or "parties" in s.lower() or "address" in s.lower() or "contact" in s.lower() for s in sanitized):
            sanitized.append("Authorized signatories and official entity addresses: Not provided — requires authorized review.")

        if not supplied_jurisdiction and not any("jurisdiction" in s.lower() or "dispute" in s.lower() or "arbitration" in s.lower() for s in sanitized):
            sanitized.append("Dispute resolution and governing jurisdiction: Not provided — requires authorized review.")

        if not supplied_termination and not any("termination" in s.lower() or "extension" in s.lower() for s in sanitized):
            sanitized.append("Termination notice and extension conditions: Not provided — requires authorized review.")

        if not supplied_cyber and not (request.additional_context and any(term in request.additional_context.lower() for term in ["cybersecurity", "security standard", "cert-in", "iso 27001"])):
            if not any("cybersecurity" in s.lower() or "security" in s.lower() for s in sanitized):
                sanitized.append("Cybersecurity standards and protocols: Not provided — requires authorized review.")

        if not (request.additional_context and any(term in request.additional_context.lower() for term in ["data governance", "data protection", "privacy"])):
            if not any("data governance" in s.lower() or "data protection" in s.lower() for s in sanitized):
                sanitized.append("Data governance protocol: Not provided — requires authorized review.")

    elif request.document_type == DocumentType.CHALLENGE_STATEMENT:
        if not request.kpis:
            if not any("kpi" in s.lower() or "metric" in s.lower() for s in sanitized):
                sanitized.append("Key Performance Indicators and baseline metrics: Not provided — requires authorized review.")

        if not (request.pilot_duration or request.pilot_sites or request.pilot_budget):
            if not any("pilot" in s.lower() or "duration" in s.lower() or "site" in s.lower() for s in sanitized):
                sanitized.append("Pilot parameters (duration, sites, budget): Not provided — requires authorized review.")

    elif request.document_type == DocumentType.EVALUATION_CRITERIA:
        if not any("weight" in s.lower() or "scoring rubric" in s.lower() for s in sanitized):
            sanitized.append("Evaluation dimension weights and scoring rubric: Not provided — requires authorized review.")

        if not any("panel" in s.lower() or "evaluator" in s.lower() for s in sanitized):
            sanitized.append("Evaluation panel composition guidelines: Not provided — requires authorized review.")

    # Deduplicate semantically while preserving order
    seen_categories: set[str] = set()
    deduped: list[str] = []
    for item in sanitized:
        norm = re.sub(r"\s+", " ", item.strip().lower())
        # Canonical category extraction for semantic deduplication
        category = norm
        if "start date" in norm or "commencement" in norm:
            category = "cat_start_date"
        elif "completion date" in norm or "end date" in norm:
            category = "cat_completion_date"
        elif "deployment date" in norm:
            category = "cat_deployment_date"
        elif "execution date" in norm or "date:" in norm:
            category = "cat_execution_date"
        elif "government entity" in norm or "government department" in norm:
            category = "cat_govt_entity"
        elif "reviewer" in norm:
            category = "cat_reviewer"
        elif "payment" in norm or "disbursement" in norm:
            category = "cat_payment"
        elif "intellectual property" in norm or "ip ownership" in norm:
            category = "cat_ip"
        elif "signator" in norm or "official entity address" in norm:
            category = "cat_signatories"
        elif "jurisdiction" in norm or "dispute" in norm or "arbitration" in norm:
            category = "cat_jurisdiction"
        elif "termination" in norm or "extension" in norm:
            category = "cat_termination"
        elif "cybersecurity" in norm or "security" in norm:
            category = "cat_cybersecurity"
        elif "data governance" in norm or "privacy" in norm:
            category = "cat_data_governance"
        else:
            category = norm.rstrip(".").rstrip()

        if category not in seen_categories:
            seen_categories.add(category)
            deduped.append(item.strip())

    return deduped


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
            f"Validates solution performance over {user_pilot.duration} across {len(user_pilot.sites)} designated site(s) ({', '.join(user_pilot.sites)})."
        )
    elif user_pilot.duration:
        base_justification_parts.append(
            f"Validates solution performance over the specified {user_pilot.duration} pilot duration."
        )
    elif user_pilot.sites:
        base_justification_parts.append(
            f"Validates solution performance across the designated site(s): {', '.join(user_pilot.sites)}."
        )

    base_justification = " ".join(base_justification_parts) or "Validates solution performance under user-specified pilot parameters."

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


class AIService:
    """
    Orchestrator that wires deterministic calculations, prompts,
    and Ollama together for each brain.
    """

    def __init__(self, ollama_client: OllamaClient) -> None:
        self._ollama = ollama_client
        self._engine = DecisionEngine()

    # ══════════════════════════════════════════════════════════════════
    # Brain 1 — Challenge Copilot
    # ══════════════════════════════════════════════════════════════════

    async def analyze_challenge(
        self, request: ChallengeCopilotRequest
    ) -> ChallengeCopilotResponse:
        """
        Analyze → Suggest → Validate a government challenge.
        Readiness score is computed deterministically.
        User-provided data is authoritative and strictly preserved.
        """
        logger.info("Brain 1 — analyzing challenge: %s", request.problem.title)

        # 1. Deterministic readiness score
        readiness = self._engine.calculate_readiness(request)
        logger.info("Readiness score: %.1f", readiness.score)

        # 2. Build prompt and call LLM
        system_prompt, user_prompt = build_challenge_prompt(request)
        raw = await self._ollama.generate_json(prompt=user_prompt, system=system_prompt)

        # 3. Parse and reconcile LLM output with authoritative user input
        response = parse_challenge_response(raw, request=request)

        # 4. Attach deterministic readiness
        response.readiness = readiness

        return response

    @staticmethod
    def _parse_challenge_response(
        raw: dict[str, Any], request: Optional[ChallengeCopilotRequest] = None
    ) -> ChallengeCopilotResponse:
        """Delegates to services.parsers.challenge_parser.parse_challenge_response."""
        return parse_challenge_response(raw, request=request)

    # ── Legacy parse helpers kept below for reference — logic now lives in ──
    # ── services/parsers/  and  services/sanitizers.py                     ──
    @staticmethod
    def _parse_challenge_response_legacy(
        raw: dict[str, Any], request: Optional[ChallengeCopilotRequest] = None
    ) -> ChallengeCopilotResponse:
        """Original inline implementation — preserved for reference only. Do not call."""
        try:
            # ── Root Causes (Hypotheses) ──────────────────────────────
            raw_hypotheses = _extract_str_list(raw.get("root_cause_hypotheses"))
            hypotheses = [_ensure_hypothesis(h) for h in raw_hypotheses]

            # ── Desired Outcome & Success Definition ──────────────────
            if request and request.outcome and request.outcome.desired_outcome and request.outcome.desired_outcome.strip():
                desired_outcome = request.outcome.desired_outcome
            else:
                desired_outcome = raw.get("desired_outcome")

            if request and request.outcome and request.outcome.success_definition and request.outcome.success_definition.strip():
                success_definition = request.outcome.success_definition
            else:
                success_definition = raw.get("success_definition")

            # ── KPIs Reconciliation ───────────────────────────────────
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
                # Do NOT warn if weights sum to < 100% when additional KPIs/weights are undefined
                if has_user_weights and user_weights:
                    total_w = sum(user_weights)
                    if total_w > 100.0:
                        warnings.append(
                            f"User-provided KPI weights sum to {total_w:.0f}%, which exceeds 100%. Please review weight allocation."
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

            # ── Pilot Recommendation ──────────────────────────────────
            pilot_rec: Optional[PilotRecommendation] = None
            raw_pilot = raw.get("pilot_recommendation")
            if not isinstance(raw_pilot, dict):
                raw_pilot = {}

            if request and request.pilot:
                s_duration = request.pilot.duration or raw_pilot.get("suggested_duration")
                s_sites = list(request.pilot.sites) if request.pilot.sites is not None else _extract_str_list(raw_pilot.get("suggested_sites"))
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

            # ── Requirements & Domain ─────────────────────────────────
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

            # ── Missing Information ───────────────────────────────────
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
                        missing_info.append("Quantitative baseline data not provided or not consistently measured.")

            # ── Assumptions ───────────────────────────────────────────
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

    # ══════════════════════════════════════════════════════════════════
    # Brain 2 — Startup Match Explanation
    # ══════════════════════════════════════════════════════════════════

    async def explain_match(
        self, request: MatchExplanationRequest
    ) -> MatchExplanationResponse:
        """
        Deterministic score + LLM explanation.
        The LLM receives the score but cannot modify it.
        Claims are sanitized to prevent unverified assertions.
        """
        logger.info(
            "Brain 2 — matching '%s' to '%s'",
            request.startup.name,
            request.challenge.title,
        )

        # 1. Deterministic scoring
        score: MatchScoreBreakdown = self._engine.calculate_match_score(request)
        logger.info("Match score: %.1f/100", score.total)

        # 2. LLM explanation
        system_prompt, user_prompt = build_match_prompt(request, score)
        raw = await self._ollama.generate_json(prompt=user_prompt, system=system_prompt)

        # 3. Build response — score is strictly from Python, explanation from LLM
        return parse_match_response(raw, score=score)

    # ══════════════════════════════════════════════════════════════════
    # Brain 3 — Proposal Analysis
    # ══════════════════════════════════════════════════════════════════

    async def analyze_proposal(
        self, request: ProposalAnalysisRequest
    ) -> ProposalAnalysisResponse:
        """
        Assist evaluators in understanding a startup proposal.
        Authoritative proposal parameters (cost, timeline) are preserved.
        Claims are sanitized and missing information is surfaced deterministically.
        """
        logger.info(
            "Brain 3 — analyzing proposal from '%s'", request.startup.name
        )

        system_prompt, user_prompt = build_proposal_prompt(request)
        raw = await self._ollama.generate_json(prompt=user_prompt, system=system_prompt)

        return parse_proposal_response(raw, request=request)

    # ══════════════════════════════════════════════════════════════════
    # Brain 4 — Pilot Intelligence
    # ══════════════════════════════════════════════════════════════════

    async def interpret_pilot(
        self, request: PilotIntelligenceRequest
    ) -> PilotIntelligenceResponse:
        """
        Deterministic KPI calculations + LLM interpretation.
        Python computes all metrics; LLM interprets patterns and gaps.
        """
        logger.info(
            "Brain 4 — interpreting pilot for '%s' / '%s'",
            request.challenge_title,
            request.startup_name,
        )

        # 1. Deterministic calculations (Python is the sole authority)
        kpi_analyses: list[KPIAnalysis] = self._engine.calculate_all_kpis(
            request.kpi_results
        )
        milestone_rate = self._engine.calculate_milestone_completion(
            request.milestones
        )
        risk_counts = self._engine.calculate_risk_counts(request.risks)
        risk_summary = (
            f"HIGH: {risk_counts.get('HIGH', 0)}, "
            f"MEDIUM: {risk_counts.get('MEDIUM', 0)}, "
            f"LOW: {risk_counts.get('LOW', 0)}"
        )

        # 2. LLM qualitative interpretation
        system_prompt, user_prompt = build_pilot_prompt(
            request, kpi_analyses, milestone_rate, risk_counts
        )
        raw = await self._ollama.generate_json(prompt=user_prompt, system=system_prompt)

        # 3. Build response — calculations from Python, interpretation from LLM
        return parse_pilot_response(
            raw,
            request=request,
            kpi_analyses=kpi_analyses,
            milestone_rate=milestone_rate,
            risk_counts=risk_counts,
            risk_summary=risk_summary,
        )

    # ══════════════════════════════════════════════════════════════════
    # Brain 5 — Document Assistance
    # ══════════════════════════════════════════════════════════════════

    async def assist_document(
        self, request: DocumentAssistanceRequest
    ) -> DocumentAssistanceResponse:
        """Generate a document draft with mandatory review label and deterministic safeguards."""
        logger.info("Brain 5 — generating %s", request.document_type.value)

        system_prompt, user_prompt = build_document_prompt(request)
        raw = await self._ollama.generate_json(prompt=user_prompt, system=system_prompt)

        return parse_document_response(raw, request=request)
