"""
Tests for Brain 2 — Semantic Matching Engine

Validates:
1. Tokenization and Jaccard similarity
2. Curated technology synonym expansion (e.g., QMS -> queue management)
3. Partial / semantic technology matching vs exact set intersection
4. Domain hierarchy and cluster matching (e.g., Public Health -> Healthcare)
5. TF-IDF text similarity
6. Experience relevance scoring
7. Integration with DecisionEngine.calculate_match_score()
"""

from __future__ import annotations

import pytest

from schemas.requests import (
    ChallengeContext,
    MatchExplanationRequest,
    StartupProfile,
)
from services.decision_engine import DecisionEngine
from services.semantic import SemanticMatcher


class TestSemanticMatcherUnit:

    def test_tokenize_and_stop_words(self):
        tokens = SemanticMatcher.tokenize("AI-powered Queue Management System for Hospitals")
        assert "queue" in tokens
        assert "management" in tokens
        assert "hospitals" in tokens
        assert "for" not in tokens  # stop word
        assert "system" not in tokens  # stop word

    def test_expand_technology(self):
        expanded = SemanticMatcher.expand_technology("queue management")
        assert "qms" in expanded
        assert "token system" in expanded
        assert "queue" in expanded

    def test_technology_similarity_exact(self):
        sim = SemanticMatcher.technology_similarity(
            ["queue management", "workflow automation"],
            ["queue management", "workflow automation"],
        )
        assert sim == 1.0

    def test_technology_similarity_synonyms(self):
        # Startup uses "QMS" and "RPA" while challenge requests "queue management" and "workflow automation"
        sim = SemanticMatcher.technology_similarity(
            ["queue management", "workflow automation"],
            ["qms", "rpa"],
        )
        assert sim >= 0.85, f"Synonym match should score >= 0.85, got {sim}"

    def test_technology_similarity_partial(self):
        # Startup has predictive analytics and smart queue
        sim = SemanticMatcher.technology_similarity(
            ["queue management"],
            ["smart queue flow", "iot sensors"],
        )
        assert sim >= 0.7, f"Partial tech match should score >= 0.7, got {sim}"

    def test_technology_similarity_no_match(self):
        sim = SemanticMatcher.technology_similarity(
            ["blockchain"],
            ["agriculture drone"],
        )
        assert sim == 0.0

    def test_domain_similarity_exact(self):
        sim = SemanticMatcher.domain_similarity("Healthcare", "healthcare")
        assert sim == 1.0

    def test_domain_similarity_substring(self):
        sim = SemanticMatcher.domain_similarity("Healthcare", "Public Healthcare")
        assert sim == 0.85

    def test_domain_similarity_hierarchy(self):
        # "Public Health" is in Healthcare hierarchy
        sim = SemanticMatcher.domain_similarity("Healthcare", "Public Health")
        assert sim >= 0.80

    def test_domain_similarity_smart_cities(self):
        sim = SemanticMatcher.domain_similarity("Smart Cities", "Traffic Management")
        assert sim >= 0.80

    def test_domain_similarity_unrelated(self):
        sim = SemanticMatcher.domain_similarity("Healthcare", "Agriculture")
        assert sim == 0.0

    def test_text_similarity_tf_idf(self):
        text_a = "hospital patient queue management system"
        text_b = "patient queue flow in hospital outpatient department"
        sim = SemanticMatcher.text_similarity(text_a, text_b)
        assert sim > 0.4

        sim_zero = SemanticMatcher.text_similarity("solar power farm", "hospital surgery")
        assert sim_zero == 0.0

    def test_experience_relevance(self):
        exp_gov = "Deployed QMS at 5 district government hospitals across Maharashtra"
        rel_gov = SemanticMatcher.evaluate_experience_relevance(exp_gov, "Healthcare", ["queue management"])
        assert rel_gov >= 0.9

        exp_irrelevant = "Built mobile e-commerce consumer gaming app"
        rel_irrel = SemanticMatcher.evaluate_experience_relevance(exp_irrelevant, "Healthcare", ["queue management"])
        assert rel_irrel <= 0.6


class TestDecisionEngineSemanticIntegration:

    def test_synonym_tech_matches_better_than_zero(self):
        """
        Previously, 'QMS' vs 'queue management' yielded 0 tech fit.
        With SemanticMatcher, it yields high tech fit (> 20 / 30).
        """
        request = MatchExplanationRequest(
            challenge=ChallengeContext(
                title="Hospital Outpatient Management",
                description="Long queues in hospitals",
                domain="Healthcare",
                technology_categories=["queue management"],
            ),
            startup=StartupProfile(
                name="QueueTech",
                description="Specialized in hospital QMS and patient token systems",
                technologies=["qms", "token system"],
                domain="Public Health",
                experience="Implemented token system in 2 government hospitals",
                deployments=["Civil Hospital Nashik"],
            ),
        )
        score = DecisionEngine.calculate_match_score(request)
        # Tech score should be high due to synonym expansion (was 0 previously)
        assert score.technology_fit >= 24.0, f"Expected tech fit >= 24.0, got {score.technology_fit}"
        # Domain score should be >= 15 due to hierarchy matching (was 0 previously)
        assert score.domain_fit >= 15.0, f"Expected domain fit >= 15.0, got {score.domain_fit}"
        assert score.total > 50.0

    def test_deterministic_reproducibility(self):
        request = MatchExplanationRequest(
            challenge=ChallengeContext(
                title="Smart City Traffic",
                description="Traffic congestion control",
                domain="Smart Cities",
                technology_categories=["traffic management", "computer vision"],
            ),
            startup=StartupProfile(
                name="VisionFlow",
                description="AI-driven video analytics for intelligent transport",
                technologies=["video analytics", "itms"],
                domain="Urban Governance",
                experience="Municipal corporation traffic surveillance pilot",
                deployments=["Smart City Command Center"],
            ),
        )
        score1 = DecisionEngine.calculate_match_score(request)
        score2 = DecisionEngine.calculate_match_score(request)
        assert score1.total == score2.total
        assert score1.technology_fit == score2.technology_fit
        assert score1.domain_fit == score2.domain_fit
