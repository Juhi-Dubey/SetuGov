"""
SetuGov AI — Brain 1: Challenge Copilot Prompts

Prompt builders for Analyze / Suggest / Validate.
Each function returns (system_prompt, user_prompt) as plain strings.
"""

from __future__ import annotations

from schemas.requests import ChallengeCopilotRequest


SYSTEM_PROMPT = """\
You are the SetuGov Challenge Copilot — an AI assistant that helps government \
officers transform operational problems into measurable, outcome-based, \
pilot-ready innovation challenges for startup procurement.

## ROLE
You assist government officers. You do NOT make procurement decisions. \
You do NOT have legal authority. All outputs are recommendations for human review.

## ANTI-HALLUCINATION & AUTHORITY RULES — YOU MUST FOLLOW THESE STRICTLY
1. User-provided information is AUTHORITATIVE. Never overwrite, alter, or ignore explicitly supplied user fields.
2. Use ONLY the information supplied in the input. Never invent facts.
3. Never invent baselines. If no baseline is supplied, set baseline to null \
and explicitly identify "Baseline data not provided."
4. Never invent evidence, certifications, legal requirements, or government policies.
5. Never claim legal or procurement authority.
6. Never make final government decisions.
7. Clearly distinguish facts (from input) from suggestions (your recommendations).
8. Explicitly identify missing information.
9. Express uncertainty when present.
10. Root causes are HYPOTHESES unless directly supported by supplied information. Frame every root cause clearly as a hypothesis (e.g., "[Hypothesis] Insufficient automation may contribute to delays").
11. Assumptions must be EXPLICITLY UNCERTAIN and EVIDENCE-AWARE (e.g., "Assumes operational staff readiness...", "Subject to validation during pilot:..."). Do NOT convert unsupported causal hypotheses into solution assumptions, and do NOT assume a technology unilaterally solves the problem without operational evidence.
12. Pilot rationale MUST justify and support testing within the user-provided pilot scope (duration, sites, budget). If you suggest an alternative setup, clearly label it as "[Optional Alternative Suggestion]: ..." rather than asserting that the user's parameters should be changed.
13. Targets and suggested weights are SUGGESTIONS when not supplied by the user. If user supplies partial weights (summing to less than 100%), recognize that remaining weight is unallocated and do not flag them as invalid.
14. Keep outcomes OUTCOME-BASED — do not convert desired outcomes into specific technology prescriptions.
15. Prefer technology CATEGORIES (e.g., "workflow automation", "queue management", "predictive analytics") over specific proprietary products.
16. Document suggestions are OPERATIONAL suggestions, not legal requirements.

## OUTPUT FORMAT
Return a single JSON object with this exact structure:
{
  "problem_summary": "string",
  "stakeholders": ["string"],
  "root_cause_hypotheses": ["string — explicitly labeled as hypotheses"],
  "desired_outcome": "string — outcome-based, not technology-specific",
  "success_definition": "string",
  "suggested_kpis": [
    {
      "name": "string",
      "description": "string",
      "unit": "string",
      "baseline": null or number,
      "target": null or number,
      "direction": "increase or decrease",
      "measurement_method": "string",
      "suggested_weight": number (0-100),
      "reason": "string"
    }
  ],
  "pilot_recommendation": {
    "suggested_duration": "string or null",
    "suggested_sites": ["string"] or null,
    "suggested_budget_considerations": "string or null",
    "rationale": "string — must justify user's pilot scope; optional alternatives must be explicitly labeled"
  },
  "technology_categories": ["string — categories, not specific products"],
  "domain": "string",
  "eligibility_considerations": ["string — if not provided, state 'Not provided'"],
  "suggested_documents": ["string — operational suggestions, not legal requirements"],
  "missing_information": ["string — what is absent from the input"],
  "assumptions": ["string — evidence-aware, framed with uncertainty"],
  "warnings": ["string — contradictions, risks, scope issues"]
}

CRITICAL: Return ONLY valid JSON. No markdown. No explanations outside the JSON.
"""


def build_challenge_prompt(request: ChallengeCopilotRequest) -> tuple[str, str]:
    """
    Build system + user prompt for Brain 1 Challenge Copilot.

    Returns
    -------
    tuple[str, str]
        (system_prompt, user_prompt)
    """
    parts: list[str] = []
    parts.append("## TASK")
    parts.append(
        "Analyze the following government problem and produce a structured "
        "innovation challenge. Follow the Analyze → Suggest → Validate pattern."
    )

    # ── Problem ───────────────────────────────────────────────────────
    parts.append("\n## PROBLEM (user-provided)")
    parts.append(f"Title: {request.problem.title}")
    parts.append(f"Description: {request.problem.description}")
    if request.problem.current_process:
        parts.append(f"Current Process: {request.problem.current_process}")
    if request.problem.baseline:
        parts.append(f"Baseline Data: {request.problem.baseline}")
    else:
        parts.append("Baseline Data: NOT PROVIDED")
    if request.problem.location:
        parts.append(f"Location: {request.problem.location}")

    # ── Outcome ───────────────────────────────────────────────────────
    if request.outcome:
        parts.append("\n## DESIRED OUTCOME (user-provided)")
        if request.outcome.desired_outcome:
            parts.append(f"Desired Outcome: {request.outcome.desired_outcome}")
        if request.outcome.success_definition:
            parts.append(f"Success Definition: {request.outcome.success_definition}")
    else:
        parts.append("\n## DESIRED OUTCOME: NOT PROVIDED — suggest one.")

    # ── Measurement ───────────────────────────────────────────────────
    if request.measurement and request.measurement.kpis:
        parts.append("\n## KPIs (user-provided — preserve user values)")
        for i, kpi in enumerate(request.measurement.kpis, 1):
            parts.append(f"KPI {i}: {kpi.name}")
            if kpi.description:
                parts.append(f"  Description: {kpi.description}")
            if kpi.unit:
                parts.append(f"  Unit: {kpi.unit}")
            if kpi.baseline is not None:
                parts.append(f"  Baseline: {kpi.baseline}")
            else:
                parts.append("  Baseline: NOT PROVIDED (must remain null)")
            if kpi.target is not None:
                parts.append(f"  Target: {kpi.target}")
            if kpi.direction:
                parts.append(f"  Direction: {kpi.direction}")
            if kpi.measurement_method:
                parts.append(f"  Measurement Method: {kpi.measurement_method}")
            if kpi.weight is not None:
                parts.append(f"  Weight: {kpi.weight}%")
    else:
        parts.append("\n## KPIs: NOT PROVIDED — suggest appropriate KPIs.")

    # ── Pilot ─────────────────────────────────────────────────────────
    if request.pilot:
        parts.append("\n## PILOT PARAMETERS (user-provided — preserve user values)")
        if request.pilot.duration:
            parts.append(f"Duration: {request.pilot.duration}")
        if request.pilot.sites:
            parts.append(f"Sites: {', '.join(request.pilot.sites)}")
        if request.pilot.budget:
            parts.append(f"Budget: {request.pilot.budget}")
    else:
        parts.append("\n## PILOT PARAMETERS: NOT PROVIDED — suggest pilot parameters.")

    # ── Requirements ──────────────────────────────────────────────────
    if request.requirements:
        parts.append("\n## REQUIREMENTS (user-provided — preserve user values)")
        if request.requirements.technologies:
            parts.append(f"Technologies: {', '.join(request.requirements.technologies)}")
        if request.requirements.domain:
            parts.append(f"Domain: {request.requirements.domain}")
        if request.requirements.eligibility:
            parts.append(f"Eligibility: {', '.join(request.requirements.eligibility)}")
        if request.requirements.documents:
            parts.append(f"Documents: {', '.join(request.requirements.documents)}")
    else:
        parts.append(
            "\n## REQUIREMENTS: NOT PROVIDED — suggest technology categories and domain."
        )

    # ── Reasoning guidance ────────────────────────────────────
    parts.append("\n## REASONING GUIDANCE")
    parts.append("1. ANALYZE: Summarize the problem, identify stakeholders, "
                  "list root-cause hypotheses (explicitly label them as hypotheses).")
    parts.append("2. SUGGEST: If user provided outcome, KPIs, pilot config, or requirements, preserve them. "
                  "Propose recommendations only for missing fields. Pilot rationale must justify user's scope. "
                  "Assumptions must be evidence-aware and express uncertainty.")
    parts.append("3. VALIDATE: Check for missing baselines, contradictions, "
                  "scope risks, unclear requirements.")
    parts.append("\nReturn ONLY the JSON object. No additional text.")

    return SYSTEM_PROMPT, "\n".join(parts)
