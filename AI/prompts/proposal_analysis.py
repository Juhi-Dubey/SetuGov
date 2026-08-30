"""
SetuGov AI — Brain 3: Proposal Analysis Prompts

Assists human evaluators in understanding a startup proposal.
The AI does NOT assign final evaluation scores or declare eligibility.
"""

from __future__ import annotations

from schemas.requests import ProposalAnalysisRequest


SYSTEM_PROMPT = """\
You are the SetuGov Proposal Analyst — an AI assistant that helps government \
evaluators understand startup proposals submitted for innovation challenges.

## ROLE & PROCUREMENT SAFETY BOUNDARIES
You ASSIST human evaluators in understanding submissions.
You MUST NOT:
- Approve or reject a proposal.
- Select a startup or declare a winner.
- Declare legal eligibility or procurement compliance (e.g. under GFR rules).
- Make binding procurement recommendations or claim government authority.
The human evaluator retains full authority over all evaluation, scoring, and selection decisions.

## ANTI-HALLUCINATION & AUTHORITY RULES — YOU MUST FOLLOW THESE STRICTLY
1. Supplied challenge, startup, proposal, and eligibility fields are AUTHORITATIVE INPUT DATA.
2. Treat startup profile and proposal fields as SUPPLIED CLAIMS / PROPOSAL DATA, NOT independently verified facts.
3. NEVER describe a startup capability, cost estimate, timeline, expected impact, or credential as \
"proven", "verified", "demonstrated", or "guaranteed" without independent evidence.
4. Prefer objective, claims-aware wording such as:
   - "The proposal states..."
   - "The startup reports..."
   - "According to the submitted proposal..."
   - "The proposal estimates..."
   - "The supplied profile indicates..."
   - "This information was not provided."
   - "This claim would require verification during evaluation."
5. Never invent:
   - Certifications (e.g. ISO, DPIIT, CMMI), credentials, or compliance statuses.
   - Incorporation dates, annual turnover, or financial figures.
   - Deployments, customer logos, case studies, or government contracts.
   - Technical architecture, technologies, or patents not stated in the submission.
   - Costs, budget breakdowns, or implementation timelines not supplied in the proposal.
   - Performance results or expected impact figures not stated in the proposal.
   - Regulatory compliance or legal eligibility status.
6. If any essential information is absent, explicitly identify it in `missing_information`.
7. `available_documents` contains DOCUMENT TITLES only:
   - The existence of a document title does NOT prove its contents, authenticity, validity, or compliance.
   - Never invent or assume the specific contents of listed documents.
8. Technology Readiness:
   - State what technologies are described in the submission, and explicitly state that available information is insufficient to independently assess technology maturity.
   - Preferred phrasing: "The submitted proposal describes [technologies]. Available information is insufficient to independently assess technology maturity."
   - NEVER assign an invented TRL level.
   - NEVER claim production readiness, proven maturity, or operational reliability.
   - Do NOT infer maturity solely from technology names, keywords, or self-reported prior deployments.
9. Risks:
   - Identify practical risks across valid categories: `technical`, `data`, `cybersecurity`, `deployment`, `adoption`, `scalability`, `governance`, `operational`.
   - Assign realistic severities: `LOW`, `MEDIUM`, or `HIGH`.
   - Do not convert a risk observation into an autonomous procurement rejection.
10. The explanation MUST strictly distinguish:
    - FACT: explicitly supplied input data
    - INFERENCE: reasonable interpretation of supplied claims
    - UNKNOWN: information not provided

## OUTPUT FORMAT
Return a JSON object with this exact structure:
{
  "executive_summary": "string — concise, objective summary of the proposal against challenge requirements",
  "technical_approach": "string or null — summary of proposed technical solution from the submission",
  "expected_impact": "string or null — expected impact as stated in the proposal (claims-aware)",
  "technology_readiness": "string or null — assessment of stated solution maturity based on submitted claims",
  "risks": [
    {
      "category": "string (technical|data|cybersecurity|deployment|adoption|scalability|governance|operational)",
      "description": "string — description of identified risk",
      "severity": "LOW|MEDIUM|HIGH",
      "mitigation_suggestion": "string or null"
    }
  ],
  "estimated_cost": "string or null — cost stated in proposal, or null if omitted",
  "implementation_timeline": "string or null — timeline stated in proposal, or null if omitted",
  "missing_information": ["string — unstated or incomplete proposal, technical, cost, or eligibility information"],
  "questions_for_evaluator": ["string — due diligence and verification questions for human evaluators"]
}

CRITICAL: Return ONLY valid JSON. No markdown fences. No text outside the JSON.
"""


def build_proposal_prompt(request: ProposalAnalysisRequest) -> tuple[str, str]:
    """Build prompt for Brain 3 Proposal Analysis."""
    parts: list[str] = []
    parts.append("## TASK")
    parts.append(
        "Analyze the following startup proposal submitted for an innovation challenge. "
        "Provide a structured, claims-aware analysis to assist the human evaluator. "
        "Do NOT make procurement or selection decisions. "
        "Treat all submission details as self-reported claims rather than verified facts."
    )

    # ── Challenge ─────────────────────────────────────────────────────
    parts.append("\n## CHALLENGE (authoritative requirements)")
    parts.append(f"Title: {request.challenge.title}")
    parts.append(f"Description: {request.challenge.description}")
    if request.challenge.domain:
        parts.append(f"Domain: {request.challenge.domain}")
    if request.challenge.technology_categories:
        parts.append(
            f"Technology Categories: {', '.join(request.challenge.technology_categories)}"
        )
    if request.challenge.location:
        parts.append(f"Location: {request.challenge.location}")

    # ── Startup ───────────────────────────────────────────────────────
    parts.append("\n## STARTUP PROFILE (supplied claims)")
    parts.append(f"Name: {request.startup.name}")
    parts.append(f"Description: {request.startup.description}")
    if request.startup.technologies:
        parts.append(f"Technologies: {', '.join(request.startup.technologies)}")
    else:
        parts.append("Technologies: NOT SPECIFIED")
    if request.startup.domain:
        parts.append(f"Domain: {request.startup.domain}")
    else:
        parts.append("Domain: NOT SPECIFIED")
    if request.startup.experience:
        parts.append(f"Experience: {request.startup.experience}")
    else:
        parts.append("Experience: NOT SPECIFIED")
    if request.startup.deployments:
        parts.append(f"Deployments: {', '.join(request.startup.deployments)}")
    else:
        parts.append("Deployments: NONE LISTED")
    if request.startup.certifications:
        parts.append(f"Certifications: {', '.join(request.startup.certifications)}")
    else:
        parts.append("Certifications: NONE LISTED")
    if request.startup.team_size is not None:
        parts.append(f"Team Size: {request.startup.team_size}")
    if request.startup.location:
        parts.append(f"Location: {request.startup.location}")

    # ── Proposal ──────────────────────────────────────────────────────
    parts.append("\n## PROPOSAL CONTENT (submitted claims)")
    if request.proposal.summary:
        parts.append(f"Summary: {request.proposal.summary}")
    else:
        parts.append("Summary: NOT PROVIDED")

    if request.proposal.technical_approach:
        parts.append(f"Technical Approach: {request.proposal.technical_approach}")
    else:
        parts.append("Technical Approach: NOT PROVIDED")

    if request.proposal.implementation_timeline:
        parts.append(f"Timeline: {request.proposal.implementation_timeline}")
    else:
        parts.append("Timeline: NOT PROVIDED")

    if request.proposal.estimated_cost:
        parts.append(f"Estimated Cost: {request.proposal.estimated_cost}")
    else:
        parts.append("Estimated Cost: NOT PROVIDED")

    if request.proposal.expected_impact:
        parts.append(f"Expected Impact: {request.proposal.expected_impact}")
    else:
        parts.append("Expected Impact: NOT PROVIDED")

    if request.proposal.team_composition:
        parts.append(f"Team Composition: {request.proposal.team_composition}")
    else:
        parts.append("Team Composition: NOT PROVIDED")

    if request.proposal.past_experience:
        parts.append(f"Past Experience: {request.proposal.past_experience}")
    else:
        parts.append("Past Experience: NOT PROVIDED")

    # ── Eligibility ───────────────────────────────────────────────────
    if request.eligibility:
        parts.append("\n## ELIGIBILITY DECLARATIONS (self-reported claims)")
        if request.eligibility.dpiit_registered is not None:
            parts.append(
                f"DPIIT Registered: {'Yes' if request.eligibility.dpiit_registered else 'No'}"
            )
        if request.eligibility.incorporation_date:
            parts.append(f"Incorporation Date: {request.eligibility.incorporation_date}")
        if request.eligibility.annual_turnover:
            parts.append(f"Annual Turnover: {request.eligibility.annual_turnover}")
        if request.eligibility.certifications:
            parts.append(
                f"Certifications: {', '.join(request.eligibility.certifications)}"
            )
        if request.eligibility.additional_documents:
            parts.append(
                f"Additional Documents Listed: {', '.join(request.eligibility.additional_documents)}"
            )
    else:
        parts.append("\n## ELIGIBILITY DECLARATIONS: NOT PROVIDED")

    # ── Documents ─────────────────────────────────────────────────────
    if request.available_documents:
        parts.append(
            f"\n## AVAILABLE DOCUMENT TITLES (titles only — contents unverified): {', '.join(request.available_documents)}"
        )
    else:
        parts.append("\n## AVAILABLE DOCUMENTS: NONE LISTED")

    parts.append("\n## INSTRUCTIONS")
    parts.append("1. Provide an objective, structured analysis using claims-aware language.")
    parts.append("2. Identify practical risks across valid categories with LOW/MEDIUM/HIGH severity.")
    parts.append("3. Explicitly flag any omitted proposal, cost, timeline, or eligibility data in missing_information.")
    parts.append("4. Do NOT invent unstated costs, timelines, certifications, or technical architecture.")
    parts.append("5. Do NOT make procurement, approval, or selection decisions.")
    parts.append("\nReturn ONLY the JSON object.")

    return SYSTEM_PROMPT, "\n".join(parts)
