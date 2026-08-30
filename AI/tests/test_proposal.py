"""
Tests for Brain 3 — Proposal Analysis

Covers: proposal analysis, risk severity, missing information, no autonomous evaluation.
"""

from __future__ import annotations

import pytest

from schemas.requests import (
    ChallengeContext,
    EligibilityInfo,
    ProposalAnalysisRequest,
    ProposalContent,
    StartupProfile,
)
from schemas.responses import ProposalAnalysisResponse, ProposalRisk, RiskSeverity


# ═══════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════


def _full_proposal_request() -> ProposalAnalysisRequest:
    return ProposalAnalysisRequest(
        challenge=ChallengeContext(
            title="Reduce hospital waiting times",
            description="Long waiting times in government hospitals.",
            domain="Healthcare",
            technology_categories=["queue management"],
        ),
        startup=StartupProfile(
            name="MediFlow AI",
            description="AI queue management for hospitals.",
            technologies=["queue management", "predictive analytics"],
            domain="Healthcare",
            experience="3 hospital deployments",
        ),
        proposal=ProposalContent(
            summary="AI-powered queue management reducing waiting time by 40%.",
            technical_approach="Real-time prediction, dynamic slot allocation.",
            implementation_timeline="60 days",
            estimated_cost="₹4,00,000",
            expected_impact="40% reduction in average waiting time.",
            team_composition="5 engineers, 1 PM, 1 healthcare consultant",
            past_experience="Deployed in 3 hospitals.",
        ),
        eligibility=EligibilityInfo(
            dpiit_registered=True,
            incorporation_date="2020-01-15",
            annual_turnover="₹2 crore",
            certifications=["ISO 27001"],
        ),
        available_documents=["Company registration", "Technical proposal"],
    )


# ═══════════════════════════════════════════════════════════════════════════
# Schema Validation Tests
# ═══════════════════════════════════════════════════════════════════════════


class TestProposalSchemaValidation:

    def test_full_request_validates(self):
        request = _full_proposal_request()
        assert request.startup.name == "MediFlow AI"
        assert request.proposal.estimated_cost == "₹4,00,000"
        assert request.eligibility is not None
        assert request.eligibility.dpiit_registered is True

    def test_minimal_request(self):
        request = ProposalAnalysisRequest(
            challenge=ChallengeContext(
                title="Test", description="Test"
            ),
            startup=StartupProfile(
                name="Test", description="Test"
            ),
            proposal=ProposalContent(),
        )
        assert request.proposal.summary is None
        assert request.eligibility is None


class TestProposalResponseValidation:

    def test_valid_response(self):
        response = ProposalAnalysisResponse(
            executive_summary="The proposal addresses waiting time reduction.",
            technical_approach="Real-time queue prediction.",
            expected_impact="40% reduction in waiting time.",
            technology_readiness="TRL 7 — system prototype in operational environment.",
            risks=[
                ProposalRisk(
                    category="technical",
                    description="Integration with legacy HMS may face challenges.",
                    severity=RiskSeverity.MEDIUM,
                    mitigation_suggestion="Conduct technical assessment first.",
                ),
                ProposalRisk(
                    category="adoption",
                    description="Staff training needed for new system.",
                    severity=RiskSeverity.LOW,
                ),
            ],
            estimated_cost="₹4,00,000",
            implementation_timeline="60 days",
            missing_information=["Detailed data architecture not provided"],
            questions_for_evaluator=[
                "Has the startup demonstrated HIPAA-equivalent compliance?",
                "What is the fallback if the AI model underperforms?",
            ],
        )
        assert len(response.risks) == 2
        assert response.risks[0].severity == RiskSeverity.MEDIUM
        assert len(response.questions_for_evaluator) == 2

    def test_risk_severity_enum(self):
        assert RiskSeverity.LOW == "LOW"
        assert RiskSeverity.MEDIUM == "MEDIUM"
        assert RiskSeverity.HIGH == "HIGH"

    def test_no_autonomous_evaluation(self):
        """Response should not contain a final score or selection decision."""
        response = ProposalAnalysisResponse(
            executive_summary="Test",
            missing_information=["More info needed"],
        )
        # There's no score field — by schema design, the AI cannot assign one
        assert not hasattr(response, "final_score")
        assert not hasattr(response, "selected")
        assert not hasattr(response, "eligible")

    def test_missing_information_surfaced(self):
        response = ProposalAnalysisResponse(
            executive_summary="Test",
            missing_information=[
                "Data architecture not provided",
                "Security audit report missing",
                "Cost breakdown not detailed",
            ],
        )
        assert len(response.missing_information) == 3


# ═══════════════════════════════════════════════════════════════════════════
# AIService Async Integration & Authority Tests
# ═══════════════════════════════════════════════════════════════════════════


from unittest.mock import AsyncMock
from prompts.proposal_analysis import build_proposal_prompt
from services.ai_service import AIService
from services.ollama_client import OllamaClient


class TestAIServiceAnalyzeProposalAsync:
    """Tests for AIService.analyze_proposal with mocked Ollama."""

    @pytest.mark.asyncio
    async def test_analyze_proposal_async_mock(self):
        """End-to-end AIService execution with AsyncMock OllamaClient."""
        request = _full_proposal_request()
        raw_llm = {
            "executive_summary": "The proposal states an AI-based OPD queue management approach.",
            "technical_approach": "Uses queue prediction algorithms.",
            "expected_impact": "The proposal estimates a 40% reduction in waiting time.",
            "technology_readiness": "Stated prototype readiness based on prior hospital deployments.",
            "risks": [
                {
                    "category": "technical",
                    "description": "Integration with existing hospital HMS.",
                    "severity": "MEDIUM",
                    "mitigation_suggestion": "API standardisation",
                }
            ],
            "estimated_cost": "₹10,00,000",  # LLM attempted override
            "implementation_timeline": "180 days",  # LLM attempted override
            "missing_information": ["Detailed data security architecture"],
            "questions_for_evaluator": ["Verify API readiness of the district hospital."],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.analyze_proposal(request)

        assert response.executive_summary == "The proposal states an AI-based OPD queue management approach."
        # Authoritative cost & timeline must be preserved from request, not overridden by LLM
        assert response.estimated_cost == "₹4,00,000"
        assert response.implementation_timeline == "60 days"
        assert len(response.risks) == 1
        assert response.risks[0].severity == RiskSeverity.MEDIUM
        assert "Detailed data security architecture" in response.missing_information
        assert "Verify API readiness of the district hospital." in response.questions_for_evaluator

    @pytest.mark.asyncio
    async def test_analyze_proposal_preserves_authoritative_cost(self):
        """User-provided estimated_cost is preserved exactly and cannot be overwritten by LLM."""
        request = _full_proposal_request()
        request.proposal.estimated_cost = "₹10 lakh"

        raw_llm = {
            "executive_summary": "Summary",
            "estimated_cost": "₹50 lakh",  # Hallucinated cost
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.analyze_proposal(request)

        assert response.estimated_cost == "₹10 lakh"

    @pytest.mark.asyncio
    async def test_analyze_proposal_preserves_authoritative_timeline(self):
        """User-provided implementation_timeline is preserved exactly and cannot be overwritten by LLM."""
        request = _full_proposal_request()
        request.proposal.implementation_timeline = "60 days"

        raw_llm = {
            "executive_summary": "Summary",
            "implementation_timeline": "6 months",  # Hallucinated timeline
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.analyze_proposal(request)

        assert response.implementation_timeline == "60 days"

    @pytest.mark.asyncio
    async def test_analyze_proposal_ignores_hallucinated_cost_when_omitted(self):
        """When estimated_cost is omitted from request, invented LLM cost is discarded and surfaced as missing."""
        request = _full_proposal_request()
        request.proposal.estimated_cost = None

        raw_llm = {
            "executive_summary": "Summary",
            "estimated_cost": "₹15 lakh",  # Invented cost
            "missing_information": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.analyze_proposal(request)

        assert response.estimated_cost is None
        assert any("cost" in m.lower() or "budget" in m.lower() for m in response.missing_information)

    @pytest.mark.asyncio
    async def test_analyze_proposal_ignores_hallucinated_timeline_when_omitted(self):
        """When implementation_timeline is omitted from request, invented LLM timeline is discarded and surfaced as missing."""
        request = _full_proposal_request()
        request.proposal.implementation_timeline = None

        raw_llm = {
            "executive_summary": "Summary",
            "implementation_timeline": "6 months",  # Invented timeline
            "missing_information": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.analyze_proposal(request)

        assert response.implementation_timeline is None
        assert any("timeline" in m.lower() or "schedule" in m.lower() for m in response.missing_information)

    @pytest.mark.asyncio
    async def test_analyze_proposal_claims_aware_sanitization(self):
        """Unsupported certainty phrases are sanitized to claims-aware language."""
        request = _full_proposal_request()
        raw_llm = {
            "executive_summary": "The proposal offers a proven technology with verified capability in healthcare.",
            "technical_approach": "Built on proven technology and verified capabilities.",
            "expected_impact": "Delivers demonstrated impact and guaranteed impact on patient queues.",
            "technology_readiness": "Demonstrated experience proves readiness.",
            "risks": [
                {
                    "category": "technical",
                    "description": "Risk despite demonstrated track record.",
                    "severity": "HIGH",
                }
            ],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.analyze_proposal(request)

        # Assert unverified claims are reframed
        assert "proven technology" not in response.executive_summary.lower()
        assert "verified capability" not in response.executive_summary.lower()
        assert "technology described in the submission" in response.executive_summary.lower()

        assert "proven technology" not in response.technical_approach.lower()
        assert "stated capabilities" in response.technical_approach.lower()

        assert "demonstrated impact" not in response.expected_impact.lower()
        assert "guaranteed impact" not in response.expected_impact.lower()
        assert "reported impact" in response.expected_impact.lower()
        assert "projected impact" in response.expected_impact.lower()

        assert "demonstrated experience" not in response.technology_readiness.lower()
        assert "stated experience" in response.technology_readiness.lower()

        assert "demonstrated track record" not in response.risks[0].description.lower()
        assert "reported track record" in response.risks[0].description.lower()

    @pytest.mark.asyncio
    async def test_analyze_proposal_handles_string_and_malformed_risks(self):
        """Risks provided as strings, single dict, or invalid severity are handled gracefully."""
        request = _full_proposal_request()
        raw_llm = {
            "executive_summary": "Summary",
            "risks": [
                "Legacy HMS integration difficulty",  # string risk
                {
                    "category": "cybersecurity",
                    "description": "Patient data privacy compliance.",
                    "severity": "INVALID_SEV",  # invalid severity string -> default MEDIUM
                    "mitigation_suggestion": "Ensure encryption in transit.",
                },
                {
                    "category": "unknown_cat",  # unknown category -> default operational
                    "description": "Hospital staff adoption resistance.",
                    "severity": "LOW",
                },
                {"invalid": "no description"},  # malformed dict -> ignored safely
            ],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.analyze_proposal(request)

        assert len(response.risks) == 3
        # String risk converted to ProposalRisk
        assert response.risks[0].description == "Legacy HMS integration difficulty"
        assert response.risks[0].severity == RiskSeverity.MEDIUM
        assert response.risks[0].category == "operational"

        # Invalid severity normalized to MEDIUM
        assert response.risks[1].description == "Patient data privacy compliance."
        assert response.risks[1].severity == RiskSeverity.MEDIUM
        assert response.risks[1].category == "cybersecurity"

        # Unknown category normalized to operational
        assert response.risks[2].description == "Hospital staff adoption resistance."
        assert response.risks[2].severity == RiskSeverity.LOW
        assert response.risks[2].category == "operational"

    @pytest.mark.asyncio
    async def test_analyze_proposal_handles_string_lists(self):
        """String lists formatted as single string, comma-separated, or newline-separated parse cleanly."""
        request = _full_proposal_request()
        raw_llm = {
            "executive_summary": "Summary",
            "missing_information": "Data flow diagram\n• Hardware specifications\n• SLA commitments",
            "questions_for_evaluator": "What is the failover mechanism?, How is patient consent logged?",
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.analyze_proposal(request)

        assert "Data flow diagram" in response.missing_information
        assert "Hardware specifications" in response.missing_information
        assert "SLA commitments" in response.missing_information

        assert len(response.questions_for_evaluator) == 2
        assert response.questions_for_evaluator[0] == "What is the failover mechanism?"
        assert response.questions_for_evaluator[1] == "How is patient consent logged?"

    @pytest.mark.asyncio
    async def test_analyze_proposal_surfaces_missing_unprovided_fields(self):
        """When essential proposal fields are omitted from request, they deterministically appear in missing_information."""
        minimal_request = ProposalAnalysisRequest(
            challenge=ChallengeContext(
                title="Test challenge", description="Test description"
            ),
            startup=StartupProfile(
                name="Test Startup", description="Test description"
            ),
            proposal=ProposalContent(),  # All proposal fields empty
            eligibility=None,  # Eligibility omitted
            available_documents=None,
        )

        raw_llm = {
            "executive_summary": "Minimal summary",
            "missing_information": [],
            "questions_for_evaluator": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.analyze_proposal(minimal_request)

        missing_text = " ".join(response.missing_information).lower()
        assert "technical approach" in missing_text
        assert "cost" in missing_text or "budget" in missing_text
        assert "timeline" in missing_text or "schedule" in missing_text
        assert "team" in missing_text
        assert "experience" in missing_text
        assert "eligibility" in missing_text

    def test_build_proposal_prompt_authority_and_anti_hallucination(self):
        """Prompt builder must declare inputs as claims, enforce evaluator boundaries, and ban hallucinated facts."""
        request = _full_proposal_request()
        system_prompt, user_prompt = build_proposal_prompt(request)

        assert "AUTHORITATIVE INPUT DATA" in system_prompt
        assert "SUPPLIED CLAIMS" in system_prompt
        assert "Never invent" in system_prompt
        assert "available_documents" in system_prompt or "titles only" in user_prompt
        assert "Do NOT make procurement" in user_prompt

        assert "MediFlow AI" in user_prompt
        assert "Reduce hospital waiting times" in user_prompt
        assert "₹4,00,000" in user_prompt
        assert "60 days" in user_prompt
        assert "Technical proposal" in user_prompt

    @pytest.mark.asyncio
    async def test_analyze_proposal_cost_exact_rupee_symbol_and_override_protection(self):
        """User estimated_cost with rupee symbol is preserved verbatim and not overridden by LLM."""
        request = _full_proposal_request()
        request.proposal.estimated_cost = "₹10 lakh"

        raw_llm = {
            "executive_summary": "Summary",
            "estimated_cost": "?50 lakh",  # LLM attempt to override or corrupt rupee sign
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.analyze_proposal(request)

        assert response.estimated_cost == "₹10 lakh"

    @pytest.mark.asyncio
    async def test_missing_information_does_not_contradict_supplied_data(self):
        """Reconciliation must strip false claims of missing data when fields are supplied."""
        request = _full_proposal_request()
        request.proposal.estimated_cost = "₹10 lakh"
        request.proposal.implementation_timeline = "60 days"
        request.proposal.team_composition = "12-member engineering team"
        request.startup.certifications = ["ISO 9001"]

        raw_llm = {
            "executive_summary": "Summary",
            "missing_information": [
                "Estimated cost, cost breakdown, and implementation timeline details",
                "Team composition not provided",
                "ISO 9001 certification missing",
                "Detailed line-item cost breakdown by phase",
            ],
            "questions_for_evaluator": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.analyze_proposal(request)

        # Falsely claimed missing items must be filtered out
        for item in response.missing_information:
            lower = item.lower()
            assert "estimated cost, cost breakdown, and implementation timeline" not in lower
            assert "team composition not provided" not in lower
            assert "iso 9001 certification missing" not in lower

        # Legitimate missing item (line-item cost breakdown) is retained
        assert any("line-item" in m.lower() or "breakdown" in m.lower() for m in response.missing_information)

    @pytest.mark.asyncio
    async def test_technology_readiness_does_not_invent_trl_or_claim_unverified_maturity(self):
        """Technology readiness strips invented TRLs and expresses uncertainty."""
        request = _full_proposal_request()
        raw_llm = {
            "executive_summary": "Summary",
            "technology_readiness": "TRL 7 — System prototype in operational environment with proven maturity and demonstrated production readiness.",
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.analyze_proposal(request)

        assert "trl 7" not in response.technology_readiness.lower()
        assert "proven maturity" not in response.technology_readiness.lower()
        assert "demonstrated production readiness" not in response.technology_readiness.lower()
    @pytest.mark.asyncio
    async def test_analyze_proposal_preserves_unicode_currency_euro(self):
        """User estimated_cost with Euro symbol is preserved verbatim without alteration."""
        request = _full_proposal_request()
        request.proposal.estimated_cost = "€10,000"

        raw_llm = {
            "executive_summary": "Summary",
            "estimated_cost": "$50,000",
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.analyze_proposal(request)

        assert response.estimated_cost == "€10,000"
