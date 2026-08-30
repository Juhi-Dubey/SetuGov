"""
SetuGov AI — Brain 5: Document Assistance Prompts

Generates document drafts for authorized review.
Every draft includes a mandatory review disclaimer.
"""

from __future__ import annotations

from schemas.requests import DocumentAssistanceRequest, DocumentType


SYSTEM_PROMPT = """\
You are the SetuGov Document Assistant — an AI drafting tool for government \
innovation procurement and pilot workflows.

## ROLE & DRAFT STATUS
1. AI-Generated Draft Only:
   - Every document you produce is a non-binding DRAFT requiring authorized human review.
   - You do NOT provide legal advice, legal opinions, or official certifications.
   - You do NOT establish legal obligations, statutory compliance, or procurement approval.
   - You must NEVER claim the document is legally binding, approved, awarded, selected, or authorized.

2. User Facts & Targets are AUTHORITATIVE:
   - Challenge details, startup name, duration, sites, budget, KPIs, baseline metrics, target outcomes, and objectives supplied by the user are authoritative facts.
   - You must NEVER alter, modify, increase, decrease, or reinterpret supplied numbers, percentages, or targets.
   - If the user provides a "40% reduction", you must use exactly "40%" and NEVER introduce conflicting numbers (e.g. 30%, 50%).
   - Preserve exact figures and units (e.g. "₹10 lakh", "60 days", "baseline 90 minutes", "target 54 minutes").

3. SUBSTANTIVE & STRUCTURED DRAFT CONTENT:
   - Generate a substantive, structured document draft. The "content" field MUST NOT be a mere summary or introductory paragraph.
   - In "content", include clear markdown section headings (e.g. "## 1. Pilot Scope", "## 2. Objectives", etc.) matching the declared "sections" list.
   - Under each section heading, provide 2-4 sentences of neutral drafting language, incorporating authoritative user facts where applicable and explicit placeholders for unsupplied terms.

4. NO INVENTED LEGAL OR COMMERCIAL CLAUSES / CONTRACTUAL OBLIGATIONS:
   - Brain 5 is document drafting assistance, NOT a contracting authority.
   - Do NOT generate active contractual commitments or compliance guarantees (e.g. do NOT write "Startup will ensure compliance with...", "Either party may terminate upon 30 days notice...").
   - For any unsupplied legal, commercial, or governance terms, use neutral drafting and standard placeholders:
     "[PAYMENT SCHEDULE NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]"
     "[IP OWNERSHIP TERMS NOT SPECIFIED — SUBJECT TO AUTHORIZED LEGAL REVIEW]"
     "[TERMINATION CONDITIONS NOT SPECIFIED — SUBJECT TO AUTHORIZED REVIEW]"
     "[EXTENSION CONDITIONS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]"
     "[DISPUTE RESOLUTION AND GOVERNING JURISDICTION NOT SPECIFIED — SUBJECT TO AUTHORIZED LEGAL REVIEW]"
     "[CYBERSECURITY STANDARDS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]"
     "[DATA GOVERNANCE PROTOCOL — SUBJECT TO AUTHORIZED REVIEW]"
     "[AUTHORIZED SIGNATORIES AND OFFICIAL ENTITY ADDRESSES NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]"

5. NO INVENTED NUMBERS OR DATES:
   - NEVER invent milestone deadlines (e.g. "within 30 days", "within 45 days"), installment amounts, target dates, or KPI targets.

6. IDENTIFY MISSING INFORMATION:
   - In "missing_information", list unsupplied terms requiring authorized review, phrased as:
     "[Item] not provided — requires authorized review."
   - Do NOT claim information is missing if it was supplied by the user in the context.

7. MANDATORY REVIEW LABEL:
   - Every document must include the mandatory label:
     "AI-generated draft — requires authorized review."

## OUTPUT FORMAT
Return a JSON object:
{
  "title": "string — concise document title",
  "content": "string — full substantive document text with markdown section headings (e.g. '## 1. Pilot Scope') and structured drafting paragraphs separated by double newlines",
  "sections": ["string — list of section headings present in the document"],
  "missing_information": ["string — unsupplied information items requiring authorized review"]
}

CRITICAL: Return ONLY valid JSON matching this schema.
"""

# Per-type generation instructions
_TYPE_INSTRUCTIONS: dict[DocumentType, str] = {
    DocumentType.PILOT_AGREEMENT_DRAFT: (
        "Generate a structured Pilot Agreement Draft template. "
        "The 'content' field must contain markdown headings and 1-2 concise sentences of draft template language for each of these sections:\n"
        "## 1. Pilot Scope\n"
        "## 2. Objectives\n"
        "## 3. Duration & Timeline\n"
        "## 4. Pilot Sites\n"
        "## 5. Government & Startup Responsibilities\n"
        "## 6. Milestones & Deliverables\n"
        "## 7. Key Performance Indicators & Target Outcomes\n"
        "## 8. Budget & Payment Terms\n"
        "## 9. Data Governance & Handling\n"
        "## 10. Intellectual Property Considerations\n"
        "## 11. Cybersecurity Responsibilities\n"
        "## 12. Risk Management\n"
        "## 13. Termination Conditions\n"
        "## 14. Extension Conditions\n"
        "## 15. Review & Authorized Signatories\n\n"
        "Incorporate all supplied facts (startup name, duration, sites, budget, KPIs, objectives) directly into the appropriate sections. "
        "For unsupplied terms, use standard placeholders: '[PAYMENT SCHEDULE NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]', '[IP OWNERSHIP TERMS NOT SPECIFIED — SUBJECT TO AUTHORIZED LEGAL REVIEW]', etc."
    ),
    DocumentType.CHALLENGE_STATEMENT: (
        "Generate a structured Challenge Statement document draft with markdown headings and 1-2 concise sentences for each of these sections:\n"
        "## 1. Problem Statement\n"
        "## 2. Operational Background\n"
        "## 3. Desired Outcomes\n"
        "## 4. Success Criteria\n"
        "## 5. Key Performance Indicators & Baseline Metrics\n"
        "## 6. Pilot Parameters (Duration, Sites, Budget)\n"
        "## 7. Technology Scope & Requirements\n"
        "## 8. Eligibility Guidelines\n"
        "## 9. Submission & Review Process\n\n"
        "Keep the language outcome-based and incorporate all user-supplied challenge details."
    ),
    DocumentType.EVALUATION_CRITERIA: (
        "Generate a structured Evaluation Criteria document draft with markdown headings and 1-2 concise sentences for each of these sections:\n"
        "## 1. Evaluation Overview & Objectives\n"
        "## 2. Evaluation Dimensions\n"
        "## 3. Scoring Rubric Structure & Rating Scale\n"
        "## 4. Evaluation Stages & Workflow\n"
        "## 5. Panel Composition & Governance Guidelines\n\n"
        "Mark specific scoring weights as requiring authorized review if not provided."
    ),
    DocumentType.GOVERNANCE_CHECKLIST: (
        "Generate a structured Governance Checklist draft with markdown headings and 1-2 concise sentences for each of these sections:\n"
        "## 1. Pre-Pilot Authorizations & Verification\n"
        "## 2. During-Pilot Monitoring & Milestone Tracking\n"
        "## 3. Post-Pilot Evaluation & Acceptance Criteria\n"
        "## 4. Data Governance & Privacy Safeguards\n"
        "## 5. Security & Technical Architecture Review\n"
        "## 6. Stakeholder & Operational Communication\n"
        "## 7. Risk Escalation & Incident Response\n"
        "## 8. Documentation, Audit Trail & Reporting Requirements\n\n"
        "Mark policy specifics as requiring authorized review if not supplied."
    ),
    DocumentType.PROCUREMENT_PATHWAY_SUMMARY: (
        "Generate a structured Procurement Pathway Summary draft with markdown headings and 1-2 concise sentences for each of these sections:\n"
        "## 1. Challenge & Pilot Background\n"
        "## 2. Pilot Performance & Results Overview\n"
        "## 3. Evidence & KPI Target Achievement\n"
        "## 4. Technical Validation Status & Findings\n"
        "## 5. Risk Assessment & Operational Impact\n"
        "## 6. Advisory Recommendations & Options Analysis\n"
        "## 7. Procurement Pathways & Regulatory Routes\n"
        "## 8. Governance Next Steps & Required Approvals\n\n"
        "Do NOT claim procurement authority or mandate a specific pathway unless explicitly provided in input."
    ),
}


def build_document_prompt(request: DocumentAssistanceRequest) -> tuple[str, str]:
    """Build prompt for Brain 5 Document Assistance."""
    parts: list[str] = []
    parts.append("## TASK")
    parts.append(f"Generate a {request.document_type.value} document draft.")
    parts.append(_TYPE_INSTRUCTIONS[request.document_type])

    # ── Context ───────────────────────────────────────────────────────
    parts.append("\n## AUTHORITATIVE CONTEXT (DO NOT ALTER OR INVENT)")
    if request.challenge_title:
        parts.append(f"Challenge Title: {request.challenge_title}")
    if request.challenge_description:
        parts.append(f"Challenge Description: {request.challenge_description}")
    if request.startup_name:
        parts.append(f"Startup Name: {request.startup_name}")
    if request.pilot_duration:
        parts.append(f"Pilot Duration: {request.pilot_duration}")
    if request.pilot_sites:
        parts.append(f"Pilot Sites: {', '.join(request.pilot_sites)}")
    if request.pilot_budget:
        parts.append(f"Pilot Budget: {request.pilot_budget}")

    # ── KPIs ──────────────────────────────────────────────────────────
    if request.kpis:
        parts.append("\n## KPIs")
        for kpi in request.kpis:
            line = f"- {kpi.name}"
            if kpi.unit:
                line += f" ({kpi.unit})"
            if kpi.baseline is not None:
                line += f", baseline={kpi.baseline}"
            if kpi.target is not None:
                line += f", target={kpi.target}"
            parts.append(line)

    # ── Objectives ────────────────────────────────────────────────────
    if request.objectives:
        parts.append("\n## OBJECTIVES")
        for obj in request.objectives:
            parts.append(f"- {obj}")

    # ── Additional ────────────────────────────────────────────────────
    if request.additional_context:
        parts.append(f"\n## ADDITIONAL CONTEXT\n{request.additional_context}")

    parts.append(
        "\n## INSTRUCTIONS:"
        "\n1. Generate substantive multi-section draft content with markdown headings corresponding to the sections list."
        "\n2. Preserve all supplied facts exactly (including currency values and durations)."
        "\n3. Do NOT invent legal ownership clauses, payment splits, or milestone deadlines."
        "\n4. Use explicit '[PAYMENT SCHEDULE NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]' or '[IP OWNERSHIP TERMS NOT SPECIFIED — SUBJECT TO AUTHORIZED LEGAL REVIEW]' placeholders for unsupplied terms."
        "\n5. Every document must include the disclaimer: 'AI-generated draft — requires authorized review.'"
    )
    parts.append("\nReturn ONLY the JSON object.")

    return SYSTEM_PROMPT, "\n".join(parts)
