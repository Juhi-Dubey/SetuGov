from __future__ import annotations

from unittest.mock import AsyncMock
# pyrefly: ignore [missing-import]
import pytest

from schemas.requests import (
    KPIResult,
    MilestoneResult,
    PilotEvidence,
    PilotIntelligenceRequest,
    PilotRisk,
)
from schemas.responses import KPIAnalysis, KPIStatus, PilotIntelligenceResponse
from services.ai_service import AIService
from services.decision_engine import DecisionEngine
from services.ollama_client import OllamaClient
from prompts.pilot_intelligence import build_pilot_prompt


# ═══════════════════════════════════════════════════════════════════════════
# KPI Status Calculation
# ═══════════════════════════════════════════════════════════════════════════


class TestKPIStatusCalculation:

    def test_on_target_decrease(self):
        """Baseline=90, Target=60, Actual=54 → exceeded target → ON_TARGET."""
        kpi = KPIResult(
            name="Waiting Time",
            unit="minutes",
            baseline=90,
            target=60,
            actual=54,
            direction="decrease",
        )
        result = DecisionEngine.calculate_kpi_status(kpi)
        assert result.status == KPIStatus.ON_TARGET
        assert result.target_achievement_pct is not None
        assert result.target_achievement_pct >= 90
        # Improvement: (90 - 54) / 90 = 40%
        assert abs(result.improvement_pct - 40.0) < 0.1

    def test_on_target_increase(self):
        """Baseline=100, Target=130, Actual=128 → 93.3% → ON_TARGET."""
        kpi = KPIResult(
            name="Throughput",
            unit="patients/day",
            baseline=100,
            target=130,
            actual=128,
            direction="increase",
        )
        result = DecisionEngine.calculate_kpi_status(kpi)
        assert result.status == KPIStatus.ON_TARGET
        assert result.target_achievement_pct is not None
        assert result.target_achievement_pct >= 90

    def test_near_target(self):
        """Baseline=90, Target=60, Actual=70 → 66.7% → NEAR_TARGET."""
        kpi = KPIResult(
            name="Waiting Time",
            baseline=90,
            target=60,
            actual=70,
            direction="decrease",
        )
        result = DecisionEngine.calculate_kpi_status(kpi)
        assert result.status == KPIStatus.NEAR_TARGET
        assert result.target_achievement_pct is not None
        assert 60 <= result.target_achievement_pct < 90

    def test_below_target(self):
        """Baseline=90, Target=60, Actual=85 → 16.7% → BELOW_TARGET."""
        kpi = KPIResult(
            name="Waiting Time",
            baseline=90,
            target=60,
            actual=85,
            direction="decrease",
        )
        result = DecisionEngine.calculate_kpi_status(kpi)
        assert result.status == KPIStatus.BELOW_TARGET
        assert result.target_achievement_pct is not None
        assert result.target_achievement_pct < 60

    def test_insufficient_data_missing_actual(self):
        kpi = KPIResult(
            name="Waiting Time",
            baseline=90,
            target=60,
            actual=None,
            direction="decrease",
        )
        result = DecisionEngine.calculate_kpi_status(kpi)
        assert result.status == KPIStatus.INSUFFICIENT_DATA
        assert result.improvement_pct is None
        assert result.target_achievement_pct is None

    def test_insufficient_data_missing_baseline(self):
        kpi = KPIResult(
            name="Waiting Time",
            baseline=None,
            target=60,
            actual=54,
            direction="decrease",
        )
        result = DecisionEngine.calculate_kpi_status(kpi)
        assert result.status == KPIStatus.INSUFFICIENT_DATA

    def test_insufficient_data_missing_target(self):
        kpi = KPIResult(
            name="Waiting Time",
            baseline=90,
            target=None,
            actual=54,
            direction="decrease",
        )
        result = DecisionEngine.calculate_kpi_status(kpi)
        assert result.status == KPIStatus.INSUFFICIENT_DATA

    def test_kpi_calculation_is_deterministic(self):
        kpi = KPIResult(
            name="Waiting Time",
            baseline=90,
            target=60,
            actual=54,
            direction="decrease",
        )
        r1 = DecisionEngine.calculate_kpi_status(kpi)
        r2 = DecisionEngine.calculate_kpi_status(kpi)
        assert r1.status == r2.status
        assert r1.improvement_pct == r2.improvement_pct
        assert r1.target_achievement_pct == r2.target_achievement_pct

    def test_exceeded_target_still_on_target(self):
        """If actual exceeds the target, status is still ON_TARGET (≥100%)."""
        kpi = KPIResult(
            name="Throughput",
            baseline=100,
            target=130,
            actual=150,
            direction="increase",
        )
        result = DecisionEngine.calculate_kpi_status(kpi)
        assert result.status == KPIStatus.ON_TARGET
        assert result.target_achievement_pct is not None
        assert result.target_achievement_pct > 100

    def test_default_direction_is_decrease(self):
        """If direction is not provided, default to 'decrease'."""
        kpi = KPIResult(
            name="Waiting Time",
            baseline=90,
            target=60,
            actual=54,
            direction=None,
        )
        result = DecisionEngine.calculate_kpi_status(kpi)
        assert result.status == KPIStatus.ON_TARGET


# ═══════════════════════════════════════════════════════════════════════════
# Milestone Completion
# ═══════════════════════════════════════════════════════════════════════════


class TestMilestoneCompletion:

    def test_all_completed(self):
        milestones = [
            MilestoneResult(name="Setup", status="completed"),
            MilestoneResult(name="Training", status="completed"),
            MilestoneResult(name="Go-live", status="completed"),
        ]
        rate = DecisionEngine.calculate_milestone_completion(milestones)
        assert rate == 100.0

    def test_partial_completion(self):
        milestones = [
            MilestoneResult(name="Setup", status="completed"),
            MilestoneResult(name="Training", status="delayed"),
            MilestoneResult(name="Go-live", status="pending"),
        ]
        rate = DecisionEngine.calculate_milestone_completion(milestones)
        assert abs(rate - 33.3) < 0.1

    def test_empty_milestones(self):
        rate = DecisionEngine.calculate_milestone_completion([])
        assert rate is None


# ═══════════════════════════════════════════════════════════════════════════
# Risk Counts
# ═══════════════════════════════════════════════════════════════════════════


class TestRiskCounts:

    def test_count_by_severity(self):
        risks = [
            PilotRisk(category="technical", description="Test", severity="HIGH"),
            PilotRisk(category="adoption", description="Test", severity="MEDIUM"),
            PilotRisk(category="data", description="Test", severity="LOW"),
            PilotRisk(category="security", description="Test", severity="HIGH"),
        ]
        counts = DecisionEngine.calculate_risk_counts(risks)
        assert counts["HIGH"] == 2
        assert counts["MEDIUM"] == 1
        assert counts["LOW"] == 1

    def test_empty_risks(self):
        counts = DecisionEngine.calculate_risk_counts([])
        assert counts == {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "UNKNOWN": 0}

    def test_unknown_severity(self):
        risks = [
            PilotRisk(category="technical", description="Test", severity=None),
        ]
        counts = DecisionEngine.calculate_risk_counts(risks)
        assert counts["UNKNOWN"] == 1


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════


def _full_pilot_request() -> PilotIntelligenceRequest:
    return PilotIntelligenceRequest(
        challenge_title="Reduce waiting times at government hospitals",
        startup_name="QueueFlow Technologies",
        pilot_duration="60 days",
        pilot_sites=["District Hospital Pune", "District Hospital Nashik"],
        kpi_results=[
            KPIResult(
                name="Average Waiting Time",
                unit="minutes",
                baseline=90.0,
                target=45.0,
                actual=45.0,
                direction="decrease",
            ),
            KPIResult(
                name="Patient Satisfaction Score",
                unit="score",
                baseline=3.0,
                target=4.5,
                actual=None,  # Missing actual measurement
                direction="increase",
            ),
        ],
        milestones=[
            MilestoneResult(name="System Integration", status="completed"),
            MilestoneResult(name="Staff Training", status="delayed"),
        ],
        risks=[
            PilotRisk(
                category="technical",
                description="Network intermittent connectivity at rural hospital site.",
                severity="HIGH",
                mitigation="Deploy offline-first caching.",
            ),
            PilotRisk(
                category="adoption",
                description="Staff resistance to digital token system.",
                severity="MEDIUM",
                mitigation="Conduct daily refresher training.",
            ),
        ],
        evidence=[
            PilotEvidence(
                description="OPD registry logs from 2 hospital sites.",
                source="Hospital MIS",
                verified=True,
            ),
            PilotEvidence(
                description="Patient feedback survey summary sheet.",
                source="Startup internal survey",
                verified=False,
            ),
        ],
        user_feedback=None,
        technical_stability="99.2% uptime with occasional offline sync delays.",
        independent_validation=None,
    )


# ═══════════════════════════════════════════════════════════════════════════
# AIService.interpret_pilot — Async & Authority Tests
# ═══════════════════════════════════════════════════════════════════════════


class TestAIServiceInterpretPilotAsync:

    @pytest.mark.asyncio
    async def test_interpret_pilot_preserves_deterministic_metrics_and_ignores_llm_overrides(self):
        """Python is the sole source of truth for numerical calculations; LLM overrides are discarded."""
        request = _full_pilot_request()

        # LLM deliberately returns wrong numerical metrics and attempts to override Python calculations
        raw_llm = {
            "overall_assessment": "The pilot demonstrated strong operational performance.",
            "kpi_analyses": [
                {
                    "name": "Average Waiting Time",
                    "baseline": 500.0,
                    "target": 100.0,
                    "actual": 1000.0,
                    "improvement_pct": 99.0,
                    "target_achievement_pct": 100.0,
                    "status": "BELOW_TARGET",
                }
            ],
            "milestone_completion_rate": 100.0,
            "risk_counts": {"HIGH": 0, "MEDIUM": 0, "LOW": 0},
            "risk_summary": "No risks identified.",
            "observations": ["Significant reduction in queue bottlenecks."],
            "concerns": ["Network latency at remote nodes."],
            "evidence_gaps": ["Independent audit pending."],
            "recommended_actions": ["Conduct third-party audit before scaling."],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.interpret_pilot(request)

        # 1. Deterministic KPI 1 authority: (90 - 45) / 90 = 50% improvement, 100% target achievement, ON_TARGET
        kpi1 = response.kpi_analyses[0]
        assert kpi1.name == "Average Waiting Time"
        assert kpi1.baseline == 90.0
        assert kpi1.target == 45.0
        assert kpi1.actual == 45.0
        assert kpi1.improvement_pct == 50.0
        assert kpi1.target_achievement_pct == 100.0
        assert kpi1.status == KPIStatus.ON_TARGET

        # 2. Deterministic KPI 2 authority: missing actual -> INSUFFICIENT_DATA
        kpi2 = response.kpi_analyses[1]
        assert kpi2.name == "Patient Satisfaction Score"
        assert kpi2.status == KPIStatus.INSUFFICIENT_DATA
        assert kpi2.improvement_pct is None
        assert kpi2.target_achievement_pct is None

        # 3. Deterministic Milestone Rate: 1 completed out of 2 = 50.0%
        assert response.milestone_completion_rate == 50.0

        # 4. Deterministic Risk Counts & Summary
        assert response.risk_counts == {"HIGH": 1, "MEDIUM": 1, "LOW": 0, "UNKNOWN": 0}
        assert response.risk_summary == "HIGH: 1, MEDIUM: 1, LOW: 0"

        # 5. Qualitative fields extracted cleanly
        assert "pilot demonstrated strong operational performance" in response.overall_assessment
        assert len(response.observations) == 1
        assert len(response.concerns) == 1
        assert len(response.recommended_actions) == 1

    @pytest.mark.asyncio
    async def test_interpret_pilot_surfaces_missing_data_and_unverified_evidence_gaps(self):
        """Deterministic reconciliation injects missing KPI data, unverified evidence, and absent feedback."""
        request = _full_pilot_request()

        raw_llm = {
            "overall_assessment": "Pilot summary.",
            "observations": ["Obs 1"],
            "concerns": ["Concern 1"],
            "evidence_gaps": [],  # LLM failed to identify evidence gaps
            "recommended_actions": ["Action 1"],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.interpret_pilot(request)

        gaps_text = " ".join(response.evidence_gaps).lower()

        # Incomplete KPI measurement
        assert "patient satisfaction score" in gaps_text or "missing" in gaps_text
        # Unverified evidence
        assert "unverified" in gaps_text or "verification" in gaps_text
        # Absent user feedback
        assert "user feedback" in gaps_text or "stakeholder" in gaps_text
        # Absent independent validation
        assert "independent validation" in gaps_text or "audit" in gaps_text

    @pytest.mark.asyncio
    async def test_interpret_pilot_list_resilience_single_and_separated_strings(self):
        """Single strings, newline-separated strings, and comma lists are handled safely."""
        request = _full_pilot_request()

        raw_llm = {
            "overall_assessment": "Assessment text.",
            "observations": "Single continuous observation string without list wrapping.",
            "concerns": "First major operational concern.\nSecond operational concern.",
            "evidence_gaps": "Missing baseline measurement, Missing validation certificate",
            "recommended_actions": "Conduct load testing; Finalize training modules",
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.interpret_pilot(request)

        assert len(response.observations) == 1
        assert response.observations[0] == "Single continuous observation string without list wrapping."

        assert len(response.concerns) == 2
        assert response.concerns[0] == "First major operational concern."
        assert response.concerns[1] == "Second operational concern."

        assert any("Missing baseline" in g for g in response.evidence_gaps)
        assert any("Missing validation" in g for g in response.evidence_gaps)

        assert any("Conduct load testing" in a for a in response.recommended_actions)
        assert any("Finalize training modules" in a for a in response.recommended_actions)

    @pytest.mark.asyncio
    async def test_interpret_pilot_claims_sanitization(self):
        """Unverified claims of proven fit, guaranteed impact, and demonstrated track record are sanitized."""
        request = _full_pilot_request()

        raw_llm = {
            "overall_assessment": "The startup demonstrated proven technology fit and guaranteed impact.",
            "observations": ["Observed proven track record across both pilot sites."],
            "concerns": ["Concerns."],
            "evidence_gaps": ["Gaps."],
            "recommended_actions": ["Actions."],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.interpret_pilot(request)

        assert "proven technology fit" not in response.overall_assessment
        assert "guaranteed impact" not in response.overall_assessment
        assert "proven track record" not in response.observations[0]

    def test_build_pilot_prompt_contains_authority_and_read_only_rules(self):
        """Prompt builder must include pre-calculated metrics and explicitly declare them read-only."""
        request = _full_pilot_request()
        kpi_analyses = DecisionEngine.calculate_all_kpis(request.kpi_results)
        milestone_rate = DecisionEngine.calculate_milestone_completion(request.milestones)
        risk_counts = DecisionEngine.calculate_risk_counts(request.risks)

        system_prompt, user_prompt = build_pilot_prompt(
            request, kpi_analyses, milestone_rate, risk_counts
        )

        assert "READ-ONLY" in system_prompt
        assert "SCALE" in system_prompt and "EXTEND" in system_prompt and "STOP" in system_prompt
        assert "NEVER invent" in system_prompt
        assert "READ-ONLY" in user_prompt
        assert "Average Waiting Time" in user_prompt
        assert "50.0%" in user_prompt
        assert "ON_TARGET" in user_prompt
        assert "INSUFFICIENT_DATA" in user_prompt
        assert "MILESTONE COMPLETION (computed): 50.0%" in user_prompt
        assert "'HIGH': 1" in user_prompt

    @pytest.mark.asyncio
    async def test_interpret_pilot_zero_baseline_and_zero_delta_edge_cases(self):
        """Zero baseline and zero delta edge cases calculate safely and deterministically."""
        edge_request = PilotIntelligenceRequest(
            challenge_title="Edge Case Pilot",
            startup_name="EdgeTech",
            kpi_results=[
                KPIResult(
                    name="Zero Baseline KPI",
                    baseline=0.0,
                    target=10.0,
                    actual=5.0,
                    direction="increase",
                ),
                KPIResult(
                    name="Zero Delta KPI",
                    baseline=50.0,
                    target=50.0,
                    actual=50.0,
                    direction="decrease",
                ),
            ],
            milestones=[],
            risks=[],
        )

        raw_llm = {
            "overall_assessment": "Edge test assessment.",
            "observations": [],
            "concerns": [],
            "evidence_gaps": [],
            "recommended_actions": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.interpret_pilot(edge_request)

        assert response.kpi_analyses[0].improvement_pct == 0.0
        assert response.kpi_analyses[1].target_achievement_pct == 100.0
        assert response.kpi_analyses[1].status == KPIStatus.ON_TARGET
        assert response.milestone_completion_rate is None
        assert response.risk_summary == "HIGH: 0, MEDIUM: 0, LOW: 0"

    @pytest.mark.asyncio
    async def test_interpret_pilot_malformed_ollama_output_raises_invalid_ai_response(self):
        """When Ollama returns invalid/unparseable JSON, InvalidAIResponseError is raised."""
        from services.ollama_client import InvalidAIResponseError

        request = _full_pilot_request()
        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.side_effect = InvalidAIResponseError("Failed to parse JSON")

        service = AIService(ollama_client=mock_ollama)
        with pytest.raises(InvalidAIResponseError):
            await service.interpret_pilot(request)

    @pytest.mark.asyncio
    async def test_interpret_pilot_no_autonomous_procurement_decision_in_response(self):
        """Brain 4 does not contain any autonomous SCALE/EXTEND/STOP decision field."""
        request = _full_pilot_request()
        raw_llm = {
            "overall_assessment": "The pilot had positive results. Decision: SCALE to all sites immediately.",
            "observations": ["Obs 1"],
            "concerns": [],
            "evidence_gaps": [],
            "recommended_actions": ["Procurement committee should review evidence."],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.interpret_pilot(request)

        # PilotIntelligenceResponse must NOT contain decision recommendation fields (which belong to DecisionEngine)
        assert not hasattr(response, "recommendation")
        assert not hasattr(response, "decision")
        assert isinstance(response, PilotIntelligenceResponse)

