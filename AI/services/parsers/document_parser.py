"""
SetuGov AI Service — Brain 5: Document Assistance Parser

Parses LLM document draft JSON and applies comprehensive sanitization:
- Template variable injection (startup name, dates, sites, budget, KPIs)
- Anti-finalization: strips claims that the draft is approved or binding
- IP, payment, termination, cybersecurity, jurisdiction safeguards
- Missing information reconciliation per document type
- Mandatory review label enforcement
"""

from __future__ import annotations

import re
from typing import Any, Optional

from pydantic import ValidationError

from schemas.requests import DocumentAssistanceRequest, DocumentType
from schemas.responses import DocumentAssistanceResponse
from services.ollama_client import InvalidAIResponseError
from services.sanitizers import _extract_str_list, _sanitize_claim


# ═══════════════════════════════════════════════════════════════════════════
# Supplied-field extraction helper
# ═══════════════════════════════════════════════════════════════════════════


def _extract_supplied_field(
    context: Optional[str], keywords: list[str]
) -> Optional[str]:
    """
    Extract a supplied key-value pair from additional_context or description.
    Returns the cleaned value string, or None if not supplied or if the value
    is itself a placeholder.
    """
    if not context:
        return None
    for kw in keywords:
        pattern = r"(?:^|[.\n;])\s*" + re.escape(kw) + r"\s*[:=-]\s*([^\n;\.]+)"
        m = re.search(pattern, context, flags=re.IGNORECASE)
        if m:
            val = m.group(1).strip().strip("'\"")
            if val and not any(
                val.lower().startswith(p)
                for p in [
                    "[requires", "[subject", "not specified", "not provided",
                    "tbd", "to be determined",
                ]
            ):
                return val
    return None


# ═══════════════════════════════════════════════════════════════════════════
# Default document content builder
# ═══════════════════════════════════════════════════════════════════════════


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
    kpis_text = (
        "\n".join(kpi_lines)
        if kpi_lines
        else "- [KEY PERFORMANCE INDICATORS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]"
    )

    obj_lines = (
        [f"- {o}" for o in request.objectives]
        if request.objectives
        else ["- [OBJECTIVES NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]"]
    )
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


# ═══════════════════════════════════════════════════════════════════════════
# Document content sanitizer
# ═══════════════════════════════════════════════════════════════════════════


def _sanitize_document_content(
    content: str, request: DocumentAssistanceRequest
) -> str:
    """
    Sanitize generated document draft content:
    1. Replaces template variables with supplied values or explicit placeholders.
    2. Preserves intentional missing-data placeholders when fields are not supplied.
    3. Reconciles user targets, baselines, and objective percentages against LLM alteration.
    4. Prevents unauthorized claims that the document is final, approved, or binding.
    5. Replaces invented IP, payment, termination, cybersecurity terms with placeholders.
    6. Ensures structured section content is present.
    7. Ensures mandatory review label is present at the top.
    """
    cleaned = content.strip() if content else ""

    # If the LLM returned essentially empty content
    if len(cleaned) < 60 or not any(
        h in cleaned for h in ["##", "1.", "Pilot Scope", "Objectives", "Scope:"]
    ):
        cleaned = _build_default_document_content(request)

    cleaned = _sanitize_claim(cleaned)

    # Extract any fields supplied via additional_context
    supplied_start_date = _extract_supplied_field(
        request.additional_context,
        ["start date", "commencement date", "pilot start date", "commencing on", "commences on", "start_date"],
    )
    supplied_end_date = _extract_supplied_field(
        request.additional_context,
        ["end date", "completion date", "pilot end date", "pilot completion date", "end_date"],
    )
    supplied_govt = _extract_supplied_field(
        request.additional_context,
        ["government entity", "government department", "department", "procuring agency",
         "client entity", "government_name", "government_entity"],
    ) or _extract_supplied_field(
        request.challenge_description, ["department of", "ministry of"]
    )
    supplied_reviewer = _extract_supplied_field(
        request.additional_context,
        ["reviewer", "reviewed by", "authorizing officer", "nodal officer"],
    )
    supplied_payment = _extract_supplied_field(
        request.additional_context,
        ["payment schedule", "disbursement schedule", "payment milestone", "payment terms"],
    )
    supplied_ip = _extract_supplied_field(
        request.additional_context,
        ["ip ownership", "intellectual property", "ip terms", "ip rights"],
    )
    supplied_cyber = _extract_supplied_field(
        request.additional_context,
        ["cybersecurity standards", "cybersecurity", "security standards", "security compliance"],
    )
    supplied_signatories = _extract_supplied_field(
        request.additional_context,
        ["signatories", "authorized signatories", "authorized signers", "signatory"],
    )
    supplied_jurisdiction = _extract_supplied_field(
        request.additional_context,
        ["jurisdiction", "dispute resolution", "governing jurisdiction", "arbitration"],
    )
    supplied_termination = _extract_supplied_field(
        request.additional_context,
        ["termination conditions", "termination notice", "notice period"],
    )
    supplied_extension = _extract_supplied_field(
        request.additional_context,
        ["extension conditions", "extension terms", "extension timeline"],
    )

    # ── 1. Standardize Placeholders & Prevent Template Leaks ──────────
    cleaned = re.sub(r"\[SUBJECT_TO_AUTHORIZED_LEGAL_REVIEW\]", "[SUBJECT TO AUTHORIZED LEGAL REVIEW]", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[SUBJECT_TO_AUTHORIZED_LEGAL REVIEW\]", "[SUBJECT TO AUTHORIZED LEGAL REVIEW]", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[CYBERSECURITY_STANDARDS\s*—\s*REQUIRES\s*AUTHORIZED\s*REVIEW\]", "[CYBERSECURITY STANDARDS — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[MILESTONE_DELIVERABLES_NOT_SPECIFIED\s*—\s*REQUIRES\s*AUTHORIZED\s*REVIEW\]", "[MILESTONE DELIVERABLES NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[EXTENSION_CONDITIONS_NOT_SPECIFIED\s*—\s*REQUIRES\s*AUTHORIZED\s*REVIEW\]", "[EXTENSION CONDITIONS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)

    date_startup_patterns = [
        r"\bcommence\s+on\s+\[STARTUP(?:_|\s+)NAME\]",
        r"\bcommencing\s+on\s+\[STARTUP(?:_|\s+)NAME\]",
        r"\bstarting\s+on\s+\[STARTUP(?:_|\s+)NAME\]",
        r"\bterminate\s+on\s+\[STARTUP(?:_|\s+)NAME\]",
        r"\[STARTUP(?:_|\s+)NAME\]\s*day\b",
        r"\[STARTUP(?:_|\s+)NAME\]\s*[('']Commencement Date['')]",
    ]
    start_date_rep = supplied_start_date or "[START DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]"
    for pat in date_startup_patterns:
        cleaned = re.sub(pat, f"commence on {start_date_rep}", cleaned, flags=re.IGNORECASE)

    if supplied_start_date:
        cleaned = re.sub(r"\[(?:(?:STARTUP_)?START\s*DATE|(?:STARTUP_)?START_DATE|(?:STARTUP_)?STARTDATE|(?:STARTUP)?_?COMMENCEMENT_DATE|COMMENCEMENT\s*DATE)(?:\s*[—–-][^\]]*)?\\]", supplied_start_date, cleaned, flags=re.IGNORECASE)
    else:
        cleaned = re.sub(r"\[(?:(?:STARTUP_)?START\s*DATE|(?:STARTUP_)?START_DATE|(?:STARTUP_)?STARTDATE|(?:STARTUP)?_?COMMENCEMENT_DATE|COMMENCEMENT\s*DATE)(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\]", "[START DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)

    if supplied_end_date:
        cleaned = re.sub(r"\[(?:END\s*DATE|END_DATE|ENDDATE|COMPLETION\s*DATE|COMPLETION_DATE|COMPLETIONDATE)(?:\s*[—–-][^\]]*)?\\]", supplied_end_date, cleaned, flags=re.IGNORECASE)
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

    # Normalize accidental duplicated punctuation
    cleaned = re.sub(r"(?<!\.)\.\. (?!\.)", ".", cleaned)
    cleaned = re.sub(r"!{2,}", "!", cleaned)
    cleaned = re.sub(r"\?{2,}", "?", cleaned)

    # ── 2. Authoritative Fact Injection ───────────────────────────────
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
                cleaned = re.sub(
                    r"(##\s*1\.\s*Pilot\s*Scope[^\n]*\n+)",
                    r"\1Pilot deployment for " + request.startup_name + r".\n\n",
                    cleaned,
                )
    else:
        cleaned = re.sub(r"\[STARTUP(?:_|\s+)NAME\]", "[STARTUP NAME NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\[STARTUP\]", "[STARTUP NAME NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]", cleaned, flags=re.IGNORECASE)

    if request.pilot_duration:
        cleaned = re.sub(r"\[PILOT(?:_|\s+)DURATION\](?:\s*days)?", request.pilot_duration, cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\[DURATION\](?:\s*days)?", request.pilot_duration, cleaned, flags=re.IGNORECASE)
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
                cleaned = re.sub(
                    r"(##\s*8\.\s*[^\n]*\n+)",
                    r"\1Total Pilot Budget: " + request.pilot_budget + r"\n\n",
                    cleaned,
                )

    if request.pilot_sites:
        sites_str = ", ".join(request.pilot_sites)
        cleaned = re.sub(r"\[PILOT(?:_|\s+)SITES\]", sites_str, cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\[SITES\]", sites_str, cleaned, flags=re.IGNORECASE)
        if not any(site in cleaned for site in request.pilot_sites):
            sites_lines = "\n".join(f"- {s}" for s in request.pilot_sites)
            if "## 4. Pilot Sites" in cleaned:
                cleaned = re.sub(r"(##\s*4\.\s*Pilot\s*Sites[^\n]*\n+)", r"\1" + sites_lines + r"\n\n", cleaned)
            else:
                cleaned += f"\n\n## 4. Pilot Sites\n{sites_lines}"

    if request.challenge_title:
        cleaned = re.sub(r"\[CHALLENGE(?:_|\s+)TITLE\]", request.challenge_title, cleaned, flags=re.IGNORECASE)

    # Clean programming variable leaks
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

    # ── 3. Target & Objective Percentage Reconciliation ───────────────
    if request.objectives:
        for obj in request.objectives:
            pct_match = re.search(r"(\d+(?:\.\d+)?)\s*%", obj)
            if pct_match:
                authoritative_pct = pct_match.group(1)
                cleaned = re.sub(r"\[PERCENTAGE\]", f"{authoritative_pct}%", cleaned, flags=re.IGNORECASE)
                cleaned = re.sub(
                    r"\b(?!(?:" + re.escape(authoritative_pct) + r"))\d+(?:\.\d+)?%\s*(?:reduction|decrease|improvement|drop)\b",
                    f"{authoritative_pct}% reduction",
                    cleaned,
                    flags=re.IGNORECASE,
                )
        if not any(o in cleaned for o in request.objectives):
            obj_lines = "\n".join(f"- {o}" for o in request.objectives)
            if "## 2. Objectives" in cleaned:
                cleaned = re.sub(r"(##\s*2\.\s*Objectives[^\n]*\n+)", r"\1" + obj_lines + r"\n\n", cleaned)
            else:
                cleaned = re.sub(
                    r"(##\s*1\.\s*[^\n]*\n+[^\n#]+(?:\n+[^\n#]+)*\n*)",
                    r"\1\n## 2. Objectives\n" + obj_lines + r"\n\n",
                    cleaned,
                )

    if request.kpis:
        for kpi in request.kpis:
            if kpi.target is not None:
                target_val = int(kpi.target) if kpi.target == int(kpi.target) else kpi.target
                unit_str = f" {kpi.unit}" if kpi.unit else ""
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
                cleaned = re.sub(
                    r"\bbaseline\s*[=:]\s*(?:(?!" + re.escape(str(baseline_val)) + r"\b)\d+(?:\.\d+)?)",
                    f"baseline={baseline_val}",
                    cleaned,
                    flags=re.IGNORECASE,
                )
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

    # ── 4. Anti-Finalization ──────────────────────────────────────────
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

    # ── 5. IP Ownership Sanitization ─────────────────────────────────
    has_ip_context = bool(
        supplied_ip
        or (
            request.additional_context
            and any(
                term in request.additional_context.lower()
                for term in ["intellectual property", "ip ownership", "ip rights", "retains all ip"]
            )
        )
    )
    if not has_ip_context:
        ip_patterns = [
            r"\b[A-Za-z0-9\s/]+ retains (ownership|all intellectual property|all IP rights)[^\n.]*[.\n]?",
            r"\b[A-Za-z0-9\s/]+ is granted a (non-exclusive|exclusive) license[^\n.]*[.\n]?",
            r"Intellectual property rights will be governed by (?!\[)[^\n.]*[.\n]?",
        ]
        for pat in ip_patterns:
            cleaned = re.sub(pat, "[IP OWNERSHIP TERMS NOT SPECIFIED — SUBJECT TO AUTHORIZED LEGAL REVIEW]\n", cleaned, flags=re.IGNORECASE)

    # ── 6. Payment Split Sanitization ────────────────────────────────
    has_payment_schedule = bool(
        supplied_payment
        or (
            request.additional_context
            and any(
                term in request.additional_context.lower()
                for term in ["installment", "milestone 1 payment", "disbursement schedule", "payment schedule", "payment terms"]
            )
        )
    )
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
            cleaned = re.sub(pat, "[PAYMENT SCHEDULE NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]\n", cleaned, flags=re.IGNORECASE)

    # ── 7. Termination & Extension Sanitization ───────────────────────
    has_termination_context = bool(
        supplied_termination
        or (
            request.additional_context
            and any(
                term in request.additional_context.lower()
                for term in ["terminate upon", "termination notice", "notice period", "termination conditions"]
            )
        )
    )
    if not has_termination_context:
        term_patterns = [
            r"\b(?:Either|Both|Any)\s+part(?:y|ies)\s+may\s+terminate[^\n.]*[.\n]?",
            r"\bTermination\s+upon\s+\d+\s+days['\s]+(?:written\s+)?notice[^\n.]*[.\n]?",
            r"\bThe termination conditions will be specified in a separate[^\n.]*[.\n]?",
        ]
        for pat in term_patterns:
            cleaned = re.sub(pat, "[TERMINATION CONDITIONS NOT SPECIFIED — SUBJECT TO AUTHORIZED REVIEW]\n", cleaned, flags=re.IGNORECASE)

    has_extension_context = bool(
        supplied_extension
        or (request.additional_context and "extension" in request.additional_context.lower())
    )
    if not has_extension_context:
        cleaned = re.sub(
            r"\bIf the pilot is extended, the extended duration[^\n.]*[.\n]?",
            "[EXTENSION CONDITIONS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]\n",
            cleaned,
            flags=re.IGNORECASE,
        )

    # ── 8. Cybersecurity & Dispute Resolution Sanitization ───────────
    has_cybersecurity_context = bool(
        supplied_cyber
        or (
            request.additional_context
            and any(
                term in request.additional_context.lower()
                for term in ["iso 27001", "cert-in", "soc 2", "cybersecurity standard", "security compliance"]
            )
        )
    )
    if not has_cybersecurity_context:
        cyber_patterns = [
            r"\b[A-Za-z0-9\s/]+ will ensure\b[^\n.]*(?:secure|security|compliant|standards|cyber)[^\n.]*[.\n]?",
            r"\bBoth parties will ensure\b[^\n.]*[.\n]?",
            r"\bThe cybersecurity responsibilities\b[^\n.]*[.\n]?",
        ]
        for pat in cyber_patterns:
            cleaned = re.sub(pat, "Applicable cybersecurity responsibilities and standards: [CYBERSECURITY STANDARDS — REQUIRES AUTHORIZED REVIEW]\n", cleaned, flags=re.IGNORECASE)

    has_legal_context = bool(
        supplied_jurisdiction
        or (
            request.additional_context
            and any(
                term in request.additional_context.lower()
                for term in ["arbitration", "jurisdiction", "governing law", "court of"]
            )
        )
    )
    if not has_legal_context:
        legal_patterns = [
            r"\b(?:Disputes?|Arbitration|Jurisdiction)\s+(?:will|shall)\s+be\s+(?:settled|resolved|governed)[^\n.]*[.\n]?",
            r"\b[A-Za-z0-9\s/]+ (?:warrants|indemnifies|guarantees)[^\n.]*[.\n]?",
        ]
        for pat in legal_patterns:
            cleaned = re.sub(pat, "[DISPUTE RESOLUTION AND GOVERNING JURISDICTION NOT SPECIFIED — SUBJECT TO AUTHORIZED LEGAL REVIEW]\n", cleaned, flags=re.IGNORECASE)

    # ── 9. Mandatory Review Label ─────────────────────────────────────
    review_label = "AI-generated draft — requires authorized review."
    if review_label not in cleaned:
        cleaned = f"{review_label}\n\n{cleaned}"

    return cleaned


# ═══════════════════════════════════════════════════════════════════════════
# Missing information reconciler
# ═══════════════════════════════════════════════════════════════════════════


def _reconcile_document_missing_information(
    raw_missing: list[str], request: DocumentAssistanceRequest
) -> list[str]:
    """
    Deterministically reconcile missing information for document assistance:
    1. Filters out generic boilerplate or self-referential entries.
    2. Filters out false claims about supplied information.
    3. Transforms raw bracketed placeholders into clean human-readable strings.
    4. Surfaces genuine missing document inputs.
    5. Deduplicates semantically equivalent entries.
    """
    raw_sanitized: list[str] = [_sanitize_claim(m) for m in raw_missing if m and m.strip()]
    sanitized: list[str] = []

    # Re-extract supplied fields for filtering
    supplied_start_date = _extract_supplied_field(
        request.additional_context,
        ["start date", "commencement date", "pilot start date", "commencing on", "commences on", "start_date"],
    )
    supplied_end_date = _extract_supplied_field(
        request.additional_context,
        ["end date", "completion date", "pilot end date", "pilot completion date", "end_date"],
    )
    supplied_govt = _extract_supplied_field(
        request.additional_context,
        ["government entity", "government department", "department", "procuring agency",
         "client entity", "government_name", "government_entity"],
    ) or _extract_supplied_field(request.challenge_description, ["department of", "ministry of"])
    supplied_reviewer = _extract_supplied_field(
        request.additional_context, ["reviewer", "reviewed by", "authorizing officer", "nodal officer"]
    )
    supplied_payment = _extract_supplied_field(
        request.additional_context,
        ["payment schedule", "disbursement schedule", "payment milestone", "payment terms"],
    )
    supplied_ip = _extract_supplied_field(
        request.additional_context, ["ip ownership", "intellectual property", "ip terms", "ip rights"]
    )
    supplied_cyber = _extract_supplied_field(
        request.additional_context,
        ["cybersecurity standards", "cybersecurity", "security standards", "security compliance"],
    )
    supplied_signatories = _extract_supplied_field(
        request.additional_context,
        ["signatories", "authorized signatories", "authorized signers", "signatory"],
    )
    supplied_jurisdiction = _extract_supplied_field(
        request.additional_context,
        ["jurisdiction", "dispute resolution", "governing jurisdiction", "arbitration"],
    )
    supplied_termination = _extract_supplied_field(
        request.additional_context,
        ["termination conditions", "termination notice", "notice period"],
    )

    generic_patterns = [
        r"^\[?\s*(?:requires|subject to)\s+authorized(?:\s+legal)?\s+review\s*\]?(?:\s*[—–-]\s*(?:requires|subject to)\s+authorized(?:\s+legal)?\s+review\.?)?$",
        r"^\[?\s*requires\s+authorized\s+review\s*\]?$",
        r"^\[?\s*subject\s+to\s+authorized\s+legal\s+review\s*\]?$",
        r"^\[?\s*subject\s+to\s+authorized\s+review\s*\]?$",
    ]

    raw_bracket_map = [
        (r"^\[?(?:(?:STARTUP_)?START\s*DATE|(?:STARTUP_)?START_DATE|COMMENCEMENT\s*DATE)(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\\.?\\]?$", "Pilot start date: Not provided — requires authorized review."),
        (r"^\[?(?:END\s*DATE|END_DATE|COMPLETION\s*DATE)(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\\.?\\]?$", "Pilot end/completion date: Not provided — requires authorized review."),
        (r"^\[?DEPLOYMENT\s*DATE(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\\.?\\]?$", "Deployment date: Not provided — requires authorized review."),
        (r"^\[?DATE(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\\.?\\]?$", "Execution date: Not provided — requires authorized review."),
        (r"^\[?GOVERNMENT\s*(?:ENTITY|NAME|DEPARTMENT)(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\\.?\\]?$", "Government entity and department: Not provided — requires authorized review."),
        (r"^\[?REVIEWER(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\\.?\\]?$", "Authorizing reviewer: Not provided — requires authorized review."),
        (r"^\[?TERMINATION\s*NOTICE(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\\.?\\]?$", "Termination notice period: Not provided — requires authorized review."),
        (r"^\[?TERMINATION\s*CONDITIONS(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*(?:REQUIRES|SUBJECT\s*TO)\s*AUTHORIZED\s*REVIEW)?\\.?\\]?$", "Termination notice and extension conditions: Not provided — requires authorized review."),
        (r"^\[?PAYMENT\s*SCHEDULE(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\\.?\\]?$", "Payment milestone disbursement schedule: Not provided — requires authorized review."),
        (r"^\[?IP\s*OWNERSHIP(?:\s*TERMS)?(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*SUBJECT\s*TO\s*AUTHORIZED\s*LEGAL\s*REVIEW)?\\.?\\]?$", "Intellectual property ownership and licensing terms: Not provided — requires authorized review."),
        (r"^\[?EXTENSION\s*CONDITIONS(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\\.?\\]?$", "Termination notice and extension conditions: Not provided — requires authorized review."),
        (r"^\[?CYBERSECURITY\s*STANDARDS(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\\.?\\]?$", "Cybersecurity standards and protocols: Not provided — requires authorized review."),
        (r"^\[?DATA\s*GOVERNANCE(?:\s*PROTOCOL)?(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*SUBJECT\s*TO\s*AUTHORIZED\s*REVIEW)?\\.?\\]?$", "Data governance protocol: Not provided — requires authorized review."),
        (r"^\[?AUTHORIZED\s*SIGNATORIES(?:\s*AND\s*OFFICIAL\s*ENTITY\s*ADDRESSES)?(?:\s*[—–-]?\s*NOT\s*PROVIDED)?(?:\s*[—–-]?\s*REQUIRES\s*AUTHORIZED\s*REVIEW)?\\.?\\]?$", "Authorized signatories and official entity addresses: Not provided — requires authorized review."),
        (r"^\[?DISPUTE\s*RESOLUTION(?:\s*AND\s*GOVERNING\s*JURISDICTION)?(?:\s*[—–-]?\s*NOT\s*SPECIFIED)?(?:\s*[—–-]?\s*SUBJECT\s*TO\s*AUTHORIZED\s*LEGAL\s*REVIEW)?\\.?\\]?$", "Dispute resolution and governing jurisdiction: Not provided — requires authorized review."),
    ]

    for item in raw_sanitized:
        item_str = item.strip()
        if any(re.match(p, item_str, flags=re.IGNORECASE) for p in generic_patterns):
            continue

        item_lower = item_str.lower()
        if item_lower.startswith("[requires authorized review]") or item_lower.startswith("[subject to authorized"):
            continue

        # Filter out false missing claims if data was supplied
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

        # Transform raw bracketed items to clean descriptive strings
        transformed = None
        item_str_nobrackets = re.sub(r"[\[\]]", "", item_str).strip()
        for pat, replacement in raw_bracket_map:
            if re.match(pat, item_str, flags=re.IGNORECASE) or re.match(pat, item_str_nobrackets, flags=re.IGNORECASE):
                transformed = replacement
                break

        if transformed:
            sanitized.append(transformed)
        elif "not provided" in item_str.lower() and "requires authorized review" in item_str.lower() and not any(
            p in item_str.upper() for p in ["STARTDATE", "ENDDATE", "MILESTONE"]
        ):
            sanitized.append(item_str)
        else:
            item_clean = re.sub(r"[\[\]]", "", item_str).replace("_", " ").strip()
            item_clean = re.sub(r"\s*:\s*Not provided.*$", "", item_clean, flags=re.IGNORECASE).strip()
            item_clean = re.sub(
                r"\s*[—–-]?\s*(?:NOT PROVIDED|NOT SPECIFIED)?\s*[—–-]?\s*(?:REQUIRES|SUBJECT TO)\s*(?:AUTHORIZED\s*)?(?:LEGAL\s*)?REVIEW\.?$",
                "",
                item_clean,
                flags=re.IGNORECASE,
            ).strip()
            if not any(item_clean.endswith(s) for s in ["requires authorized review.", "requires review.", "authorized review."]):
                item_clean = f"{item_clean}: Not provided — requires authorized review."
            sanitized.append(item_clean)

    # Deterministic additions by document type
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

    # Semantic deduplication
    seen_categories: set[str] = set()
    deduped: list[str] = []
    for item in sanitized:
        norm = re.sub(r"\s+", " ", item.strip().lower())
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


# ═══════════════════════════════════════════════════════════════════════════
# Public parser
# ═══════════════════════════════════════════════════════════════════════════


def parse_document_response(
    raw: dict[str, Any],
    request: DocumentAssistanceRequest,
) -> DocumentAssistanceResponse:
    """
    Parse LLM document draft and apply full sanitization pipeline.
    The mandatory review label is always injected at the top.
    """
    review_label = "AI-generated draft — requires authorized review."
    raw_content = str(raw.get("content", "") or "")
    content = _sanitize_document_content(raw_content, request)

    raw_title = str(raw.get("title") or f"{request.document_type.value} Draft")
    title = _sanitize_claim(raw_title).strip()

    raw_sections = _extract_str_list(raw.get("sections"))
    sections = [_sanitize_claim(s) for s in raw_sections if s and s.strip()]

    raw_missing = _extract_str_list(raw.get("missing_information"))
    missing_info = _reconcile_document_missing_information(raw_missing, request)

    try:
        return DocumentAssistanceResponse(
            document_type=request.document_type.value,
            title=title,
            content=content,
            sections=sections,
            missing_information=missing_info,
            review_label=review_label,
        )
    except (ValidationError, TypeError) as exc:
        raise InvalidAIResponseError(
            f"Failed to parse document response: {exc}"
        ) from exc
