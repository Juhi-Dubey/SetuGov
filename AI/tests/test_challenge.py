from __future__ import annotations
from unittest.mock import AsyncMock

import pytest

from schemas.requests import (
    ChallengeCopilotRequest,
    KPIInput,
    MeasurementContext,
    OutcomeContext,
    PilotContext,
    ProblemContext,
    RequirementsContext,
)
from schemas.responses import ChallengeCopilotResponse, ReadinessScore, SuggestedKPI
from services.ai_service import AIService
from services.decision_engine import DecisionEngine
from services.ollama_client import InvalidAIResponseError, OllamaClient


# ═══════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════


def _full_request() -> ChallengeCopilotRequest:
    """A complete challenge request with all fields populated."""
    return ChallengeCopilotRequest(
        problem=ProblemContext(
            title="Long patient waiting times in government hospitals",
            description=(
                "Patients in government hospitals experience waiting times "
                "averaging 90 minutes before receiving service, leading to "
                "overcrowding, patient dissatisfaction, and delayed treatment."
            ),
            current_process="Manual token-based queue system with paper registers",
            baseline="Average waiting time: 90 minutes",
            location="Maharashtra, India",
        ),
        outcome=OutcomeContext(
            desired_outcome="Reduce patient waiting time significantly",
            success_definition="Measurable reduction in average waiting time with improved patient satisfaction",
        ),
        measurement=MeasurementContext(
            kpis=[
                KPIInput(
                    name="Average Waiting Time",
                    description="Time from registration to consultation",
                    unit="minutes",
                    baseline=90,
                    target=60,
                    direction="decrease",
                    measurement_method="Digital timestamp tracking",
                    weight=40,
                ),
                KPIInput(
                    name="Patient Throughput",
                    description="Patients served per day",
                    unit="patients/day",
                    baseline=100,
                    target=130,
                    direction="increase",
                    measurement_method="System counter",
                    weight=30,
                ),
                KPIInput(
                    name="Patient Satisfaction",
                    description="Post-visit satisfaction score",
                    unit="percentage",
                    baseline=60,
                    target=80,
                    direction="increase",
                    measurement_method="Survey",
                    weight=30,
                ),
            ]
        ),
        pilot=PilotContext(
            duration="60 days",
            sites=["District Hospital A", "District Hospital B"],
            budget="₹4,00,000",
        ),
        requirements=RequirementsContext(
            technologies=["queue management", "workflow automation"],
            domain="Healthcare",
            eligibility=["DPIIT registered"],
            documents=["Company registration", "Technical proposal"],
        ),
    )


def _minimal_request() -> ChallengeCopilotRequest:
    """Minimal request — only required fields."""
    return ChallengeCopilotRequest(
        problem=ProblemContext(
            title="Long waiting times",
            description="Patients wait too long in hospitals.",
        ),
    )


# ═══════════════════════════════════════════════════════════════════════════
# Readiness Score Tests (Deterministic)
# ═══════════════════════════════════════════════════════════════════════════


class TestReadinessScore:
    """Readiness scoring is deterministic — no LLM needed."""

    def test_full_request_high_score(self):
        request = _full_request()
        score = DecisionEngine.calculate_readiness(request)
        assert isinstance(score, ReadinessScore)
        assert score.score > 70, f"Full request should score > 70, got {score.score}"
        assert score.problem_clarity > 0
        assert score.baseline_completeness > 0
        assert score.outcome_measurability > 0
        assert score.kpi_completeness > 0
        assert score.pilot_readiness > 0
        assert score.requirements_clarity > 0
        assert score.evidence_planning > 0

    def test_minimal_request_low_score(self):
        request = _minimal_request()
        score = DecisionEngine.calculate_readiness(request)
        assert score.score < 30, f"Minimal request should score < 30, got {score.score}"
        assert score.baseline_completeness == 0
        assert score.outcome_measurability == 0
        assert score.kpi_completeness == 0
        assert score.pilot_readiness == 0
        assert score.requirements_clarity == 0

    def test_score_is_reproducible(self):
        request = _full_request()
        score1 = DecisionEngine.calculate_readiness(request)
        score2 = DecisionEngine.calculate_readiness(request)
        assert score1.score == score2.score
        assert score1.model_dump() == score2.model_dump()

    def test_score_max_is_100(self):
        request = _full_request()
        score = DecisionEngine.calculate_readiness(request)
        assert score.score <= 100.0

    def test_missing_baseline_zero_baseline_score(self):
        request = ChallengeCopilotRequest(
            problem=ProblemContext(
                title="Long waiting times",
                description="Patients wait too long in government hospitals.",
                baseline=None,  # Explicitly missing
            ),
        )
        score = DecisionEngine.calculate_readiness(request)
        assert score.baseline_completeness == 0.0

    def test_unmeasured_baseline_text_scores_zero(self):
        """Phrases indicating absent or unmeasured baselines must award 0 points."""
        request = ChallengeCopilotRequest(
            problem=ProblemContext(
                title="Long waiting times",
                description="Patients wait too long in government hospitals.",
                baseline="Average waiting time is currently not consistently measured.",
            ),
        )
        score = DecisionEngine.calculate_readiness(request)
        assert score.baseline_completeness == 0.0

    def test_measurable_baseline_text_scores_eight_points(self):
        """Measurable problem baseline awards 8 points."""
        request = ChallengeCopilotRequest(
            problem=ProblemContext(
                title="Long waiting times",
                description="Patients wait too long in government hospitals.",
                baseline="Average waiting time: 90 minutes",
            ),
        )
        score = DecisionEngine.calculate_readiness(request)
        assert score.baseline_completeness == 8.0

    def test_component_weights_sum_to_100(self):
        """Individual component max values must sum to 100."""
        request = _full_request()
        score = DecisionEngine.calculate_readiness(request)
        max_sum = 20 + 15 + 20 + 20 + 10 + 10 + 5
        assert max_sum == 100


# ═══════════════════════════════════════════════════════════════════════════
# KPI Weight Validation Tests
# ═══════════════════════════════════════════════════════════════════════════


class TestKPIWeightValidation:

    def test_valid_weights(self):
        assert DecisionEngine.validate_kpi_weights([40, 30, 30]) is True

    def test_invalid_weights(self):
        assert DecisionEngine.validate_kpi_weights([40, 30, 20]) is False

    def test_empty_weights(self):
        assert DecisionEngine.validate_kpi_weights([]) is True

    def test_normalize_weights(self):
        normalized = DecisionEngine.normalize_kpi_weights([40, 30, 20])
        assert abs(sum(normalized) - 100.0) < 0.01

    def test_normalize_already_valid(self):
        normalized = DecisionEngine.normalize_kpi_weights([40, 30, 30])
        assert abs(sum(normalized) - 100.0) < 0.01


# ═══════════════════════════════════════════════════════════════════════════
# Challenge Response Parsing Tests
# ═══════════════════════════════════════════════════════════════════════════


class TestChallengeResponseParsing:

    def test_parse_valid_response(self):
        raw = {
            "problem_summary": "Patients face long waiting times.",
            "stakeholders": ["Patients", "Hospital staff"],
            "root_cause_hypotheses": ["Manual processes cause delays"],
            "desired_outcome": "Reduce waiting time",
            "success_definition": "Waiting time below 60 minutes",
            "suggested_kpis": [
                {
                    "name": "Average Waiting Time",
                    "description": "Time to consultation",
                    "unit": "minutes",
                    "baseline": None,
                    "target": 60,
                    "direction": "decrease",
                    "measurement_method": "Digital tracking",
                    "suggested_weight": 50,
                    "reason": "Primary metric",
                }
            ],
            "technology_categories": ["queue management"],
            "domain": "Healthcare",
            "missing_information": ["Baseline data not provided"],
            "assumptions": [],
            "warnings": [],
        }
        response = AIService._parse_challenge_response(raw)
        assert isinstance(response, ChallengeCopilotResponse)
        assert response.problem_summary == "Patients face long waiting times."
        assert len(response.suggested_kpis) == 1
        assert response.suggested_kpis[0].baseline is None  # Not invented

    def test_parse_minimal_response(self):
        raw = {"problem_summary": "Test"}
        response = AIService._parse_challenge_response(raw)
        assert response.problem_summary == "Test"
        assert response.suggested_kpis == []

    def test_parse_missing_summary_uses_default(self):
        raw = {}
        response = AIService._parse_challenge_response(raw)
        assert response.problem_summary == "No summary provided."

    def test_missing_baseline_is_null(self):
        """Baseline must remain null when not supplied — never invented."""
        raw = {
            "problem_summary": "Test",
            "suggested_kpis": [
                {
                    "name": "Test KPI",
                    "description": "Test",
                    "baseline": None,
                    "suggested_weight": 100,
                    "reason": "Only KPI",
                }
            ],
        }
        response = AIService._parse_challenge_response(raw)
        assert response.suggested_kpis[0].baseline is None


# ═══════════════════════════════════════════════════════════════════════════
# User Authority Model Tests (Reconciliation)
# ═══════════════════════════════════════════════════════════════════════════


class TestUserAuthorityModel:
    """Explicit user-provided fields are authoritative and must be preserved."""

    def test_user_kpi_weight_preserved(self):
        request = ChallengeCopilotRequest(
            problem=ProblemContext(
                title="Long waiting times",
                description="Patients wait too long in hospitals.",
            ),
            measurement=MeasurementContext(
                kpis=[
                    KPIInput(
                        name="Average Waiting Time",
                        unit="minutes",
                        baseline=90,
                        target=60,
                        weight=40,
                    )
                ]
            ),
        )
        # LLM returns different weight (100) and different baseline (500)
        raw_llm = {
            "problem_summary": "Summary",
            "suggested_kpis": [
                {
                    "name": "Average Waiting Time",
                    "description": "Consultation wait time",
                    "unit": "minutes",
                    "baseline": 500,
                    "target": 30,
                    "suggested_weight": 100,
                    "reason": "Primary metric",
                }
            ],
        }
        response = AIService._parse_challenge_response(raw_llm, request=request)
        assert len(response.suggested_kpis) == 1
        kpi = response.suggested_kpis[0]
        assert kpi.suggested_weight == 40.0
        assert kpi.baseline == 90.0
        assert kpi.target == 60.0

    def test_user_pilot_sites_preserved(self):
        request = ChallengeCopilotRequest(
            problem=ProblemContext(
                title="Long waiting times",
                description="Patients wait too long in hospitals.",
            ),
            pilot=PilotContext(
                duration="60 days",
                sites=["District Hospital A", "District Hospital B"],
                budget="₹4,00,000",
            ),
        )
        raw_llm = {
            "problem_summary": "Summary",
            "pilot_recommendation": {
                "suggested_duration": "120 days",
                "suggested_sites": ["Government hospitals in Maharashtra"],
                "suggested_budget_considerations": "₹10,00,000",
                "rationale": "Expanded scope",
            },
        }
        response = AIService._parse_challenge_response(raw_llm, request=request)
        assert response.pilot_recommendation is not None
        assert response.pilot_recommendation.suggested_sites == [
            "District Hospital A",
            "District Hospital B",
        ]
        assert response.pilot_recommendation.suggested_duration == "60 days"
        assert response.pilot_recommendation.suggested_budget_considerations == "₹4,00,000"

    def test_user_domain_technologies_and_documents_preserved(self):
        request = ChallengeCopilotRequest(
            problem=ProblemContext(
                title="Long waiting times",
                description="Patients wait too long in hospitals.",
            ),
            requirements=RequirementsContext(
                technologies=["queue management", "workflow automation"],
                domain="Healthcare",
                eligibility=["DPIIT registered"],
                documents=["Company registration", "Technical proposal"],
            ),
        )
        raw_llm = {
            "problem_summary": "Summary",
            "technology_categories": ["blockchain", "IoT"],
            "domain": "General Administration",
            "eligibility_considerations": ["Must have 10 years experience"],
            "suggested_documents": ["Financial audit", "Company registration"],
        }
        response = AIService._parse_challenge_response(raw_llm, request=request)
        assert response.domain == "Healthcare"
        assert response.technology_categories == ["queue management", "workflow automation"]
        assert response.eligibility_considerations == ["DPIIT registered"]
        assert "Company registration" in response.suggested_documents
        assert "Technical proposal" in response.suggested_documents

    def test_user_outcome_preserved(self):
        request = ChallengeCopilotRequest(
            problem=ProblemContext(
                title="Long waiting times",
                description="Patients wait too long in hospitals.",
            ),
            outcome=OutcomeContext(
                desired_outcome="Reduce patient waiting time significantly",
                success_definition="Waiting time below 60 minutes",
            ),
        )
        raw_llm = {
            "problem_summary": "Summary",
            "desired_outcome": "AI suggested outcome",
            "success_definition": "AI suggested definition",
        }
        response = AIService._parse_challenge_response(raw_llm, request=request)
        assert response.desired_outcome == "Reduce patient waiting time significantly"
        assert response.success_definition == "Waiting time below 60 minutes"

    def test_ai_suggestions_used_when_user_fields_missing(self):
        request = _minimal_request()
        raw_llm = {
            "problem_summary": "Summary",
            "desired_outcome": "Reduce waiting time",
            "success_definition": "Waiting time below 60 minutes",
            "suggested_kpis": [
                {
                    "name": "Average Waiting Time",
                    "description": "Time to consultation",
                    "unit": "minutes",
                    "baseline": 120,  # AI invented baseline
                    "target": 60,
                    "direction": "decrease",
                    "suggested_weight": 100,
                }
            ],
            "pilot_recommendation": {
                "suggested_duration": "60 days",
                "suggested_sites": ["District Hospital Pune"],
            },
            "technology_categories": ["queue management"],
            "domain": "Healthcare",
        }
        response = AIService._parse_challenge_response(raw_llm, request=request)
        assert response.desired_outcome == "Reduce waiting time"
        assert response.domain == "Healthcare"
        assert response.technology_categories == ["queue management"]
        assert len(response.suggested_kpis) == 1
        # AI cannot invent a baseline number — it must remain None
        assert response.suggested_kpis[0].baseline is None

    def test_missing_baseline_remains_null(self):
        request = ChallengeCopilotRequest(
            problem=ProblemContext(
                title="Long waiting times",
                description="Patients wait too long.",
                baseline=None,
            ),
            measurement=MeasurementContext(
                kpis=[
                    KPIInput(
                        name="Average Waiting Time",
                        unit="minutes",
                        baseline=None,
                        target=60,
                    )
                ]
            ),
        )
        raw_llm = {
            "problem_summary": "Summary",
            "suggested_kpis": [
                {
                    "name": "Average Waiting Time",
                    "description": "Test",
                    "baseline": 90,  # Hallucinated by LLM
                }
            ],
        }
        response = AIService._parse_challenge_response(raw_llm, request=request)
        assert response.suggested_kpis[0].baseline is None

    def test_root_cause_hypotheses_framed_as_hypotheses(self):
        request = _minimal_request()
        raw_llm = {
            "problem_summary": "Summary",
            "root_cause_hypotheses": [
                "Manual token system causes delays",
                "Insufficient staffing may contribute to peak hour backlogs",
            ],
        }
        response = AIService._parse_challenge_response(raw_llm, request=request)
        assert len(response.root_cause_hypotheses) == 2
        # First one had no hypothesis keyword -> framed as hypothesis
        assert "hypothesis" in response.root_cause_hypotheses[0].lower()
        # Second one already had 'may contribute' -> kept
        assert "may contribute" in response.root_cause_hypotheses[1].lower()

    def test_partial_user_weights_summing_less_than_100_does_not_warn(self):
        """Partial user weights (<100%) when other KPIs are undefined must not trigger an invalid warning."""
        request = ChallengeCopilotRequest(
            problem=ProblemContext(
                title="Long waiting times",
                description="Patients wait too long.",
            ),
            measurement=MeasurementContext(
                kpis=[
                    KPIInput(name="Average Waiting Time", weight=40),
                ]
            ),
        )
        raw_llm = {
            "problem_summary": "Summary",
            "suggested_kpis": [
                {"name": "Average Waiting Time", "suggested_weight": 100},
            ],
        }
        response = AIService._parse_challenge_response(raw_llm, request=request)
        assert len(response.suggested_kpis) == 1
        assert response.suggested_kpis[0].suggested_weight == 40.0
        # No warning about weights being invalid
        assert not any("weights sum to" in w for w in response.warnings)

    def test_user_weights_exceeding_100_produces_warning(self):
        """User weights exceeding 100% must be preserved and trigger an exceedance warning."""
        request = ChallengeCopilotRequest(
            problem=ProblemContext(
                title="Long waiting times",
                description="Patients wait too long.",
            ),
            measurement=MeasurementContext(
                kpis=[
                    KPIInput(name="KPI 1", weight=50),
                    KPIInput(name="KPI 2", weight=40),
                    KPIInput(name="KPI 3", weight=30),  # sum = 120
                ]
            ),
        )
        raw_llm = {
            "problem_summary": "Summary",
            "suggested_kpis": [
                {"name": "KPI 1", "suggested_weight": 33},
                {"name": "KPI 2", "suggested_weight": 33},
                {"name": "KPI 3", "suggested_weight": 34},
            ],
        }
        response = AIService._parse_challenge_response(raw_llm, request=request)
        weights = [k.suggested_weight for k in response.suggested_kpis]
        assert weights == [50.0, 40.0, 30.0]
        # Exceedance warning must be present
        assert any("exceeds 100%" in w for w in response.warnings)

    def test_evidence_aware_assumptions(self):
        """Assumptions must be evidence-aware and express uncertainty."""
        request = _minimal_request()
        raw_llm = {
            "problem_summary": "Summary",
            "assumptions": [
                "Effective implementation of queue management and workflow automation",
                "Assumes operational readiness of hospital staff",
            ],
        }
        response = AIService._parse_challenge_response(raw_llm, request=request)
        assert len(response.assumptions) == 2
        # First assumption framed as conditional / subject to validation
        assert "subject to" in response.assumptions[0].lower() or "assumes" in response.assumptions[0].lower()
        # Second assumption kept its assumption phrasing
        assert "assumes" in response.assumptions[1].lower()

    def test_pilot_rationale_supports_user_scope_and_labels_alternatives(self):
        """Pilot rationale must support user scope and clearly label alternative suggestions."""
        request = ChallengeCopilotRequest(
            problem=ProblemContext(
                title="Long waiting times",
                description="Patients wait too long.",
            ),
            pilot=PilotContext(
                duration="60 days",
                sites=["District Hospital A", "District Hospital B"],
            ),
        )
        raw_llm = {
            "problem_summary": "Summary",
            "pilot_recommendation": {
                "suggested_duration": "30 days",
                "suggested_sites": ["Single clinic"],
                "rationale": "Shorten pilot duration and sites to test core hypothesis",
            },
        }
        response = AIService._parse_challenge_response(raw_llm, request=request)
        assert response.pilot_recommendation is not None
        assert response.pilot_recommendation.suggested_duration == "60 days"
        assert response.pilot_recommendation.suggested_sites == ["District Hospital A", "District Hospital B"]
        # Rationale must justify the user's scope and label the LLM's reduction as optional alternative
        assert "60 days" in response.pilot_recommendation.rationale
        assert "[Optional Alternative Suggestion]" in response.pilot_recommendation.rationale


# ═══════════════════════════════════════════════════════════════════════════
# AIService Async End-to-End Tests (Mocked LLM)
# ═══════════════════════════════════════════════════════════════════════════


class TestAIServiceAnalyzeChallengeAsync:
    """Test full async execution of AIService.analyze_challenge with mocked LLM."""

    @pytest.mark.asyncio
    async def test_analyze_challenge_reconciliation(self):
        request = _full_request()

        raw_llm = {
            "problem_summary": "Government hospitals suffer from severe queue congestion.",
            "stakeholders": ["Patients", "Nurses", "Doctors"],
            "root_cause_hypotheses": ["Paper register workflow is bottlenecked"],
            "desired_outcome": "LLM outcome",
            "success_definition": "LLM success def",
            "suggested_kpis": [
                {
                    "name": "Average Waiting Time",
                    "description": "AI desc",
                    "baseline": 500,
                    "target": 30,
                    "suggested_weight": 100,
                    "reason": "AI reason",
                }
            ],
            "pilot_recommendation": {
                "suggested_duration": "90 days",
                "suggested_sites": ["Statewide"],
                "suggested_budget_considerations": "₹15,00,000",
                "rationale": "Wider rollout",
            },
            "technology_categories": ["blockchain"],
            "domain": "Administration",
            "eligibility_considerations": ["Generic"],
            "suggested_documents": ["Tax returns"],
            "missing_information": [],
            "assumptions": ["Stable power"],
            "warnings": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.analyze_challenge(request)

        assert isinstance(response, ChallengeCopilotResponse)
        # User outcome preserved
        assert response.desired_outcome == request.outcome.desired_outcome
        # User pilot sites preserved
        assert response.pilot_recommendation.suggested_sites == request.pilot.sites
        assert response.pilot_recommendation.suggested_duration == request.pilot.duration
        assert response.pilot_recommendation.suggested_budget_considerations == request.pilot.budget
        # User KPIs preserved
        assert len(response.suggested_kpis) == 3
        assert response.suggested_kpis[0].suggested_weight == 40.0
        assert response.suggested_kpis[0].baseline == 90.0
        assert response.suggested_kpis[0].target == 60.0
        # Deterministic readiness attached
        assert response.readiness is not None
        assert response.readiness.score > 70

