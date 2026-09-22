"""
Tests for Risk Analysis: the LLM identifies risks (open-ended), Python is
the sole authority on the resulting severity counts and overall score.
"""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

import main
from providers.base import AIProvider
from schemas.requests import RiskAnalysisRequest
from services.ai_service import AIService
from services.decision_engine import DecisionEngine
from services.parsers.risk_analysis_parser import parse_risk_analysis_response


# ═══════════════════════════════════════════════════════════════════════════
# Deterministic counting/scoring
# ═══════════════════════════════════════════════════════════════════════════


class TestRiskSummarization:
    def test_counts_and_score_from_mixed_severities(self):
        raw = {
            "risks": [
                {"category": "Security", "description": "Data breach exposure", "severity": "HIGH", "probability": "LOW"},
                {"category": "Financial", "description": "Cost overrun", "severity": "MEDIUM", "probability": "MEDIUM"},
                {"category": "Legal/Compliance", "description": "Procurement rule gap", "severity": "LOW", "probability": "LOW"},
            ]
        }
        response = parse_risk_analysis_response(raw)
        assert response.high_risk_count == 1
        assert response.medium_risk_count == 1
        assert response.low_risk_count == 1
        assert response.overall_risk_score == 30 + 12 + 5

    def test_score_caps_at_100(self):
        raw = {
            "risks": [
                {"category": "X", "description": f"Risk {i}", "severity": "HIGH", "probability": "HIGH"}
                for i in range(5)
            ]
        }
        response = parse_risk_analysis_response(raw)
        assert response.overall_risk_score == 100.0

    def test_invalid_severity_coerced_to_medium_not_dropped(self):
        raw = {
            "risks": [
                {"category": "X", "description": "Weird severity", "severity": "URGENT", "probability": "LOW"},
            ]
        }
        response = parse_risk_analysis_response(raw)
        assert len(response.risks) == 1
        assert response.risks[0].severity.value == "MEDIUM"

    def test_risk_with_no_description_is_dropped(self):
        raw = {"risks": [{"category": "X", "description": "", "severity": "HIGH"}]}
        response = parse_risk_analysis_response(raw)
        assert response.risks == []
        assert response.overall_risk_score == 0.0

    def test_missing_risks_key_produces_empty_list_not_error(self):
        response = parse_risk_analysis_response({})
        assert response.risks == []
        assert response.overall_risk_score == 0.0

    def test_llm_cannot_smuggle_its_own_score(self):
        """Even if the raw payload includes a fabricated top-level score, it's ignored."""
        raw = {
            "risks": [
                {"category": "X", "description": "One risk", "severity": "LOW", "probability": "LOW"},
            ],
            "overall_risk_score": 999,  # attempted override — must be ignored
            "high_risk_count": 999,
        }
        response = parse_risk_analysis_response(raw)
        assert response.overall_risk_score == 5.0
        assert response.high_risk_count == 0


# ═══════════════════════════════════════════════════════════════════════════
# End-to-end via AIService with a mocked provider
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_analyze_risks_calls_llm_and_computes_counts():
    mock_provider = AsyncMock(spec=AIProvider)
    mock_provider.generate_json.return_value = {
        "risks": [
            {"category": "Technical", "description": "Integration risk", "severity": "HIGH", "probability": "MEDIUM", "mitigation_suggestion": "Phased rollout"},
        ]
    }
    service = AIService(ai_provider=mock_provider)

    request = RiskAnalysisRequest(challenge_title="Queue management", proposal_summary="Sensor network")
    result = await service.analyze_risks(request)

    mock_provider.generate_json.assert_called_once()
    assert result.high_risk_count == 1
    assert result.overall_risk_score == 30.0
    assert result.risks[0].mitigation_suggestion == "Phased rollout"


@pytest.mark.asyncio
async def test_analyze_risks_works_with_no_context_at_all():
    mock_provider = AsyncMock(spec=AIProvider)
    mock_provider.generate_json.return_value = {"risks": []}
    service = AIService(ai_provider=mock_provider)

    request = RiskAnalysisRequest()
    result = await service.analyze_risks(request)
    assert result.risks == []


# ═══════════════════════════════════════════════════════════════════════════
# API endpoint
# ═══════════════════════════════════════════════════════════════════════════


@pytest.fixture
def api_client():
    with TestClient(main.app, raise_server_exceptions=False) as client:
        yield client


def test_risk_analysis_endpoint(api_client):
    resp = api_client.post(
        "/ai/risks/analyze",
        json={"challenge_title": "Queue management", "proposal_summary": "Sensor-based system"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert "risks" in body["data"]
    assert "overall_risk_score" in body["data"]
    assert "advisory_notice" in body["data"]


def test_risk_analysis_endpoint_accepts_empty_body(api_client):
    resp = api_client.post("/ai/risks/analyze", json={})
    assert resp.status_code == 200
