"""
SetuGov AI — Risk Analysis Prompts

Open-ended 7-dimension risk identification: Technical, Operational,
Financial, Security, Legal/Compliance, Data/Privacy, Scalability. The LLM
identifies and describes risks; Python is the sole authority on the
resulting severity counts and overall score (see
DecisionEngine.summarize_identified_risks) — the LLM's own aggregate
numbers, if any, are never trusted.
"""

from __future__ import annotations

from schemas.requests import RiskAnalysisRequest

SYSTEM_PROMPT = """\
You are the SetuGov Procurement Risk Analyst — an evaluator-assistance AI \
that identifies risks across 7 standard dimensions for a government \
challenge, proposal, or pilot: Technical, Operational, Financial, Security, \
Legal/Compliance, Data/Privacy, and Scalability.

## ROLE & BOUNDARIES
1. This output is advisory only. It does NOT replace a formal departmental \
risk audit and must not be presented as one.
2. Anti-Hallucination:
   - Ground every risk in the supplied context (challenge, proposal, \
technical approach, budget, pilot duration).
   - Do NOT invent specific incidents, named vendors, or figures not \
present in the input — general, well-known categories of risk for this \
type of government technology deployment are appropriate; fabricated \
specifics are not.
3. For each risk, assign:
   - category: one of Technical, Operational, Financial, Security, \
Legal/Compliance, Data/Privacy, Scalability
   - severity: LOW, MEDIUM, or HIGH
   - probability: LOW, MEDIUM, or HIGH
   - a concrete, actionable mitigation_suggestion
4. Do NOT compute or report an overall risk score or severity counts \
yourself — Python computes those deterministically from your risk list \
after you respond. Only return the risk list.

## OUTPUT FORMAT
Return a JSON object:
{
  "risks": [
    {
      "category": "string",
      "description": "string",
      "severity": "LOW|MEDIUM|HIGH",
      "probability": "LOW|MEDIUM|HIGH",
      "mitigation_suggestion": "string or null"
    }
  ]
}

CRITICAL: Return ONLY valid JSON matching this schema. Identify risks across \
as many of the 7 dimensions as the supplied context reasonably supports \
(typically 4-7 risks).
"""


def build_risk_analysis_prompt(request: RiskAnalysisRequest) -> tuple[str, str]:
    parts: list[str] = []
    parts.append("## TASK")
    parts.append(
        "Identify risks across the 7 standard dimensions for the following "
        "government technology deployment context."
    )

    parts.append("\n## CONTEXT")
    if request.challenge_title:
        parts.append(f"Challenge: {request.challenge_title}")
    if request.challenge_description:
        parts.append(f"Description: {request.challenge_description}")
    if request.startup_name:
        parts.append(f"Startup: {request.startup_name}")
    if request.proposal_summary:
        parts.append(f"Proposal summary: {request.proposal_summary}")
    if request.technical_approach:
        parts.append(f"Technical approach: {request.technical_approach}")
    if request.pilot_duration:
        parts.append(f"Pilot duration: {request.pilot_duration}")
    if request.budget:
        parts.append(f"Budget: {request.budget}")

    if request.categories:
        parts.append(
            f"\nFocus specifically on these risk categories: {', '.join(request.categories)}"
        )
    else:
        parts.append(
            "\nNo specific categories requested — cover all 7 dimensions "
            "reasonably supported by the context above."
        )

    if not any(
        [
            request.challenge_title,
            request.challenge_description,
            request.proposal_summary,
            request.technical_approach,
        ]
    ):
        parts.append(
            "\nNo specific challenge/proposal context was provided — "
            "identify general risks typical of government technology "
            "procurement and pilot deployment, clearly framed as general "
            "rather than context-specific."
        )

    parts.append("\nReturn ONLY the JSON object.")

    return SYSTEM_PROMPT, "\n".join(parts)
