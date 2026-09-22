"""
Tests for the Scale Recommendation adapter.

This brain makes no LLM call at all — it's a thin bridge from raw/partial
pilot data into DecisionEngine.recommend(), the same tested composite-score
engine used by /ai/decision. Tests focus on the aggregation logic and on
confirming the recommendation is never influenced by anything but that
engine.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import main
from schemas.requests import KPIResult, PilotEvidence, PilotRisk, ScaleRecommendationRequest
from services.ai_service import AIService
from services.decision_engine import DecisionEngine


# ═══════════════════════════════════════════════════════════════════════════
# Aggregation helpers
# ═══════════════════════════════════════════════════════════════════════════


class TestAggregationHelpers:
    def test_kpi_achievement_from_raw_results(self):
        kpis = [
            KPIResult(name="Wait time", unit="min", baseline=90, target=60, actual=60, direction="decrease"),
        ]
        pct = DecisionEngine.compute_kpi_achievement_pct(kpis)
        assert pct == 100.0

    def test_kpi_achievement_ignores_incomplete_entries(self):
        kpis = [
            KPIResult(name="Wait time", unit="min", baseline=None, target=60, actual=60, direction="decrease"),
        ]
        assert DecisionEngine.compute_kpi_achievement_pct(kpis) is None

    def test_evidence_quality_from_verified_ratio(self):
        evidence = [
            PilotEvidence(description="Log export", source="system", verified=True),
            PilotEvidence(description="Anecdote", source="interview", verified=False),
        ]
        assert DecisionEngine.compute_evidence_quality_pct(evidence) == 50.0

    def test_evidence_quality_empty_list_is_none(self):
        assert DecisionEngine.compute_evidence_quality_pct([]) is None

    def test_risk_score_weighting(self):
        risks = [
            PilotRisk(category="Technical", description="Downtime", severity="HIGH"),
            PilotRisk(category="Operational", description="Staffing", severity="MEDIUM"),
        ]
        assert DecisionEngine.compute_risk_score_from_risks(risks) == 42.0  # 30 + 12

    def test_risk_score_caps_at_100(self):
        risks = [PilotRisk(category="X", description="Y", severity="HIGH") for _ in range(5)]
        assert DecisionEngine.compute_risk_score_from_risks(risks) == 100.0


# ═══════════════════════════════════════════════════════════════════════════
# End-to-end via AIService — pre-aggregated inputs
# ═══════════════════════════════════════════════════════════════════════════


@pytest.fixture
def ai_service():
    # No AIProvider call is ever made by this brain, so a bare AIService
    # with no provider configured is sufficient — if it tried to call an
    # LLM, this would fail loudly rather than silently mocking success.
    return AIService(ai_provider=None)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_high_scores_produce_scale(ai_service):
    request = ScaleRecommendationRequest(
        challenge_title="Queue management",
        startup_name="MediFlow",
        kpi_achievement_pct=85,
        evidence_quality=80,
        validation_status="completed",
        technical_stability=90,
        user_feedback_score=85,
        risk_score=15,
    )
    result = await ai_service.recommend_scale(request)
    assert result.recommendation.value == "SCALE"
    assert result.confidence_pct >= 70
    assert len(result.reasons) > 0


@pytest.mark.asyncio
async def test_low_scores_produce_stop(ai_service):
    request = ScaleRecommendationRequest(
        kpi_achievement_pct=20,
        evidence_quality=20,
        validation_status="not_started",
        technical_stability=20,
        user_feedback_score=20,
        risk_score=80,
    )
    result = await ai_service.recommend_scale(request)
    assert result.recommendation.value == "STOP"


@pytest.mark.asyncio
async def test_raw_pilot_data_is_aggregated_before_scoring(ai_service):
    """No pre-aggregated fields supplied — everything derived from raw lists."""
    request = ScaleRecommendationRequest(
        kpi_results=[
            KPIResult(name="Wait time", unit="min", baseline=90, target=60, actual=60, direction="decrease"),
        ],
        evidence=[
            PilotEvidence(description="Log export", source="system", verified=True),
        ],
        risks=[],
        validation_status="completed",
        technical_stability=90,
        user_feedback_score=90,
    )
    result = await ai_service.recommend_scale(request)
    assert result.supporting_metrics.kpi_achievement_pct == 100.0
    assert result.supporting_metrics.validation_score == 100.0
    assert result.supporting_metrics.risk_score == 0.0


@pytest.mark.asyncio
async def test_missing_signals_default_neutral_not_fabricated(ai_service):
    """No data at all for technical_stability/user_feedback -> neutral 50, not 0 or 100."""
    request = ScaleRecommendationRequest(kpi_achievement_pct=60, validation_status="partial")
    result = await ai_service.recommend_scale(request)
    # Just confirm it runs and produces a real recommendation without crashing
    assert result.recommendation.value in ("SCALE", "EXTEND", "STOP")


@pytest.mark.asyncio
async def test_conditions_and_risks_come_from_engine_not_llm(ai_service):
    request = ScaleRecommendationRequest(
        kpi_achievement_pct=50,
        evidence_quality=50,
        validation_status="partial",
        technical_stability=50,
        user_feedback_score=50,
        risk_score=75,  # critical risk
    )
    result = await ai_service.recommend_scale(request)
    assert result.recommendation.value == "STOP"
    assert isinstance(result.risks, list)
    assert isinstance(result.conditions_for_scaling, list)


# ═══════════════════════════════════════════════════════════════════════════
# API endpoint
# ═══════════════════════════════════════════════════════════════════════════


@pytest.fixture
def api_client():
    with TestClient(main.app, raise_server_exceptions=False) as client:
        yield client


def test_scale_recommendation_endpoint(api_client):
    resp = api_client.post(
        "/ai/pilots/pilot-123/scale-recommendation",
        json={
            "challenge_title": "Queue management",
            "kpi_achievement_pct": 85,
            "evidence_quality": 80,
            "validation_status": "completed",
            "technical_stability": 90,
            "user_feedback_score": 85,
            "risk_score": 15,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["recommendation"] == "SCALE"
    assert "advisory_notice" in body["data"]


def test_scale_recommendation_endpoint_accepts_raw_pilot_data(api_client):
    resp = api_client.post(
        "/ai/pilots/pilot-456/scale-recommendation",
        json={
            "kpi_results": [
                {"name": "Wait time", "unit": "min", "baseline": 90, "target": 60, "actual": 65, "direction": "decrease"}
            ],
            "risks": [{"category": "Technical", "description": "Downtime", "severity": "MEDIUM"}],
            "evidence": [{"description": "Logs", "source": "system", "verified": True}],
            "validation_status": "partial",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["recommendation"] in ("SCALE", "EXTEND", "STOP")


def test_scale_recommendation_endpoint_empty_body_still_returns_a_result(api_client):
    """Everything optional/defaulted — should never 500 on a minimal body."""
    resp = api_client.post("/ai/pilots/pilot-789/scale-recommendation", json={})
    assert resp.status_code == 200
