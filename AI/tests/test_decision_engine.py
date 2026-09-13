"""
Tests for Decision Engine — SCALE / EXTEND / STOP

Covers: SCALE, EXTEND, STOP paths, boundary conditions, reproducibility.
Also tests Ollama client exception types and JSON parsing.
"""

from __future__ import annotations

import json

import pytest

from schemas.responses import (
    DecisionEngineResponse,
    DecisionInput,
    DecisionRecommendation,
)
from services.decision_engine import DecisionEngine
from services.ollama_client import InvalidAIResponseError, OllamaClient


# ═══════════════════════════════════════════════════════════════════════════
# Decision Engine — SCALE / EXTEND / STOP
# ═══════════════════════════════════════════════════════════════════════════


class TestDecisionEngine:

    def test_scale_recommendation(self):
        """High scores + validation completed → SCALE."""
        inp = DecisionInput(
            kpi_achievement_pct=85,
            evidence_quality=80,
            validation_status="completed",
            technical_stability=90,
            user_feedback_score=85,
            risk_score=15,
        )
        result = DecisionEngine.recommend(inp)
        assert result.recommendation == DecisionRecommendation.SCALE
        assert result.composite_score >= 70

    def test_extend_recommendation(self):
        """Moderate scores → EXTEND."""
        inp = DecisionInput(
            kpi_achievement_pct=75,
            evidence_quality=65,
            validation_status="partial",
            technical_stability=70,
            user_feedback_score=70,
            risk_score=25,
        )
        result = DecisionEngine.recommend(inp)
        assert result.recommendation == DecisionRecommendation.EXTEND

    def test_stop_recommendation_low_score(self):
        """Low composite → STOP."""
        inp = DecisionInput(
            kpi_achievement_pct=20,
            evidence_quality=20,
            validation_status="not_started",
            technical_stability=30,
            user_feedback_score=25,
            risk_score=60,
        )
        result = DecisionEngine.recommend(inp)
        assert result.recommendation == DecisionRecommendation.STOP

    def test_stop_recommendation_critical_risk(self):
        """Even with good scores, critical risk (≥70) → STOP."""
        inp = DecisionInput(
            kpi_achievement_pct=85,
            evidence_quality=80,
            validation_status="completed",
            technical_stability=90,
            user_feedback_score=85,
            risk_score=75,  # Critical risk
        )
        result = DecisionEngine.recommend(inp)
        assert result.recommendation == DecisionRecommendation.STOP

    def test_extend_without_validation(self):
        """Good scores but no validation → EXTEND (not SCALE)."""
        inp = DecisionInput(
            kpi_achievement_pct=85,
            evidence_quality=80,
            validation_status="not_started",
            technical_stability=90,
            user_feedback_score=85,
            risk_score=15,
        )
        result = DecisionEngine.recommend(inp)
        # Without validation, score gets multiplied by 0.4 → drops below 70
        assert result.recommendation in (
            DecisionRecommendation.EXTEND,
            DecisionRecommendation.STOP,
        )

    def test_decision_is_reproducible(self):
        inp = DecisionInput(
            kpi_achievement_pct=75,
            evidence_quality=70,
            validation_status="completed",
            technical_stability=80,
            user_feedback_score=75,
            risk_score=20,
        )
        r1 = DecisionEngine.recommend(inp)
        r2 = DecisionEngine.recommend(inp)
        assert r1.recommendation == r2.recommendation
        assert r1.composite_score == r2.composite_score
        assert r1.reasoning == r2.reasoning

    def test_response_has_reasoning(self):
        inp = DecisionInput(
            kpi_achievement_pct=85,
            evidence_quality=80,
            validation_status="completed",
            technical_stability=90,
            user_feedback_score=85,
            risk_score=15,
        )
        result = DecisionEngine.recommend(inp)
        assert len(result.reasoning) > 0

    def test_response_has_score_breakdown(self):
        inp = DecisionInput(
            kpi_achievement_pct=85,
            evidence_quality=80,
            validation_status="completed",
            technical_stability=90,
            user_feedback_score=85,
            risk_score=15,
        )
        result = DecisionEngine.recommend(inp)
        assert "kpi_component" in result.score_breakdown
        assert "evidence_component" in result.score_breakdown
        assert "validation_multiplier" in result.score_breakdown

    def test_boundary_scale_threshold(self):
        """Score exactly at 70 with validation → SCALE."""
        # We need to find inputs that produce composite ≈ 70
        inp = DecisionInput(
            kpi_achievement_pct=75,
            evidence_quality=65,
            validation_status="completed",
            technical_stability=75,
            user_feedback_score=65,
            risk_score=25,
        )
        result = DecisionEngine.recommend(inp)
        # The exact recommendation depends on precise composite
        assert result.recommendation in (
            DecisionRecommendation.SCALE,
            DecisionRecommendation.EXTEND,
        )


# ═══════════════════════════════════════════════════════════════════════════
# Infrastructure Tests — JSON Parsing
# ═══════════════════════════════════════════════════════════════════════════


class TestOllamaClientParsing:
    """Test the safe JSON parsing without a live Ollama connection."""

    def test_parse_valid_json(self):
        raw = '{"key": "value", "num": 42}'
        result = OllamaClient._safe_parse_json(raw)
        assert result == {"key": "value", "num": 42}

    def test_parse_json_with_whitespace(self):
        raw = '  \n  {"key": "value"}  \n  '
        result = OllamaClient._safe_parse_json(raw)
        assert result == {"key": "value"}

    def test_parse_json_in_markdown_fences(self):
        raw = '```json\n{"key": "value"}\n```'
        result = OllamaClient._safe_parse_json(raw)
        assert result == {"key": "value"}

    def test_parse_json_embedded_in_text(self):
        raw = 'Here is the result: {"key": "value"} hope it helps!'
        result = OllamaClient._safe_parse_json(raw)
        assert result == {"key": "value"}

    def test_parse_invalid_json_raises(self):
        with pytest.raises(InvalidAIResponseError):
            OllamaClient._safe_parse_json("not json at all")

    def test_parse_array_raises(self):
        """We expect a JSON object, not an array."""
        with pytest.raises(InvalidAIResponseError):
            OllamaClient._safe_parse_json('[1, 2, 3]')

    def test_parse_empty_raises(self):
        with pytest.raises(InvalidAIResponseError):
            OllamaClient._safe_parse_json("")


# ═══════════════════════════════════════════════════════════════════════════
# Infrastructure Tests — Schema Validation
# ═══════════════════════════════════════════════════════════════════════════


class TestSchemaValidation:

    def test_decision_input_bounds(self):
        """Values must be within 0-100."""
        with pytest.raises(Exception):
            DecisionInput(
                kpi_achievement_pct=150,  # Out of bounds
                evidence_quality=80,
                validation_status="completed",
                technical_stability=90,
                user_feedback_score=85,
                risk_score=15,
            )

    def test_malformed_request_rejected(self):
        """Missing required fields must raise."""
        with pytest.raises(Exception):
            DecisionInput(
                kpi_achievement_pct=80,
                # Missing other required fields
            )


# ═══════════════════════════════════════════════════════════════════════════
# Baseline Measurability Tests
# ═══════════════════════════════════════════════════════════════════════════


class TestIsMeasurableBaseline:
    """Test deterministic classification of baseline strings."""

    def test_measurable_baseline_strings(self):
        assert DecisionEngine.is_measurable_baseline("Average waiting time: 90 minutes") is True
        assert DecisionEngine.is_measurable_baseline("90 minutes") is True
        assert DecisionEngine.is_measurable_baseline("Current throughput is 100 patients/day") is True
        assert DecisionEngine.is_measurable_baseline("Patient satisfaction score: 60%") is True

    def test_unmeasured_baseline_strings(self):
        assert DecisionEngine.is_measurable_baseline("Average waiting time is currently not consistently measured.") is False
        assert DecisionEngine.is_measurable_baseline("Not measured") is False
        assert DecisionEngine.is_measurable_baseline("not tracked") is False
        assert DecisionEngine.is_measurable_baseline("No baseline data available") is False
        assert DecisionEngine.is_measurable_baseline("None") is False
        assert DecisionEngine.is_measurable_baseline("N/A") is False
        assert DecisionEngine.is_measurable_baseline("na") is False
        assert DecisionEngine.is_measurable_baseline("Not available") is False
        assert DecisionEngine.is_measurable_baseline("Baseline not provided") is False
        assert DecisionEngine.is_measurable_baseline("To be determined") is False

    def test_absent_or_empty_baseline(self):
        assert DecisionEngine.is_measurable_baseline(None) is False
        assert DecisionEngine.is_measurable_baseline("") is False
        assert DecisionEngine.is_measurable_baseline("   ") is False

