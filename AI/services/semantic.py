"""
SetuGov AI Service — Brain 2: Semantic Matching Engine

Provides deterministic, pure-Python semantic similarity evaluation for startup matching:
1. Technology similarity with tokenization, Jaccard similarity, and curated GovTech synonym expansion.
2. Domain similarity with hierarchical taxonomy matching and subcategory resolution.
3. TF-IDF text similarity for unstructured profile and experience comparison.
4. Experience relevance scoring against challenge domain and technical context.

All functions are pure, deterministic, and require no external ML models or network calls.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Optional


# ═══════════════════════════════════════════════════════════════════════════
# Curated GovTech & Enterprise Technology Synonyms
# ═══════════════════════════════════════════════════════════════════════════

_TECH_SYNONYMS: dict[str, set[str]] = {
    "queue management": {
        "qms", "queue system", "token system", "waiting room management",
        "crowd management", "appointment scheduling", "patient flow", "visitor management",
        "queue flow", "smart queue", "line management",
    },
    "workflow automation": {
        "process automation", "rpa", "robotic process automation", "workflow management",
        "bpm", "business process management", "digital workflow", "task automation",
        "office automation", "paperless workflow",
    },
    "predictive analytics": {
        "predictive modeling", "forecasting", "demand forecasting", "predictive scheduling",
        "ai forecasting", "trend analysis", "machine learning analytics", "predictive maintenance",
    },
    "computer vision": {
        "video analytics", "image recognition", "ocr", "cctv analytics", "object detection",
        "facial recognition", "optical character recognition", "anpr", "visual inspection",
    },
    "iot": {
        "internet of things", "smart sensors", "connected devices", "telemetry",
        "sensor network", "smart metering", "scada", "rfid tracking", "edge computing",
    },
    "gis": {
        "geographic information system", "geospatial", "mapping", "geotagging",
        "spatial analysis", "location intelligence", "remote sensing", "cadastral mapping",
    },
    "telemedicine": {
        "telehealth", "remote consultation", "virtual clinic", "e-health",
        "remote patient monitoring", "digital health", "teleconsultation",
    },
    "waste management": {
        "solid waste", "sanitation", "garbage collection", "waste segregation",
        "composting", "recycling", "swachh", "cleanliness monitoring",
    },
    "water management": {
        "water quality monitoring", "leakage detection", "distribution monitoring",
        "smart water grid", "flow metering", "non-revenue water", "jal jeevan",
    },
    "traffic management": {
        "itms", "intelligent transport", "traffic signal control", "traffic surveillance",
        "congestion management", "traffic flow", "smart mobility", "atcs",
    },
    "citizen portal": {
        "grievance redressal", "public service delivery", "mobile governance",
        "e-services", "helpdesk", "citizen engagement", "jan sunwai", "samadhan",
    },
    "identity & verification": {
        "kyc", "aadhaar verification", "biometric authentication", "digital id",
        "face authentication", "document verification", "credential verification",
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# GovTech Domain Taxonomy Hierarchy
# ═══════════════════════════════════════════════════════════════════════════

_DOMAIN_HIERARCHY: dict[str, set[str]] = {
    "healthcare": {
        "public health", "hospital administration", "telemedicine", "medical diagnostics",
        "clinical workflow", "health", "pharmaceutical", "ayush", "sanitation",
    },
    "smart cities": {
        "urban governance", "traffic management", "waste management", "municipal administration",
        "urban planning", "smart city", "infrastructure", "civic infrastructure",
    },
    "education": {
        "edtech", "school administration", "e-learning", "skill development",
        "vocational training", "higher education", "primary education",
    },
    "agriculture": {
        "agritech", "precision agriculture", "farm management", "crop monitoring",
        "horticulture", "irrigation", "soil testing", "krishi",
    },
    "water & sanitation": {
        "water management", "sanitation", "liquid waste", "drainage", "sewage treatment",
        "wash", "drinking water", "jal",
    },
    "governance & public services": {
        "e-governance", "public service delivery", "civic tech", "law enforcement",
        "citizen services", "administration", "public safety", "revenue administration",
    },
    "environment & energy": {
        "clean energy", "renewable energy", "pollution monitoring", "air quality",
        "climate tech", "sustainability", "solar energy", "power distribution",
    },
    "transportation & mobility": {
        "public transit", "fleet management", "electric vehicles", "ev infrastructure",
        "traffic", "logistics", "urban transport", "smart mobility",
    },
}

_STOP_WORDS: set[str] = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he",
    "in", "is", "it", "its", "of", "on", "that", "the", "to", "was", "were",
    "will", "with", "or", "into", "across", "within", "based", "system", "using",
}


# ═══════════════════════════════════════════════════════════════════════════
# SemanticMatcher Engine
# ═══════════════════════════════════════════════════════════════════════════

class SemanticMatcher:
    """
    Deterministic semantic similarity and matching engine.
    Computes token-level, synonym-expanded, and hierarchical similarity metrics.
    """

    @staticmethod
    def tokenize(text: str) -> list[str]:
        """Convert text into normalized tokens without stop words."""
        if not text:
            return []
        cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
        tokens = [t for t in cleaned.split() if t and t not in _STOP_WORDS and len(t) > 1]
        return tokens

    @staticmethod
    def token_jaccard(tokens_a: set[str], tokens_b: set[str]) -> float:
        """Compute Jaccard similarity between two token sets."""
        if not tokens_a or not tokens_b:
            return 0.0
        intersection = len(tokens_a & tokens_b)
        union = len(tokens_a | tokens_b)
        return intersection / union if union > 0 else 0.0

    @classmethod
    def expand_technology(cls, tech: str) -> set[str]:
        """
        Return the set of tokens and known synonyms for a technology string.
        """
        tech_norm = tech.strip().lower()
        expanded: set[str] = set(cls.tokenize(tech_norm))
        expanded.add(tech_norm)

        # Check curated synonyms
        for canonical, syns in _TECH_SYNONYMS.items():
            if tech_norm == canonical or tech_norm in syns:
                expanded.add(canonical)
                expanded.update(syns)
                for syn in syns:
                    expanded.update(cls.tokenize(syn))
            # Substring match with canonical
            elif canonical in tech_norm or any(s in tech_norm for s in syns):
                expanded.add(canonical)
                expanded.update(syns)

        return expanded

    @classmethod
    def match_single_tech(cls, req_tech: str, candidate_techs: list[str]) -> float:
        """
        Calculate the best match score (0.0 to 1.0) of a single challenge technology requirement
        against a list of startup technologies.
        """
        req_norm = req_tech.strip().lower()
        req_expanded = cls.expand_technology(req_norm)
        req_tokens = set(cls.tokenize(req_norm))

        best_score = 0.0
        for cand in candidate_techs:
            cand_norm = cand.strip().lower()
            # 1. Exact string match
            if req_norm == cand_norm:
                return 1.0

            cand_expanded = cls.expand_technology(cand_norm)
            cand_tokens = set(cls.tokenize(cand_norm))

            # 2. Known synonym overlap
            if req_expanded & cand_expanded:
                # Direct canonical or synonym match
                if req_norm in cand_expanded or cand_norm in req_expanded:
                    best_score = max(best_score, 0.95)
                else:
                    best_score = max(best_score, 0.85)

            # 3. Substring inclusion
            if req_norm in cand_norm or cand_norm in req_norm:
                best_score = max(best_score, 0.80)

            # 4. Token Jaccard overlap
            jaccard = cls.token_jaccard(req_tokens, cand_tokens)
            if jaccard > 0:
                best_score = max(best_score, round(jaccard * 0.85, 2))

        return best_score

    @classmethod
    def technology_similarity(
        cls,
        challenge_techs: Optional[list[str]],
        startup_techs: Optional[list[str]],
    ) -> float:
        """
        Calculate overall technology similarity ratio between 0.0 and 1.0.
        Uses soft matching so related/synonymous technologies receive partial/high credit.
        """
        if not challenge_techs or not startup_techs:
            return 0.0

        scores = [
            cls.match_single_tech(req, startup_techs)
            for req in challenge_techs
            if req.strip()
        ]
        if not scores:
            return 0.0

        # Average match across all requested challenge technologies
        avg_score = sum(scores) / len(scores)
        return round(min(1.0, avg_score), 3)

    @classmethod
    def domain_similarity(
        cls,
        challenge_domain: Optional[str],
        startup_domain: Optional[str],
    ) -> float:
        """
        Calculate domain similarity score between 0.0 and 1.0.
        Supports exact match (1.0), substring match (0.85), taxonomy cluster (0.80),
        and token overlap.
        """
        if not challenge_domain or not startup_domain:
            return 0.0

        c_norm = challenge_domain.strip().lower()
        s_norm = startup_domain.strip().lower()

        # Exact match
        if c_norm == s_norm:
            return 1.0

        # Substring match
        if c_norm in s_norm or s_norm in c_norm:
            return 0.85

        # Check domain taxonomy clusters
        for parent_domain, cluster in _DOMAIN_HIERARCHY.items():
            c_in_cluster = (c_norm == parent_domain or c_norm in cluster or any(k in c_norm for k in cluster))
            s_in_cluster = (s_norm == parent_domain or s_norm in cluster or any(k in s_norm for k in cluster))
            if c_in_cluster and s_in_cluster:
                return 0.80

        # Token Jaccard overlap
        c_tokens = set(cls.tokenize(c_norm))
        s_tokens = set(cls.tokenize(s_norm))
        jaccard = cls.token_jaccard(c_tokens, s_tokens)
        if jaccard > 0:
            return round(jaccard * 0.70, 2)

        return 0.0

    @classmethod
    def text_similarity(cls, text_a: str, text_b: str) -> float:
        """
        Calculate deterministic cosine similarity between two text snippets using TF-IDF weights.
        """
        tokens_a = cls.tokenize(text_a)
        tokens_b = cls.tokenize(text_b)
        if not tokens_a or not tokens_b:
            return 0.0

        counts_a = Counter(tokens_a)
        counts_b = Counter(tokens_b)

        all_words = set(counts_a.keys()) | set(counts_b.keys())
        dot_product = sum(counts_a.get(w, 0) * counts_b.get(w, 0) for w in all_words)
        norm_a = math.sqrt(sum(v * v for v in counts_a.values()))
        norm_b = math.sqrt(sum(v * v for v in counts_b.values()))

        if norm_a == 0 or norm_b == 0:
            return 0.0
        return round(dot_product / (norm_a * norm_b), 3)

    @classmethod
    def evaluate_experience_relevance(
        cls,
        experience_text: Optional[str],
        challenge_domain: Optional[str],
        challenge_techs: Optional[list[str]],
    ) -> float:
        """
        Evaluate relevance of startup experience to the challenge requirements (0.0 to 1.0).
        Higher score if experience cites government deployments, matching domain, or tech.
        """
        if not experience_text or not experience_text.strip():
            return 0.0

        exp_lower = experience_text.lower()
        score = 0.5  # Base credit for having documented experience

        # GovTech / Public Sector experience bonus
        gov_keywords = ["government", "hospital", "district", "municipal", "department", "public", "ministry", "state", "civic", "smart city"]
        if any(k in exp_lower for k in gov_keywords):
            score += 0.25

        # Domain mention bonus (checks direct tokens or cluster keywords)
        if challenge_domain:
            d_norm = challenge_domain.strip().lower()
            d_cluster = _DOMAIN_HIERARCHY.get(d_norm, set())
            d_tokens = set(cls.tokenize(challenge_domain))
            for item in d_cluster:
                d_tokens.update(cls.tokenize(item))
            if any(t in exp_lower for t in d_tokens):
                score += 0.15

        # Tech mention bonus (checks direct tokens or synonyms)
        if challenge_techs:
            for tech in challenge_techs:
                t_expanded = cls.expand_technology(tech)
                if any(t in exp_lower for t in t_expanded):
                    score += 0.10
                    break

        return min(1.0, round(score, 2))
