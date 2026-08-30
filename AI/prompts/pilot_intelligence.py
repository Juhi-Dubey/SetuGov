"""
SetuGov AI — Brain 4: Pilot Intelligence Prompts

The LLM interprets pre-computed KPI calculations and pilot evidence.
All arithmetic is done by Python BEFORE the prompt is constructed.
"""

from __future__ import annotations

from schemas.requests import PilotIntelligenceRequest
from schemas.responses import KPIAnalysis


SYSTEM_PROMPT = """\
You are the SetuGov Pilot Intelligence Analyst — an evaluator-assistance AI \
that interprets actual pilot evidence and pre-computed KPI results.

## ROLE & BOUNDARIES
1. Evaluator-Assistance Only:
   - You provide qualitative observations, identify operational patterns, flag concerns, highlight evidence gaps, and suggest investigative actions.
   - You are NOT the final procurement decision engine.
   - You must NOT make definitive procurement decisions or issue binding declarations such as "Decision: SCALE", "Decision: EXTEND", "Decision: STOP", or declare the pilot an unqualified success or failure.
   - You may discuss scaling, extension, or termination only conditionally or advisively (e.g., "Further operational validation may be required before considering scale").

2. Deterministic Metrics are READ-ONLY:
   - All numerical KPI metrics (baseline, target, actual, improvement_pct, target_achievement_pct), KPI statuses (ON_TARGET, NEAR_TARGET, BELOW_TARGET, INSUFFICIENT_DATA), milestone completion rates, and risk counts are pre-calculated by Python and are authoritative, READ-ONLY facts.
   - You must NEVER recalculate, modify, round differently, or override these values.
   - You must NEVER change a KPI's status.

3. Anti-Hallucination & Evidence Grounding:
   - Use ONLY the supplied pilot data, risk logs, evidence items, and pre-computed metrics.
   - NEVER invent measurements, baseline values, targets, actuals, dates, user feedback, or validation results.
   - NEVER claim causality unless supported by direct evidence.
   - NEVER claim proven scalability, production readiness, or operational reliability without documented evidence.
   - Clearly distinguish observed evidence from inferences and recommendations.
   - Explicitly identify missing evidence and unverified claims.

## OUTPUT FORMAT
Return a JSON object:
{
  "overall_assessment": "string — balanced, objective qualitative assessment of the pilot",
  "observations": ["string — evidence-grounded patterns, trends, and notable findings"],
  "concerns": ["string — operational, technical, or adoption issues requiring evaluator attention"],
  "evidence_gaps": ["string — specific missing data, unverified claims, or omitted validation"],
  "recommended_actions": ["string — advisory investigative or follow-up actions for evaluators"]
}

CRITICAL: Return ONLY valid JSON matching this schema.
"""


def build_pilot_prompt(
    request: PilotIntelligenceRequest,
    kpi_analyses: list[KPIAnalysis],
    milestone_completion_rate: float | None,
    risk_counts: dict[str, int] | None,
) -> tuple[str, str]:
    """
    Build prompt for Brain 4. Pre-computed results are injected as read-only context.
    """
    parts: list[str] = []
    parts.append("## TASK")
    parts.append(
        "Interpret the following pilot results for human evaluators. All numerical calculations "
        "and KPI statuses below were computed deterministically by Python. Provide qualitative "
        "interpretation only without issuing final procurement decisions (SCALE / EXTEND / STOP)."
    )

    # ── Context ───────────────────────────────────────────────────────
    parts.append(f"\n## PILOT CONTEXT")
    parts.append(f"Challenge: {request.challenge_title}")
    parts.append(f"Startup: {request.startup_name}")
    if request.pilot_duration:
        parts.append(f"Duration: {request.pilot_duration}")
    if request.pilot_sites:
        parts.append(f"Sites: {', '.join(request.pilot_sites)}")

    # ── Pre-computed KPI Results (read-only) ──────────────────────────
    parts.append("\n## KPI RESULTS (computed deterministically — READ-ONLY)")
    for kpi in kpi_analyses:
        parts.append(f"\n### {kpi.name}")
        parts.append(f"  Baseline: {kpi.baseline if kpi.baseline is not None else 'N/A'}")
        parts.append(f"  Target: {kpi.target if kpi.target is not None else 'N/A'}")
        parts.append(f"  Actual: {kpi.actual if kpi.actual is not None else 'N/A'}")
        if kpi.improvement_pct is not None:
            parts.append(f"  Improvement: {kpi.improvement_pct:.1f}%")
        if kpi.target_achievement_pct is not None:
            parts.append(f"  Target Achievement: {kpi.target_achievement_pct:.1f}%")
        parts.append(f"  Status: {kpi.status.value}")

    # ── Milestones ────────────────────────────────────────────────────
    if milestone_completion_rate is not None:
        parts.append(f"\n## MILESTONE COMPLETION (computed): {milestone_completion_rate:.1f}%")
    if request.milestones:
        for m in request.milestones:
            parts.append(f"  - {m.name}: {m.status or 'unknown'}")

    # ── Risks ─────────────────────────────────────────────────────────
    if request.risks:
        parts.append("\n## RISKS REPORTED")
        for r in request.risks:
            mitigation_info = f" (Mitigation: {r.mitigation})" if r.mitigation else ""
            parts.append(f"  - [{r.severity or 'UNKNOWN'}] {r.category}: {r.description}{mitigation_info}")
    if risk_counts:
        parts.append(f"Risk summary counts: {risk_counts}")

    # ── Evidence ──────────────────────────────────────────────────────
    if request.evidence:
        parts.append("\n## EVIDENCE LOG")
        for e in request.evidence:
            verified = "VERIFIED" if e.verified is True else "UNVERIFIED" if e.verified is False else "UNSPECIFIED STATUS"
            source_info = f" (Source: {e.source})" if e.source else ""
            parts.append(f"  - [{verified}] {e.description}{source_info}")

    # ── Feedback & Stability ──────────────────────────────────────────
    if request.user_feedback:
        parts.append(f"\n## USER FEEDBACK: {request.user_feedback}")
    else:
        parts.append("\n## USER FEEDBACK: Not provided")

    if request.technical_stability:
        parts.append(f"## TECHNICAL STABILITY: {request.technical_stability}")
    else:
        parts.append("## TECHNICAL STABILITY: Not provided")

    if request.independent_validation:
        parts.append(f"## INDEPENDENT VALIDATION: {request.independent_validation}")
    else:
        parts.append("## INDEPENDENT VALIDATION: Not provided")

    parts.append("\nProvide objective, qualitative interpretation. Return ONLY the JSON object.")

    return SYSTEM_PROMPT, "\n".join(parts)
