"""
SetuGov AI Service — Cross-Brain Confidence & Evidence Assessment Engine

Provides deterministic, auditable scoring of:
1. Input data completeness (0.0 to 100.0) across all brain requests.
2. Evidence quality grading ('Strong', 'Moderate', 'Weak', 'Insufficient Evidence').
3. Overall assessment confidence level ('HIGH', 'MEDIUM', 'LOW') with reasoning.

All calculations are pure Python, deterministic, and auditable.
"""

from __future__ import annotations

from typing import Any, Optional


class ConfidenceAssessor:
    """
    Deterministic confidence and evidence grading framework.
    """

    @staticmethod
    def assess_input_completeness(request: Any) -> float:
        """
        Measure the ratio of populated fields in a domain request.
        Returns a score between 0.0 and 100.0.
        """
        if not request:
            return 0.0

        checked_fields = 0
        present_fields = 0

        # Inspect common models
        if hasattr(request, "problem"):
            p = request.problem
            for f in ["title", "description", "current_process", "baseline", "location"]:
                checked_fields += 1
                if getattr(p, f, None):
                    present_fields += 1

        if hasattr(request, "outcome"):
            o = request.outcome
            if o:
                for f in ["desired_outcome", "success_definition"]:
                    checked_fields += 1
                    if getattr(o, f, None):
                        present_fields += 1

        if hasattr(request, "measurement"):
            m = request.measurement
            checked_fields += 1
            if m and getattr(m, "kpis", None):
                present_fields += 1

        if hasattr(request, "pilot"):
            pi = request.pilot
            if pi:
                for f in ["duration", "sites", "budget"]:
                    checked_fields += 1
                    if getattr(pi, f, None):
                        present_fields += 1

        if hasattr(request, "requirements"):
            r = request.requirements
            if r:
                for f in ["technologies", "domain", "eligibility", "documents"]:
                    checked_fields += 1
                    if getattr(r, f, None):
                        present_fields += 1

        # Brain 3 Proposal
        if hasattr(request, "proposal"):
            prop = request.proposal
            if prop:
                for f in [
                    "summary", "technical_approach", "implementation_timeline",
                    "estimated_cost", "expected_impact", "team_composition", "past_experience"
                ]:
                    checked_fields += 1
                    if getattr(prop, f, None):
                        present_fields += 1

        if hasattr(request, "startup"):
            su = request.startup
            if su:
                for f in ["name", "description", "technologies", "domain", "experience", "deployments"]:
                    checked_fields += 1
                    if getattr(su, f, None):
                        present_fields += 1

        # Brain 4 Pilot
        if hasattr(request, "kpi_results"):
            checked_fields += 1
            if request.kpi_results:
                present_fields += 1

        if hasattr(request, "milestones"):
            checked_fields += 1
            if request.milestones:
                present_fields += 1

        if hasattr(request, "evidence"):
            checked_fields += 1
            if request.evidence:
                present_fields += 1

        if checked_fields == 0:
            return 50.0

        return round((present_fields / checked_fields) * 100.0, 1)

    @staticmethod
    def assess_evidence_quality(evidence_items: Optional[list[Any]]) -> str:
        """
        Grade evidence quality:
        - Strong: Multiple items, all or majority verified by independent third parties
        - Moderate: Documented items but unverified or single-source
        - Weak: Incomplete descriptions or self-reported statements without documentation
        - Insufficient: No evidence items provided
        """
        if not evidence_items:
            return "Insufficient Evidence — no empirical validation or audit records provided."

        total = len(evidence_items)
        verified_count = sum(
            1 for e in evidence_items
            if getattr(e, "verified", False) is True
        )

        if total >= 2 and verified_count == total:
            return "Strong — multiple independently verified operational evidence records."
        elif total >= 1 and verified_count > 0:
            return "Moderate — verified records present alongside unverified operational submissions."
        elif total >= 1:
            return "Moderate — operational evidence provided but lacks independent third-party verification."
        else:
            return "Weak — self-reported claims without verifiable supporting documentation."

    @staticmethod
    def compute_confidence(
        completeness: float,
        evidence_quality_str: Optional[str] = None,
        has_critical_gaps: bool = False,
    ) -> tuple[str, str]:
        """
        Calculate confidence level ('HIGH', 'MEDIUM', 'LOW') and human-readable reasoning.
        """
        is_strong_evidence = bool(evidence_quality_str and "Strong" in evidence_quality_str)
        is_insufficient = bool(not evidence_quality_str or "Insufficient" in evidence_quality_str)

        if completeness >= 80.0 and not has_critical_gaps and not is_insufficient:
            if is_strong_evidence:
                return (
                    "HIGH",
                    "Input parameters are comprehensive (>=80% complete) with verified empirical evidence.",
                )
            else:
                return (
                    "MEDIUM",
                    "Input parameters are comprehensive, but operational evidence relies partially on self-reported data.",
                )
        elif completeness >= 50.0 and not has_critical_gaps:
            return (
                "MEDIUM",
                "Core parameters are available (>50% complete), though additional operational or validation data is recommended.",
            )
        else:
            reasons = []
            if completeness < 50.0:
                reasons.append(f"low input completeness ({completeness:.1f}%)")
            if has_critical_gaps:
                reasons.append("critical baseline or verification gaps")
            if is_insufficient:
                reasons.append("lack of empirical validation records")
            return (
                "LOW",
                f"Confidence is limited due to {', '.join(reasons)}.",
            )
