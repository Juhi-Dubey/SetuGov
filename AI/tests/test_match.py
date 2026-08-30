"""
Tests for Brain 2 — Startup Match

Covers: deterministic weighted scoring, score reproducibility,
explanation generation, missing startup data, LLM cannot modify score.
"""

from __future__ import annotations

import pytest

from schemas.requests import (
    ChallengeContext,
    KPIInput,
    MatchExplanationRequest,
    StartupProfile,
)
from schemas.responses import MatchExplanationResponse, MatchScoreBreakdown
from services.decision_engine import DecisionEngine


# ═══════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════


def _full_match_request() -> MatchExplanationRequest:
    return MatchExplanationRequest(
        challenge=ChallengeContext(
            title="Reduce hospital waiting times",
            description="Government hospitals face long patient waiting times.",
            domain="Healthcare",
            technology_categories=["queue management", "workflow automation"],
            location="Maharashtra",
        ),
        startup=StartupProfile(
            name="MediFlow AI",
            description="AI-powered queue management for hospitals with predictive scheduling.",
            technologies=["queue management", "predictive analytics"],
            domain="Healthcare",
            experience="3 government hospital deployments",
            deployments=["District Hospital Pune", "Civil Hospital Mumbai"],
            certifications=["ISO 27001"],
            team_size=15,
            location="Maharashtra",
        ),
    )


def _minimal_match_request() -> MatchExplanationRequest:
    return MatchExplanationRequest(
        challenge=ChallengeContext(
            title="Improve waiting times",
            description="Long waiting times in hospitals.",
        ),
        startup=StartupProfile(
            name="TechStartup",
            description="A technology startup.",
        ),
    )


# ═══════════════════════════════════════════════════════════════════════════
# Deterministic Scoring Tests
# ═══════════════════════════════════════════════════════════════════════════


class TestMatchScoring:

    def test_full_match_high_score(self):
        request = _full_match_request()
        score = DecisionEngine.calculate_match_score(request)
        assert isinstance(score, MatchScoreBreakdown)
        assert score.total > 50, f"Good match should score > 50, got {score.total}"

    def test_minimal_match_low_score(self):
        request = _minimal_match_request()
        score = DecisionEngine.calculate_match_score(request)
        assert score.total < 30, f"Minimal match should score < 30, got {score.total}"

    def test_score_is_reproducible(self):
        request = _full_match_request()
        score1 = DecisionEngine.calculate_match_score(request)
        score2 = DecisionEngine.calculate_match_score(request)
        assert score1.total == score2.total
        assert score1.model_dump() == score2.model_dump()

    def test_score_max_is_100(self):
        request = _full_match_request()
        score = DecisionEngine.calculate_match_score(request)
        assert score.total <= 100.0

    def test_score_components_within_bounds(self):
        request = _full_match_request()
        score = DecisionEngine.calculate_match_score(request)
        assert 0 <= score.technology_fit <= 30
        assert 0 <= score.domain_fit <= 25
        assert 0 <= score.readiness <= 20
        assert 0 <= score.experience <= 15
        assert 0 <= score.deployment_fit <= 10

    def test_technology_overlap_affects_score(self):
        """More technology overlap → higher technology_fit."""
        full = _full_match_request()
        full_score = DecisionEngine.calculate_match_score(full)

        no_tech = MatchExplanationRequest(
            challenge=full.challenge,
            startup=StartupProfile(
                name="NoTech",
                description="A startup with no matching tech.",
                technologies=["blockchain", "IoT"],
                domain="Healthcare",
            ),
        )
        no_tech_score = DecisionEngine.calculate_match_score(no_tech)

        assert full_score.technology_fit > no_tech_score.technology_fit

    def test_domain_match_affects_score(self):
        """Matching domain → higher domain_fit."""
        match = _full_match_request()
        match_score = DecisionEngine.calculate_match_score(match)

        mismatch = MatchExplanationRequest(
            challenge=match.challenge,
            startup=StartupProfile(
                name="AgriTech",
                description="A startup in agriculture.",
                domain="Agriculture",
            ),
        )
        mismatch_score = DecisionEngine.calculate_match_score(mismatch)

        assert match_score.domain_fit > mismatch_score.domain_fit

    def test_missing_startup_data_lower_score(self):
        """Startup with minimal data should score lower."""
        full_score = DecisionEngine.calculate_match_score(_full_match_request())
        minimal_score = DecisionEngine.calculate_match_score(_minimal_match_request())
        assert full_score.total > minimal_score.total


class TestLLMCannotModifyScore:
    """The deterministic score is injected INTO the response — not FROM the LLM."""

    def test_score_comes_from_engine(self):
        request = _full_match_request()
        score = DecisionEngine.calculate_match_score(request)

        # Simulate building response with deterministic score
        response = MatchExplanationResponse(
            score=score,
            why_matched="Simulated explanation",
            strengths=["Good tech fit"],
            concerns=[],
            missing_information=[],
            deployment_considerations=[],
        )

        # Score in response must equal what the engine computed
        assert response.score.total == score.total
        assert response.score.technology_fit == score.technology_fit


# ═══════════════════════════════════════════════════════════════════════════
# AIService Async Match Tests (Mocked LLM)
# ═══════════════════════════════════════════════════════════════════════════

from unittest.mock import AsyncMock
from services.ai_service import AIService
from services.ollama_client import OllamaClient
from prompts.match_explanation import build_match_prompt


class TestAIServiceExplainMatchAsync:
    """Test async execution of AIService.explain_match with mocked OllamaClient."""

    @pytest.mark.asyncio
    async def test_explain_match_preserves_deterministic_score_and_ignores_llm_score(self):
        """Even if the LLM returns its own score in JSON, the Python score is strictly preserved."""
        request = _full_match_request()
        expected_score = DecisionEngine.calculate_match_score(request)

        # LLM tries to overwrite the score with 99.9
        raw_llm = {
            "score": {
                "technology_fit": 30.0,
                "domain_fit": 25.0,
                "readiness": 20.0,
                "experience": 15.0,
                "deployment_fit": 10.0,
                "total": 99.9,
            },
            "why_matched": "MediFlow AI provides hospital queue management software.",
            "strengths": ["Direct technology alignment with queue management", "Prior hospital deployments"],
            "concerns": ["Scaling to all Maharashtra district hospitals"],
            "missing_information": ["DPIIT registration certificate"],
            "deployment_considerations": ["Requires integration with existing hospital token system"],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.explain_match(request)

        assert isinstance(response, MatchExplanationResponse)
        # Score MUST match the deterministic Python calculation, NOT the LLM's 99.9
        assert response.score.total == expected_score.total
        assert response.score.technology_fit == expected_score.technology_fit
        assert response.score.domain_fit == expected_score.domain_fit
        assert response.score.total != 99.9
        # Qualitative explanations correctly attached
        assert "MediFlow AI" in response.why_matched
        assert len(response.strengths) == 2
        assert len(response.concerns) == 1
        assert len(response.missing_information) == 1
        assert len(response.deployment_considerations) == 1

    @pytest.mark.asyncio
    async def test_explain_match_handles_single_string_list_fields(self):
        """Single string values in list fields must not be split character-by-character."""
        request = _full_match_request()
        raw_llm = {
            "why_matched": "Relevant domain fit.",
            "strengths": "Strong queue management technology",  # plain string, not list
            "concerns": "Limited state-wide deployment evidence",  # plain string
            "missing_information": "Team structure details",  # plain string
            "deployment_considerations": "On-premise server requirements",  # plain string
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.explain_match(request)

        # Must be parsed as single-item list of strings, NOT character arrays
        assert response.strengths == ["Strong queue management technology"]
        assert response.concerns == ["Limited state-wide deployment evidence"]
        assert response.missing_information == ["Team structure details"]
        assert response.deployment_considerations == ["On-premise server requirements"]

    @pytest.mark.asyncio
    async def test_explain_match_handles_newline_separated_list_fields(self):
        """Newline/bulleted strings must be cleanly split into individual list items."""
        request = _full_match_request()
        raw_llm = {
            "why_matched": "Matches healthcare domain.",
            "strengths": "• Point 1: Queue management tech\n• Point 2: Healthcare domain expertise\n• Point 3: Existing deployments",
            "concerns": "- Concern 1: Team size is small\n- Concern 2: No cloud SLA specified",
            "missing_information": "1. ISO 27001 certificate copy\n2. Financial turnover details",
            "deployment_considerations": "Integration with OPD\nStaff training requirement",
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.explain_match(request)

        assert len(response.strengths) == 3
        assert response.strengths[0] == "Point 1: Queue management tech"
        assert len(response.concerns) == 2
        assert response.concerns[0] == "Concern 1: Team size is small"
        assert len(response.missing_information) == 2
        assert response.missing_information[0] == "ISO 27001 certificate copy"
        assert len(response.deployment_considerations) == 2
        assert response.deployment_considerations[0] == "Integration with OPD"

    @pytest.mark.asyncio
    async def test_explain_match_handles_comma_separated_list_fields(self):
        """Comma-separated strings must be split into clean list items."""
        request = _full_match_request()
        raw_llm = {
            "why_matched": "Relevant startup.",
            "strengths": "Queue management, Predictive analytics, ISO 27001",
            "concerns": "Scaling challenges, Integration latency",
            "missing_information": "Past performance certs, Security audit",
            "deployment_considerations": "Network bandwidth, Token printer setup",
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.explain_match(request)

        assert response.strengths == ["Queue management", "Predictive analytics", "ISO 27001"]
        assert response.concerns == ["Scaling challenges", "Integration latency"]
        assert response.missing_information == ["Past performance certs", "Security audit"]
        assert response.deployment_considerations == ["Network bandwidth", "Token printer setup"]

    @pytest.mark.asyncio
    async def test_explain_match_handles_empty_or_malformed_llm_output(self):
        """Empty LLM dictionary gracefully yields default explanation and empty lists."""
        request = _full_match_request()
        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = {}

        service = AIService(ollama_client=mock_ollama)
        response = await service.explain_match(request)

        assert response.why_matched == "No explanation provided."
        assert response.strengths == []
        assert response.concerns == []
        assert response.missing_information == []
        assert response.deployment_considerations == []
        assert response.score.total > 0

    def test_build_match_prompt_contains_authority_and_anti_hallucination_rules(self):
        """The match explanation prompt builder must enforce all authority and anti-hallucination invariants."""
        request = _full_match_request()
        score = DecisionEngine.calculate_match_score(request)
        system_prompt, user_prompt = build_match_prompt(request, score)

        # Anti-hallucination & authority invariants
        assert "AUTHORITATIVE" in system_prompt
        assert "Never invent certifications" in system_prompt
        assert "Never invent deployments" in system_prompt
        assert "Never claim legal eligibility" in system_prompt
        assert "Never make selection decisions" in system_prompt
        assert "FIXED and AUTHORITATIVE" in system_prompt

        # Prompt content includes challenge and startup fields
        assert "Reduce hospital waiting times" in user_prompt
        assert "MediFlow AI" in user_prompt
        assert f"TOTAL MATCH SCORE: {score.total}/100" in user_prompt


class TestAntiHallucinationClaimSanitization:
    """Test that unsupported verification assertions are sanitized to claims-based language."""

    @pytest.mark.asyncio
    async def test_unsupported_verification_phrases_are_sanitized(self):
        """Phrases claiming independent verification without evidence must be reframed."""
        request = _full_match_request()
        raw_llm = {
            "why_matched": "Matches due to verified technology fit and proven capability in OPD workflow.",
            "strengths": [
                "Verified technology fit and domain expertise in healthcare",
                "Proven capability in queue management",
                "Demonstrated ability to manage complex hospital queues",
            ],
            "concerns": [
                "No demonstrated track record in government hospitals",
            ],
            "missing_information": [],
            "deployment_considerations": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.explain_match(request)

        # None of the unverified claims should remain
        assert "verified technology fit" not in response.why_matched.lower()
        assert "proven capability" not in response.why_matched.lower()
        assert "profile-indicated technology fit" in response.why_matched.lower()
        assert "stated capability" in response.why_matched.lower()

        assert "verified technology fit" not in response.strengths[0].lower()
        assert "profile-indicated technology fit" in response.strengths[0].lower()

        assert "proven capability" not in response.strengths[1].lower()
        assert "stated capability" in response.strengths[1].lower()

        assert "demonstrated ability" not in response.strengths[2].lower()
        assert "stated ability" in response.strengths[2].lower()

        assert "demonstrated track record" not in response.concerns[0].lower()
        assert "reported track record" in response.concerns[0].lower()
