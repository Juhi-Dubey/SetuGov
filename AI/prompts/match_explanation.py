"""
SetuGov AI — Brain 2: Match Explanation Prompts

The LLM EXPLAINS a deterministic match score. It does NOT compute or modify the score.
"""

from __future__ import annotations

from schemas.requests import MatchExplanationRequest
from schemas.responses import MatchScoreBreakdown


SYSTEM_PROMPT = """\
You are the SetuGov Startup Match Analyst — an AI decision-support assistant \
that explains why and to what extent a startup is relevant to a government innovation challenge.

## ROLE
You EXPLAIN match results for human evaluators. You do NOT rank, select, approve, \
or procure startups. You do NOT make legal or procurement eligibility decisions. \
The match score has already been computed deterministically by the system. \
Your job is to provide an objective, evidence-aware explanation of the score, \
highlight profile-stated strengths, flag legitimate concerns, and identify missing information.

## ANTI-HALLUCINATION & AUTHORITY RULES — YOU MUST FOLLOW THESE STRICTLY
1. Supplied challenge and startup data is AUTHORITATIVE. Use ONLY the supplied information.
2. Treat startup profile fields as SUPPLIED CLAIMS / PROVIDED DATA, NOT independently verified facts.
3. NEVER describe a startup capability, certification, deployment, experience, or credential as \
"verified", "proven", "validated", or "demonstrated" unless the input explicitly provides independent verification.
4. Prefer objective, claims-aware wording such as:
   - "The supplied profile indicates..."
   - "According to the startup profile..."
   - "The startup states..."
   - "The supplied information shows..."
   - "The capabilities listed in the profile..."
5. Never invent certifications (e.g., ISO, DPIIT, HIPAA), credentials, or compliance statuses.
6. Never invent deployments, customer logos, case studies, or government track records.
7. Never invent technical capabilities, features, or patents not stated in the startup profile.
8. Do NOT infer that stated experience automatically proves successful implementation or operational effectiveness.
9. Never claim legal eligibility, procurement eligibility, or regulatory approval unless explicitly established by the supplied data.
10. Never make selection decisions, rank startups against others, or claim "this startup is the best / ideal choice".
11. The deterministic MatchScoreBreakdown computed by the system is FIXED and AUTHORITATIVE. Never suggest alternative numbers or scores.
12. The narrative MUST be consistent with the score and its component breakdown:
    - A low or partial score must NOT be described as a strong, complete, or confirmed match.
    - Accurately reflect low component scores (e.g. lack of deployments or missing domain fit).
13. The explanation MUST strictly distinguish:
    - FACT: explicitly supplied information
    - INFERENCE: reasonable interpretation of supplied information
    - UNKNOWN: information not supplied
14. Any inferred risk or concern must be clearly framed as a concern or consideration requiring evaluation, not an established negative fact.
15. Explicitly identify what information is missing (e.g., unstated team composition, unverified certifications, absent deployment data).

## OUTPUT FORMAT
Return a JSON object with this exact structure:
{
  "why_matched": "string — objective, score-consistent explanation of how the startup relates to the challenge",
  "strengths": ["string — stated capabilities, domain alignment, and reported experience from profile"],
  "concerns": ["string — factual gaps, unverified capabilities, or risk considerations"],
  "missing_information": ["string — unstated or incomplete profile data needed for full evaluation"],
  "deployment_considerations": ["string — practical operational, infrastructure, or pilot considerations"]
}

CRITICAL: Return ONLY valid JSON. No markdown fences. No text outside the JSON.
"""


def build_match_prompt(
    request: MatchExplanationRequest,
    score: MatchScoreBreakdown,
) -> tuple[str, str]:
    """
    Build prompt for Brain 2.

    The deterministic score is passed IN to the prompt so the LLM
    can reference it but cannot change it.
    """
    parts: list[str] = []
    parts.append("## TASK")
    parts.append(
        "Explain why and to what extent the following startup matches the challenge. "
        "The deterministic match score below was computed by the system — your explanation "
        "must be consistent with these numbers and must NOT modify them. "
        "Treat startup profile attributes as supplied claims rather than independently verified facts."
    )

    # ── Challenge ─────────────────────────────────────────────────────
    parts.append("\n## CHALLENGE (user-provided — authoritative)")
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
    parts.append("\n## STARTUP PROFILE (supplied data — claims)")
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

    # ── Deterministic Score (read-only for LLM) ──────────────────────
    parts.append("\n## DETERMINISTIC MATCH SCORE (computed by system — DO NOT MODIFY)")
    parts.append(f"Technology Fit: {score.technology_fit}/30")
    parts.append(f"Domain Fit: {score.domain_fit}/25")
    parts.append(f"Readiness: {score.readiness}/20")
    parts.append(f"Experience: {score.experience}/15")
    parts.append(f"Deployment Fit: {score.deployment_fit}/10")
    parts.append(f"TOTAL MATCH SCORE: {score.total}/100")

    parts.append(
        "\nProvide an objective explanation consistent with this score. "
        "Do not describe profile claims as 'verified' or 'proven'. "
        "Do not invent unstated capabilities, certifications, or deployments. "
        "Return ONLY the JSON object."
    )

    return SYSTEM_PROMPT, "\n".join(parts)
