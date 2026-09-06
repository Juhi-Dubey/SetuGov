"""
SetuGov AI Service — Brain 6: Startup Comparator Prompt Builder

Builds system + user prompts for the startup comparison task.
The deterministic scores are injected into the prompt so the LLM can
reference them, but it is strictly forbidden from altering them.
"""

from __future__ import annotations

from schemas.requests import StartupComparatorRequest
from schemas.responses import MatchScoreBreakdown


def build_comparator_prompt(
    request: StartupComparatorRequest,
    scores: list[MatchScoreBreakdown],
) -> tuple[str, str]:
    """
    Return (system_prompt, user_prompt) for the startup comparator brain.

    Args:
        request: The comparator request containing challenge + startup profiles.
        scores:  Pre-computed deterministic MatchScoreBreakdown for each startup,
                 ordered identically to request.startups.
    """
    system_prompt = _build_system_prompt()
    user_prompt = _build_user_prompt(request, scores)
    return system_prompt, user_prompt


# ─────────────────────────────────────────────────────────────────────────────
# System Prompt
# ─────────────────────────────────────────────────────────────────────────────

def _build_system_prompt() -> str:
    return """You are SetuGov AI Brain 6 — Startup Comparator for Government of Maharashtra.

Your role is to assist authorized government evaluators in understanding how multiple startup candidates compare against an innovation challenge. You provide qualitative, evidence-based explanations grounded only in the information supplied.

## CRITICAL RULES

1. **DO NOT re-compute or modify scores.** All numerical scores are pre-computed by the deterministic Python engine and are authoritative. You must reference the provided scores exactly as given.
2. **Do NOT invent or embellish facts.** Only use information explicitly provided in each startup's profile. Never assume certifications, deployments, team sizes, or experience not listed.
3. **Avoid unverified claims.** Do not describe capabilities as "proven", "verified", "demonstrated", or "guaranteed" — use "stated", "reported", "profile-indicated", or "described in submission" instead.
4. **Be impartial.** Do not express personal preference. Your explanation must be grounded in profile data and scores.
5. **Format.** Respond ONLY with a valid JSON object matching the schema below. Do not include markdown fences, preamble, or commentary.

## OUTPUT SCHEMA

```json
{
  "startup_narratives": [
    {
      "startup_name": "<exact name from profile>",
      "explanation": "<2–4 sentence narrative explaining this startup's fit with the challenge, referencing their score>",
      "strengths": ["<strength 1>", "<strength 2>"],
      "concerns": ["<concern 1>", "<concern 2>"]
    }
  ],
  "recommendation_rationale": "<2–3 sentence explanation for why the top-ranked startup is recommended over others, referencing their comparative advantages>",
  "comparative_observations": [
    "<cross-startup insight 1>",
    "<cross-startup insight 2>",
    "<cross-startup insight 3>"
  ]
}
```

- `startup_narratives` must contain one entry per startup, in the same order they are presented.
- `recommendation_rationale` refers to the startup with rank 1 (highest score).
- `comparative_observations` are 2–5 insights that highlight key differentiators across startups (e.g. which has stronger domain fit, which has more deployments, where they overlap).
- Keep all text factual, concise, and suitable for a government evaluation panel.
"""


# ─────────────────────────────────────────────────────────────────────────────
# User Prompt
# ─────────────────────────────────────────────────────────────────────────────

def _build_user_prompt(
    request: StartupComparatorRequest,
    scores: list[MatchScoreBreakdown],
) -> str:
    challenge = request.challenge
    lines: list[str] = []

    # ── Challenge Context ─────────────────────────────────────────────
    lines.append("## Challenge")
    lines.append(f"Title: {challenge.title}")
    lines.append(f"Description: {challenge.description}")
    if challenge.domain:
        lines.append(f"Domain: {challenge.domain}")
    if challenge.technology_categories:
        lines.append(f"Technology Categories: {', '.join(challenge.technology_categories)}")
    if challenge.location:
        lines.append(f"Location: {challenge.location}")
    if challenge.kpis:
        kpi_names = [k.name for k in challenge.kpis]
        lines.append(f"Key KPIs: {', '.join(kpi_names)}")
    lines.append("")

    # ── Startup Profiles with Scores ──────────────────────────────────
    lines.append("## Startup Candidates (ordered by rank, rank 1 = highest score)")
    lines.append("")

    # Sort by score descending to make rank order explicit in prompt
    indexed_startups = sorted(
        zip(range(len(request.startups)), request.startups, scores),
        key=lambda x: x[2].total,
        reverse=True,
    )

    for rank_pos, (orig_idx, startup, score) in enumerate(indexed_startups, start=1):
        lines.append(f"### Rank {rank_pos}: {startup.name}")
        lines.append(f"**Total Match Score (deterministic): {score.total:.1f} / 100**")
        lines.append(f"Score Breakdown:")
        lines.append(f"  - Technology Fit:  {score.technology_fit:.1f} / 30")
        lines.append(f"  - Domain Fit:      {score.domain_fit:.1f} / 25")
        lines.append(f"  - Readiness:       {score.readiness:.1f} / 20")
        lines.append(f"  - Experience:      {score.experience:.1f} / 15")
        lines.append(f"  - Deployment Fit:  {score.deployment_fit:.1f} / 10")
        lines.append("")
        lines.append(f"Profile:")
        lines.append(f"  Description: {startup.description}")
        if startup.domain:
            lines.append(f"  Domain: {startup.domain}")
        if startup.technologies:
            lines.append(f"  Technologies: {', '.join(startup.technologies)}")
        if startup.experience:
            lines.append(f"  Experience: {startup.experience}")
        if startup.deployments:
            lines.append(f"  Deployments: {'; '.join(startup.deployments)}")
        if startup.certifications:
            lines.append(f"  Certifications: {', '.join(startup.certifications)}")
        if startup.team_size is not None:
            lines.append(f"  Team Size: {startup.team_size}")
        if startup.location:
            lines.append(f"  Location: {startup.location}")
        lines.append("")

    # ── Task ──────────────────────────────────────────────────────────
    lines.append("## Task")
    lines.append(
        "Using only the profile data and pre-computed scores above, provide the JSON response as specified in the system prompt. "
        "Remember: DO NOT change, recalculate, or dispute any scores. "
        f"The recommended startup is {indexed_startups[0][1].name} (rank 1, highest score). "
        "Your recommendation_rationale must explain WHY this startup is best, not re-rank them."
    )

    return "\n".join(lines)
