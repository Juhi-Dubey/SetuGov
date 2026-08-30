"""
Tests for Brain 5 — Document Assistance

Covers: all supported document types, missing information,
mandatory review label, no fabricated legal language.
"""

from __future__ import annotations

import pytest

from schemas.requests import DocumentAssistanceRequest, DocumentType, KPIInput
from schemas.responses import DocumentAssistanceResponse


# ═══════════════════════════════════════════════════════════════════════════
# Schema Validation
# ═══════════════════════════════════════════════════════════════════════════


class TestDocumentRequestValidation:

    def test_all_document_types(self):
        """All 5 document types must be valid."""
        for doc_type in DocumentType:
            request = DocumentAssistanceRequest(document_type=doc_type)
            assert request.document_type == doc_type

    def test_document_types_enum(self):
        assert DocumentType.CHALLENGE_STATEMENT == "CHALLENGE_STATEMENT"
        assert DocumentType.EVALUATION_CRITERIA == "EVALUATION_CRITERIA"
        assert DocumentType.PILOT_AGREEMENT_DRAFT == "PILOT_AGREEMENT_DRAFT"
        assert DocumentType.GOVERNANCE_CHECKLIST == "GOVERNANCE_CHECKLIST"
        assert DocumentType.PROCUREMENT_PATHWAY_SUMMARY == "PROCUREMENT_PATHWAY_SUMMARY"

    def test_full_request(self):
        request = DocumentAssistanceRequest(
            document_type=DocumentType.PILOT_AGREEMENT_DRAFT,
            challenge_title="Reduce hospital waiting times",
            challenge_description="Long waiting times in hospitals.",
            startup_name="MediFlow AI",
            pilot_duration="60 days",
            pilot_sites=["Hospital A", "Hospital B"],
            pilot_budget="₹4,00,000",
            kpis=[
                KPIInput(
                    name="Average Waiting Time",
                    unit="minutes",
                    baseline=90,
                    target=60,
                ),
            ],
            objectives=["Reduce waiting time", "Improve patient satisfaction"],
            additional_context="This is a pilot under GeM 4.0 framework.",
        )
        assert request.startup_name == "MediFlow AI"
        assert len(request.kpis) == 1


# ═══════════════════════════════════════════════════════════════════════════
# Response Validation
# ═══════════════════════════════════════════════════════════════════════════


class TestDocumentResponseValidation:

    def test_mandatory_review_label(self):
        """Every document must include the review label."""
        response = DocumentAssistanceResponse(
            document_type="CHALLENGE_STATEMENT",
            title="Challenge Statement",
            content="Some draft content",
            sections=["Problem", "Outcome", "KPIs"],
        )
        assert response.review_label == "AI-generated draft — requires authorized review."

    def test_review_label_default(self):
        """The default must be set even if not explicitly provided."""
        response = DocumentAssistanceResponse(
            document_type="EVALUATION_CRITERIA",
            title="Evaluation Criteria",
            content="Draft content",
        )
        assert "requires authorized review" in response.review_label

    def test_missing_information_surfaced(self):
        response = DocumentAssistanceResponse(
            document_type="PILOT_AGREEMENT_DRAFT",
            title="Pilot Agreement",
            content="Draft",
            missing_information=[
                "IP ownership terms not specified",
                "Data handling agreement not provided",
                "Cybersecurity requirements not defined",
            ],
        )
        assert len(response.missing_information) == 3

    def test_sections_list(self):
        response = DocumentAssistanceResponse(
            document_type="GOVERNANCE_CHECKLIST",
            title="Governance Checklist",
            content="Draft",
            sections=[
                "Pre-Pilot Checks",
                "During-Pilot Monitoring",
                "Post-Pilot Evaluation",
                "Data Governance",
            ],
        )
        assert "Pre-Pilot Checks" in response.sections
        assert len(response.sections) == 4


class TestNoFabricatedLegalLanguage:
    """Ensure document responses don't claim legal authority by schema design."""

    def test_no_legal_binding_field(self):
        """Schema has no field for legal binding status."""
        response = DocumentAssistanceResponse(
            document_type="PILOT_AGREEMENT_DRAFT",
            title="Test",
            content="Test draft",
        )
        assert not hasattr(response, "legally_binding")
        assert not hasattr(response, "legal_certification")
        assert not hasattr(response, "legal_authority")


# ═══════════════════════════════════════════════════════════════════════════
# AI Service Async & Safeguards Tests
# ═══════════════════════════════════════════════════════════════════════════


class TestAIServiceAssistDocumentAsync:
    """Async tests for Brain 5 document assistance service layer."""

    @pytest.fixture
    def full_document_request(self) -> DocumentAssistanceRequest:
        return DocumentAssistanceRequest(
            document_type=DocumentType.PILOT_AGREEMENT_DRAFT,
            challenge_title="Reduce waiting times at government hospitals",
            challenge_description="Long outpatient waiting times at government hospitals.",
            startup_name="QueueFlow Technologies",
            pilot_duration="60 days",
            pilot_sites=["District Hospital A", "District Hospital B"],
            pilot_budget="₹10 lakh",
            kpis=[
                KPIInput(
                    name="Average Waiting Time",
                    unit="minutes",
                    baseline=90.0,
                    target=54.0,
                    direction="decrease",
                )
            ],
            objectives=[
                "Reduce outpatient waiting times by 40% across pilot sites",
                "Deploy workflow automation in hospital OPDs",
            ],
            additional_context="Technology: Workflow automation. Timeline: 60 days.",
        )

    @pytest.mark.asyncio
    async def test_assist_document_end_to_end_preserves_facts_and_unicode(self, full_document_request):
        """Authoritative request values and ₹ Unicode symbols survive end-to-end."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        raw_llm = {
            "title": "Pilot Agreement Draft — Hospital Workflow",
            "content": "Pilot Agreement for QueueFlow Technologies covering 60 days with pilot budget of ₹10 lakh.",
            "sections": ["Pilot Scope", "Objectives", "Duration", "Payment Schedule"],
            "missing_information": ["[DATE] (effective date)"],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        assert response.document_type == "PILOT_AGREEMENT_DRAFT"
        assert response.title == "Pilot Agreement Draft — Hospital Workflow"
        assert "₹10 lakh" in response.content
        assert "QueueFlow Technologies" in response.content
        assert "AI-generated draft — requires authorized review." in response.content
        assert response.review_label == "AI-generated draft — requires authorized review."

    @pytest.mark.asyncio
    async def test_assist_document_sanitizes_invented_ip_and_payment_splits(self, full_document_request):
        """Invented IP ownership claims and invented payment splits are converted to review placeholders."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        raw_llm = {
            "title": "Pilot Agreement",
            "content": (
                "## 1. Pilot Scope\n"
                "This agreement outlines the operational terms for hospital workflow automation.\n\n"
                "## 2. Intellectual Property Considerations\n"
                "QueueFlow Technologies retains all intellectual property rights in the software.\n"
                "Hospital is granted an exclusive license.\n\n"
                "## 3. Budget & Payment Terms\n"
                "Payment will be made in 2 installments of ₹5 lakh each.\n"
                "Total cost: ₹10 lakh.\n"
            ),
            "sections": ["Pilot Scope", "IP Considerations", "Payment Schedule"],
            "missing_information": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        # Invented IP terms replaced with review placeholder
        assert "[IP OWNERSHIP TERMS NOT SPECIFIED — SUBJECT TO AUTHORIZED LEGAL REVIEW]" in response.content
        assert "retains all intellectual property" not in response.content
        # Invented payment split replaced with review placeholder
        assert (
            "[PAYMENT SCHEDULE NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]" in response.content
            or "[PAYMENT SCHEDULE / DISBURSEMENT TERMS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]" in response.content
        )
        assert "Payment will be made in 2 installments" not in response.content

    @pytest.mark.asyncio
    async def test_assist_document_deterministic_missing_information_reconciliation(self, full_document_request):
        """Unsupplied commercial/governance terms are surfaced without claiming they are legal mandates."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        raw_llm = {
            "title": "Pilot Agreement",
            "content": "Agreement text.",
            "sections": ["Scope"],
            "missing_information": ["[START_DATE] commencement date"],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        assert "Payment milestone disbursement schedule: Not provided — requires authorized review." in response.missing_information
        assert "Intellectual property ownership and licensing terms: Not provided — requires authorized review." in response.missing_information
        assert "Authorized signatories and official entity addresses: Not provided — requires authorized review." in response.missing_information
        assert "Dispute resolution and governing jurisdiction: Not provided — requires authorized review." in response.missing_information

    @pytest.mark.asyncio
    async def test_assist_document_list_resilience_single_string_and_newlines(self, full_document_request):
        """Strings returned for sections or missing_information are safely parsed without char splitting."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        raw_llm = {
            "title": "Pilot Agreement",
            "content": "Agreement text.",
            "sections": "Section 1: Scope\nSection 2: Payment\nSection 3: KPIs",
            "missing_information": "Item 1: Signatures missing, Item 2: Address missing",
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        assert isinstance(response.sections, list)
        assert len(response.sections) == 3
        assert "Section 1: Scope" in response.sections
        assert isinstance(response.missing_information, list)
        assert any("Signatures missing" in m for m in response.missing_information)

    def test_build_document_prompt_contains_authority_and_anti_hallucination_rules(self, full_document_request):
        """Prompt builder embeds anti-invention rules and user context."""
        from prompts.document_assistance import build_document_prompt

        system_prompt, user_prompt = build_document_prompt(full_document_request)

        assert "AI-Generated Draft Only" in system_prompt or "non-binding DRAFT" in system_prompt
        assert "NO INVENTED LEGAL OR COMMERCIAL CLAUSES" in system_prompt
        assert "NO INVENTED NUMBERS OR DATES" in system_prompt
        assert "AUTHORITATIVE CONTEXT" in user_prompt
        assert "Reduce waiting times at government hospitals" in user_prompt
        assert "QueueFlow Technologies" in user_prompt
        assert "₹10 lakh" in user_prompt
        assert "60 days" in user_prompt
        assert "District Hospital A, District Hospital B" in user_prompt

    @pytest.mark.asyncio
    async def test_assist_document_enriches_thin_content_into_substantive_draft(self, full_document_request):
        """When LLM returns overly thin content (<250 chars), system ensures substantive multi-section draft."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        # Thin 1-sentence mock LLM output
        raw_llm = {
            "title": "Pilot Agreement Draft",
            "content": "This is a brief pilot agreement draft summary.",
            "sections": ["Pilot Scope", "Objectives", "Duration", "Pilot Sites", "Payment Schedule"],
            "missing_information": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        # Must not be just a thin intro paragraph
        assert len(response.content) > 300
        assert "## 1. Pilot Scope" in response.content
        assert "## 2. Objectives" in response.content
        assert "## 3. Duration & Timeline" in response.content
        assert "60 days" in response.content
        assert "District Hospital A" in response.content
        assert "District Hospital B" in response.content
        assert "₹10 lakh" in response.content
        assert "Average Waiting Time" in response.content
        assert "baseline=90.0" in response.content
        assert "target=54.0" in response.content

    @pytest.mark.asyncio
    async def test_assist_document_unicode_and_em_dash_integrity(self, full_document_request):
        """Verify em dash and ₹ symbols are preserved without mojibake."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        raw_llm = {
            "title": "Pilot Agreement Draft — Government Innovation",
            "content": "AI-generated draft — requires authorized review.\n\nBudget: ₹10 lakh for 60 days.",
            "sections": ["Scope — Pilot Overview"],
            "missing_information": ["Disbursement terms — requires review."],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        # Em dash must not be corrupted into mojibake
        assert "—" in response.review_label
        assert "â" not in response.review_label
        assert "—" in response.content
        assert "â" not in response.content
        assert "₹10 lakh" in response.content

    @pytest.mark.asyncio
    async def test_assist_document_reconciles_target_percentages_and_replaces_contradictory_numbers(self, full_document_request):
        """User objective 40% and KPI target 54 / baseline 90 are protected from LLM altering."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        raw_llm = {
            "title": "Pilot Agreement Draft",
            "content": (
                "## 1. Pilot Scope\n"
                "Pilot for QueueFlow Technologies covering 60 days.\n\n"
                "## 2. Objectives\n"
                "The pilot aims to achieve a 40% reduction in waiting times across pilot sites.\n\n"
                "## 6. Milestones & Deliverables\n"
                "- Milestone 1: Baseline setup at 100 minutes.\n"
                "- Milestone 2: Achieve 30% reduction in waiting times at pilot sites.\n"
                "- Milestone 3: Achieve target of 50 minutes at District Hospital A.\n\n"
                "## 7. Key Performance Indicators & Target Outcomes\n"
                "Average Waiting Time: baseline=100.0, target=50.0.\n"
            ),
            "sections": ["Pilot Scope", "Objectives", "Milestones & Deliverables", "KPIs"],
            "missing_information": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        # 40% must be preserved and 30% reduction must be reconciled
        assert "40% reduction" in response.content
        assert "30% reduction" not in response.content

        # KPI baseline 90 and target 54 must be reconciled
        assert "baseline of 90" in response.content or "baseline: 90" in response.content or "baseline=90" in response.content
        assert "target of 54" in response.content or "target: 54" in response.content or "target=54" in response.content

    @pytest.mark.asyncio
    async def test_assist_document_sanitizes_unsupported_contractual_commitments_and_cybersecurity(self, full_document_request):
        """Contractual compliance commitments and termination notice periods are converted to review placeholders."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        raw_llm = {
            "title": "Pilot Agreement",
            "content": (
                "## 1. Pilot Scope\n"
                "Deployment for QueueFlow Technologies.\n\n"
                "## 11. Cybersecurity Responsibilities\n"
                "QueueFlow Technologies will ensure the pilot solution is secure and compliant with ISO 27001.\n"
                "Both parties will ensure the security of the pilot's data and systems.\n\n"
                "## 13. Termination Conditions\n"
                "Either party may terminate this agreement upon 30 days' written notice to the other party.\n\n"
                "## 14. Extension Conditions\n"
                "If the pilot is extended, the extended duration and any changes will be agreed in writing.\n"
            ),
            "sections": ["Pilot Scope", "Cybersecurity Responsibilities", "Termination Conditions", "Extension Conditions"],
            "missing_information": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        # Active contractual compliance statements converted to review placeholder
        assert "[CYBERSECURITY STANDARDS — REQUIRES AUTHORIZED REVIEW]" in response.content
        assert "will ensure the pilot solution is secure" not in response.content

        # Invented 30 days notice converted to review placeholder
        assert "[TERMINATION CONDITIONS NOT SPECIFIED — SUBJECT TO AUTHORIZED REVIEW]" in response.content
        assert "upon 30 days' written notice" not in response.content

        # Extension converted to review placeholder
        assert "[EXTENSION CONDITIONS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]" in response.content

    @pytest.mark.asyncio
    async def test_assist_document_preserves_all_authoritative_user_facts(self, full_document_request):
        """All user supplied parameters survive end-to-end without data loss."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        raw_llm = {
            "title": "Pilot Agreement Draft — Government Innovation",
            "content": (
                "## 1. Pilot Scope\n"
                "Reduce waiting times at government hospitals with QueueFlow Technologies.\n\n"
                "## 2. Objectives\n"
                "Reduce outpatient waiting times by 40% across pilot sites and deploy workflow automation in hospital OPDs.\n\n"
                "## 3. Duration & Timeline\n"
                "Duration: 60 days.\n\n"
                "## 4. Pilot Sites\n"
                "District Hospital A and District Hospital B.\n\n"
                "## 7. Key Performance Indicators & Target Outcomes\n"
                "Average Waiting Time (minutes): baseline=90.0, target=54.0.\n\n"
                "## 8. Budget & Payment Terms\n"
                "Budget: ₹10 lakh.\n"
            ),
            "sections": ["Pilot Scope", "Objectives", "Duration", "Sites", "KPIs", "Budget"],
            "missing_information": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        assert "Reduce waiting times at government hospitals" in response.content
        assert "QueueFlow Technologies" in response.content
        assert "60 days" in response.content
        assert "District Hospital A" in response.content
        assert "District Hospital B" in response.content
        assert "₹10 lakh" in response.content
        assert "40%" in response.content
        assert "90" in response.content
        assert "54" in response.content

    @pytest.mark.asyncio
    async def test_assist_document_legal_placeholders_and_unsupplied_clauses(self, full_document_request):
        """Missing legal/contractual items use standard review placeholders without invented certifications."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        raw_llm = {
            "title": "Pilot Agreement Draft",
            "content": (
                "## 1. Pilot Scope\n"
                "Deployment for QueueFlow Technologies.\n\n"
                "## 8. Budget & Payment Terms\n"
                "Budget: ₹10 lakh.\n"
                "Payment will be made in 3 installments of 30%, 40%, 30%.\n\n"
                "## 10. Intellectual Property Considerations\n"
                "QueueFlow Technologies retains ownership of all intellectual property.\n\n"
                "## 11. Cybersecurity Responsibilities\n"
                "QueueFlow Technologies will ensure the pilot solution is secure and compliant with ISO 27001.\n\n"
                "## 13. Termination Conditions\n"
                "Either party may terminate upon 15 days written notice.\n\n"
                "## 15. Review & Authorized Signatories\n"
                "Disputes will be settled under the jurisdiction of the High Court.\n"
            ),
            "sections": ["Pilot Scope", "Budget", "IP", "Cybersecurity", "Termination", "Review"],
            "missing_information": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        # Placeholders must be present
        assert "[PAYMENT SCHEDULE / DISBURSEMENT TERMS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]" in response.content or "[PAYMENT SCHEDULE NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]" in response.content
        assert "[IP OWNERSHIP TERMS NOT SPECIFIED — SUBJECT TO AUTHORIZED LEGAL REVIEW]" in response.content
        assert "[CYBERSECURITY STANDARDS — REQUIRES AUTHORIZED REVIEW]" in response.content
        assert "[TERMINATION CONDITIONS NOT SPECIFIED — SUBJECT TO AUTHORIZED REVIEW]" in response.content
        assert "[DISPUTE RESOLUTION AND GOVERNING JURISDICTION NOT SPECIFIED — SUBJECT TO AUTHORIZED LEGAL REVIEW]" in response.content

        # Invented clauses must be absent
        assert "retains ownership of all intellectual property" not in response.content
        assert "Payment will be made in 3 installments" not in response.content
        assert "upon 15 days written notice" not in response.content
        assert "jurisdiction of the High Court" not in response.content

        # Missing information must list unsupplied terms
        assert any("Payment" in m for m in response.missing_information)
        assert any("Intellectual property" in m or "IP" in m for m in response.missing_information)
        assert any("Authorized signatories" in m for m in response.missing_information)
        assert any("Dispute resolution" in m for m in response.missing_information)
        assert any("Termination" in m for m in response.missing_information)
        assert any("Cybersecurity" in m for m in response.missing_information)

    @pytest.mark.asyncio
    async def test_assist_document_review_label_and_unicode_invariants(self, full_document_request):
        """Review label is strictly preserved and Unicode em dash and rupee are intact."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        raw_llm = {
            "title": "Pilot Agreement Draft",
            "content": "## 1. Pilot Scope\nDraft for QueueFlow Technologies.\n",
            "sections": ["Pilot Scope"],
            "missing_information": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        assert response.review_label == "AI-generated draft — requires authorized review."
        assert "AI-generated draft — requires authorized review." in response.content
        assert "â" not in response.content
        assert "â" not in response.review_label
        assert b"\xe2\x80\x94" in response.review_label.encode("utf-8")
        assert b"\xe2\x82\xb9" in response.content.encode("utf-8")

    @pytest.mark.asyncio
    async def test_assist_document_prevents_startup_name_template_leak_in_date(self, full_document_request):
        """[STARTUP_NAME] must not leak into date / commencement positions."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        raw_llm = {
            "title": "Pilot Agreement Draft",
            "content": (
                "## 1. Pilot Scope\n"
                "Pilot for [STARTUP_NAME].\n\n"
                "## 3. Duration & Timeline\n"
                "The Pilot will commence on [STARTUP_NAME] (‘Commencement Date’) and will continue for a period of 60 days.\n"
            ),
            "sections": ["Pilot Scope", "Duration & Timeline"],
            "missing_information": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        assert "[STARTUP_NAME]" not in response.content
        assert (
            "commence on [START DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]" in response.content
            or "commence on [START DATE — REQUIRES AUTHORIZED REVIEW]" in response.content
        )
        assert "QueueFlow Technologies" in response.content

    @pytest.mark.asyncio
    async def test_assist_document_replaces_final_version_claims(self, full_document_request):
        """Document must never claim to be the final version or legally binding."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        raw_llm = {
            "title": "Pilot Agreement Draft",
            "content": (
                "## 1. Pilot Scope\n"
                "Pilot agreement for QueueFlow Technologies.\n\n"
                "## 15. Review & Authorized Signatories\n"
                "This Agreement has been reviewed by [REQUIRES AUTHORIZED REVIEW] and is the final version.\n"
            ),
            "sections": ["Pilot Scope", "Review & Authorized Signatories"],
            "missing_information": [],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        assert "is the final version" not in response.content
        assert "final version" not in response.content
        assert "has not been finalized" in response.content

    @pytest.mark.asyncio
    async def test_assist_document_deduplicates_and_filters_generic_missing_info(self, full_document_request):
        """Filters out generic placeholder duplicates and preserves legitimate missing items."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        raw_llm = {
            "title": "Pilot Agreement Draft",
            "content": "## 1. Pilot Scope\nDraft for QueueFlow Technologies.\n",
            "sections": ["Pilot Scope"],
            "missing_information": [
                "[REQUIRES AUTHORIZED REVIEW] — requires authorized review.",
                "[REQUIRES AUTHORIZED REVIEW] — requires authorized review.",
                "[REQUIRES AUTHORIZED REVIEW] — subject to authorized legal review.",
                "Payment milestone disbursement schedule: Not provided — requires authorized review.",
                "Payment milestone disbursement schedule: Not provided — requires authorized review.",
            ],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        # Generic junk items filtered
        assert "[REQUIRES AUTHORIZED REVIEW] — requires authorized review." not in response.missing_information
        assert "[REQUIRES AUTHORIZED REVIEW] — subject to authorized legal review." not in response.missing_information

        # Payment schedule appears exactly once
        payment_items = [m for m in response.missing_information if "Payment" in m]
        assert len(payment_items) == 1

        # Legitimate missing requirements remain
        assert any("Payment" in m for m in response.missing_information)
        assert any("Intellectual property" in m or "IP" in m for m in response.missing_information)
        assert any("Authorized signatories" in m for m in response.missing_information)
        assert any("Dispute resolution" in m for m in response.missing_information)
        assert any("Termination" in m for m in response.missing_information)
        assert any("Cybersecurity" in m for m in response.missing_information)
        assert any("Data governance" in m for m in response.missing_information)

    @pytest.mark.asyncio
    async def test_assist_document_normalizes_generic_date_placeholders_and_double_punctuation(self, full_document_request):
        """Generic date placeholders are normalized to '— REQUIRES AUTHORIZED REVIEW' and double punctuation is fixed."""
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient

        raw_llm = {
            "title": "Pilot Agreement Draft",
            "content": (
                "## 1. Pilot Scope\n"
                "Deployment for QueueFlow Technologies.\n\n"
                "## 3. Duration & Timeline\n"
                "Commencing on [START DATE] and concluding on [END DATE]..\n"
                "Deployment of technology: [DEPLOYMENT DATE]..\n"
                "Final completion: [COMPLETION DATE]!!\n"
                "Termination notice: [TERMINATION NOTICE]??\n"
                "Review before use..\n"
            ),
            "sections": ["Pilot Scope", "Duration & Timeline"],
            "missing_information": [
                "[START DATE]",
                "[END DATE]",
                "[DEPLOYMENT DATE]",
                "[COMPLETION DATE]",
                "[TERMINATION NOTICE]",
                "Pilot completion date: Not provided — requires authorized review.",
            ],
        }

        mock_ollama = AsyncMock(spec=OllamaClient)
        mock_ollama.generate_json.return_value = raw_llm

        service = AIService(ollama_client=mock_ollama)
        response = await service.assist_document(full_document_request)

        # Normalized date placeholders in content
        assert (
            "[START DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]" in response.content
            or "[START DATE — REQUIRES AUTHORIZED REVIEW]" in response.content
        )
        assert (
            "[END DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]" in response.content
            or "[END DATE — REQUIRES AUTHORIZED REVIEW]" in response.content
        )
        assert (
            "[DEPLOYMENT DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]" in response.content
            or "[DEPLOYMENT DATE — REQUIRES AUTHORIZED REVIEW]" in response.content
        )
        assert (
            "[COMPLETION DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]" in response.content
            or "[COMPLETION DATE — REQUIRES AUTHORIZED REVIEW]" in response.content
        )
        assert (
            "[TERMINATION NOTICE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]" in response.content
            or "[TERMINATION NOTICE — REQUIRES AUTHORIZED REVIEW]" in response.content
        )

        # No unnormalized date placeholders in content
        assert "[DEPLOYMENT DATE].." not in response.content
        assert ".." not in response.content
        assert "!!" not in response.content
        assert "??" not in response.content

        # Missing information transformed to clean descriptive sentences without raw brackets
        assert "[START DATE]" not in response.missing_information
        assert "[END DATE]" not in response.missing_information
        assert "[DEPLOYMENT DATE]" not in response.missing_information
        assert "[COMPLETION DATE]" not in response.missing_information
        assert "[TERMINATION NOTICE]" not in response.missing_information

        assert any("Pilot start date: Not provided" in m for m in response.missing_information)
        assert any("Deployment date: Not provided" in m for m in response.missing_information)
        assert any("completion date" in m.lower() or "end date" in m.lower() for m in response.missing_information)
        assert any("Termination notice" in m for m in response.missing_information)

        # Semantic deduplication: completion date should appear only once
        completion_items = [m for m in response.missing_information if "completion" in m.lower() or "end date" in m.lower()]
        assert len(completion_items) == 1

    @pytest.mark.asyncio
    async def test_assist_document_supplied_vs_missing_workflows(self):
        """
        Comprehensive test covering Tests A through G:
        - TEST A: Missing information preserved as explicit review placeholder, no invented values.
        - TEST B: Supplied information replaces placeholders and is not flagged as missing.
        - TEST C: Startup name appears correctly and [STARTUP_NAME] cannot leak.
        - TEST D: Unauthorized finalization claims are replaced.
        - TEST E: Review label is exact invariant.
        - TEST F: Deterministic duration, sites, budget, and KPI values cannot be overwritten.
        - TEST G: Missing information deduplication keeps distinct fields and removes duplicates.
        """
        from unittest.mock import AsyncMock
        from services.ai_service import AIService
        from services.ollama_client import OllamaClient
        from schemas.requests import DocumentAssistanceRequest, DocumentType, KPIInput

        # 1. TEST A & Missing Data Workflow
        missing_req = DocumentAssistanceRequest(
            document_type=DocumentType.PILOT_AGREEMENT_DRAFT,
            challenge_title="Reduce waiting times at government hospitals",
            challenge_description="Outpatient congestion in district hospitals.",
            startup_name="QueueFlow Technologies",
            pilot_duration="60 days",
            pilot_sites=["District Hospital A", "District Hospital B"],
            pilot_budget="₹10 lakh",
            kpis=[
                KPIInput(name="Average Waiting Time", unit="minutes", baseline=90.0, target=54.0, direction="decrease")
            ],
            objectives=["Reduce outpatient waiting times by 40% across pilot sites"],
            additional_context=None,  # No start date or govt entity supplied
        )

        mock_raw_missing = {
            "title": "Pilot Agreement Draft",
            "content": (
                "## 1. Pilot Scope\n"
                "Pilot for [STARTUP_NAME].\n\n"
                "## 3. Duration & Timeline\n"
                "Commences on [START DATE] for a duration of 60 days.\n\n"
                "## 8. Budget & Payment Terms\n"
                "Total budget: ₹10 lakh.\n"
                "[PAYMENT SCHEDULE NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]\n\n"
                "## 15. Review & Authorized Signatories\n"
                "This agreement is the final version.\n"
            ),
            "sections": ["Pilot Scope", "Duration & Timeline", "Budget & Payment Terms", "Review & Authorized Signatories"],
            "missing_information": [
                "[START DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]",
                "Pilot start date: Not provided — requires authorized review.",
                "Dispute resolution and governing jurisdiction: Not provided — requires authorized review.",
            ],
        }

        mock_ollama_a = AsyncMock(spec=OllamaClient)
        mock_ollama_a.generate_json.return_value = mock_raw_missing

        service_a = AIService(ollama_client=mock_ollama_a)
        resp_a = await service_a.assist_document(missing_req)

        # TEST A & C: Placeholder preserved, startup name present, no template leaks
        assert "QueueFlow Technologies" in resp_a.content
        assert "[STARTUP_NAME]" not in resp_a.content
        assert (
            "[START DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]" in resp_a.content
            or "[START DATE — REQUIRES AUTHORIZED REVIEW]" in resp_a.content
        )
        assert any("Pilot start date: Not provided" in m for m in resp_a.missing_information)

        # TEST D & E: Finalization blocked, review label exact
        assert "is the final version" not in resp_a.content
        assert "This document has not been finalized" in resp_a.content
        assert resp_a.review_label == "AI-generated draft — requires authorized review."

        # TEST F: Deterministic authoritative numbers preserved
        assert "60 days" in resp_a.content
        assert "₹10 lakh" in resp_a.content
        assert "District Hospital A" in resp_a.content
        assert "District Hospital B" in resp_a.content
        assert "90" in resp_a.content
        assert "54" in resp_a.content
        assert "40%" in resp_a.content

        # TEST G: Missing info deduplication
        start_date_items = [m for m in resp_a.missing_information if "start date" in m.lower()]
        assert len(start_date_items) == 1
        assert "Dispute resolution and governing jurisdiction: Not provided — requires authorized review." in resp_a.missing_information

        # 2. TEST B — Supplied Information Workflow
        supplied_req = DocumentAssistanceRequest(
            document_type=DocumentType.PILOT_AGREEMENT_DRAFT,
            challenge_title="Reduce waiting times at government hospitals",
            challenge_description="Outpatient congestion.",
            startup_name="QueueFlow Technologies",
            pilot_duration="60 days",
            pilot_sites=["District Hospital A", "District Hospital B"],
            pilot_budget="₹10 lakh",
            kpis=[
                KPIInput(name="Average Waiting Time", unit="minutes", baseline=90.0, target=54.0, direction="decrease")
            ],
            objectives=["Reduce outpatient waiting times by 40% across pilot sites"],
            additional_context=(
                "Start date: 2026-09-15. "
                "Government entity: Department of Health and Family Welfare. "
                "Payment schedule: 50% on deployment configuration, 50% on final pilot evaluation. "
                "Cybersecurity: ISO 27001 certified and CERT-In compliant."
            ),
        )

        mock_raw_supplied = {
            "title": "Pilot Agreement Draft",
            "content": (
                "## 1. Pilot Scope\n"
                "Pilot between [GOVERNMENT_NAME] and [STARTUP_NAME].\n\n"
                "## 3. Duration & Timeline\n"
                "Commences on [START DATE] for a duration of 60 days.\n\n"
                "## 8. Budget & Payment Terms\n"
                "Total budget: ₹10 lakh.\n"
                "[PAYMENT SCHEDULE NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]\n\n"
                "## 11. Cybersecurity Responsibilities\n"
                "[CYBERSECURITY STANDARDS — REQUIRES AUTHORIZED REVIEW]\n"
            ),
            "sections": ["Pilot Scope", "Duration & Timeline", "Budget & Payment Terms", "Cybersecurity Responsibilities"],
            "missing_information": [
                "[START DATE]",
                "[PAYMENT SCHEDULE NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]",
            ],
        }

        mock_ollama_b = AsyncMock(spec=OllamaClient)
        mock_ollama_b.generate_json.return_value = mock_raw_supplied

        service_b = AIService(ollama_client=mock_ollama_b)
        resp_b = await service_b.assist_document(supplied_req)

        # Supplied values appear
        assert "2026-09-15" in resp_b.content
        assert "Department of Health and Family Welfare" in resp_b.content
        assert "50% on deployment configuration, 50% on final pilot evaluation" in resp_b.content
        assert "ISO 27001 certified and CERT-In compliant" in resp_b.content

        # Generic placeholders for supplied fields are gone
        assert "[START DATE — NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]" not in resp_b.content
        assert "[START DATE — REQUIRES AUTHORIZED REVIEW]" not in resp_b.content
        assert "[STARTUP_NAME]" not in resp_b.content
        assert "[GOVERNMENT_NAME]" not in resp_b.content

        # Supplied fields are not flagged in missing_information
        assert not any("Pilot start date" in m for m in resp_b.missing_information)
        assert not any("Payment milestone" in m for m in resp_b.missing_information)
        assert not any("Cybersecurity" in m for m in resp_b.missing_information)
        assert not any("Government entity" in m for m in resp_b.missing_information)

        # Unsupplied fields remain in missing_information
        assert any("Intellectual property" in m or "IP" in m for m in resp_b.missing_information)
        assert any("signator" in m.lower() for m in resp_b.missing_information)
