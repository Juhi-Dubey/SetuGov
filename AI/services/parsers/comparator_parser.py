"""
SetuGov AI Service — Brain 6: Startup Comparator Parser

Parses and sanitizes LLM JSON into StartupComparatorResponse.
All numerical scores come from Python — the LLM output is used only for
qualitative text fields (explanation, strengths, concerns, rationale,
comparative_observations).
"""

from __future__ import annotations

from typing import Any

from pydantic import ValidationError

from schemas.requests import StartupComparatorRequest
from schemas.responses import (
    MatchScoreBreakdown,
    RecommendationLabel,
    StartupComparatorResponse,
    StartupRank,
)
from providers.base import InvalidAIResponseError
from services.sanitizers import _extract_str_list, _sanitize_claim


# ─────────────────────────────────────────────────────────────────────────────
# Label assignment (deterministic — based on score thresholds)
# ─────────────────────────────────────────────────────────────────────────────

def _assign_label(total_score: float) -> RecommendationLabel:
    """Deterministically map a total score to a recommendation label."""
    if total_score >= 75:
        return RecommendationLabel.HIGHLY_RECOMMENDED
    elif total_score >= 55:
        return RecommendationLabel.RECOMMENDED
    elif total_score >= 35:
        return RecommendationLabel.MARGINAL
    else:
        return RecommendationLabel.NOT_RECOMMENDED


# ─────────────────────────────────────────────────────────────────────────────
# Main parser
# ─────────────────────────────────────────────────────────────────────────────

def parse_comparator_response(
    raw: dict[str, Any],
    request: StartupComparatorRequest,
    scores: list[MatchScoreBreakdown],
) -> StartupComparatorResponse:
    """
    Build StartupComparatorResponse from LLM JSON + deterministic scores.

    Args:
        raw:    Parsed LLM JSON output.
        request: Original comparator request (used for startup names and ordering).
        scores: Pre-computed MatchScoreBreakdown for each startup, ordered
                identically to request.startups.

    The LLM provides: explanation, strengths, concerns, recommendation_rationale,
    comparative_observations.
    Python provides: all scores, ranks, labels, recommended_startup name.
    """
    try:
        # ── Build a lookup of LLM narratives by startup name ──────────
        raw_narratives: list[dict[str, Any]] = raw.get("startup_narratives", [])
        narrative_by_name: dict[str, dict[str, Any]] = {}
        for item in raw_narratives:
            if isinstance(item, dict) and item.get("startup_name"):
                narrative_by_name[str(item["startup_name"]).strip().lower()] = item

        # ── Sort startups by score descending → assign deterministic rank ─
        indexed = sorted(
            zip(request.startups, scores),
            key=lambda pair: pair[1].total,
            reverse=True,
        )

        ranked: list[StartupRank] = []
        for rank_pos, (startup, score) in enumerate(indexed, start=1):
            # Find the LLM narrative for this startup (case-insensitive match)
            narrative = narrative_by_name.get(startup.name.strip().lower(), {})

            explanation_raw = narrative.get("explanation") or (
                f"{startup.name} achieved a match score of {score.total:.1f}/100 against this challenge."
            )
            explanation = _sanitize_claim(str(explanation_raw).strip())

            strengths = [
                _sanitize_claim(s)
                for s in _extract_str_list(narrative.get("strengths"))
            ]
            concerns = [
                _sanitize_claim(c)
                for c in _extract_str_list(narrative.get("concerns"))
            ]

            # Ensure we have at least placeholder content if LLM gave nothing
            if not explanation:
                explanation = (
                    f"{startup.name} received a match score of {score.total:.1f}/100. "
                    "Detailed qualitative assessment not available — requires evaluator review."
                )

            ranked.append(
                StartupRank(
                    rank=rank_pos,
                    startup_name=startup.name,
                    total_score=round(score.total, 1),
                    score_breakdown=score,
                    recommendation_label=_assign_label(score.total),
                    explanation=explanation,
                    strengths=strengths,
                    concerns=concerns,
                )
            )

        # ── Top-ranked startup (deterministic) ───────────────────────
        recommended_name = ranked[0].startup_name

        # ── Recommendation rationale (LLM) ───────────────────────────
        raw_rationale = raw.get("recommendation_rationale") or ""
        recommendation_rationale = _sanitize_claim(str(raw_rationale).strip())
        if not recommendation_rationale:
            recommendation_rationale = (
                f"{recommended_name} achieved the highest overall match score "
                f"({ranked[0].total_score:.1f}/100) across all evaluated dimensions. "
                "Detailed rationale requires authorized evaluator review."
            )

        # ── Comparative observations (LLM) ───────────────────────────
        comparative_observations = [
            _sanitize_claim(obs)
            for obs in _extract_str_list(raw.get("comparative_observations"))
        ]
        # Deterministic fallback if LLM returned nothing
        if not comparative_observations and len(ranked) >= 2:
            top = ranked[0]
            second = ranked[1]
            comparative_observations = [
                f"{top.startup_name} leads with a score of {top.total_score:.1f}/100 vs "
                f"{second.startup_name} at {second.total_score:.1f}/100.",
                f"Score gap between rank 1 and rank 2: "
                f"{top.total_score - second.total_score:.1f} points.",
            ]

        return StartupComparatorResponse(
            recommended_startup=recommended_name,
            recommendation_rationale=recommendation_rationale,
            ranked_startups=ranked,
            comparative_observations=comparative_observations,
        )

    except (ValidationError, TypeError, AttributeError) as exc:
        raise InvalidAIResponseError(
            f"Failed to parse comparator response: {exc}"
        ) from exc
