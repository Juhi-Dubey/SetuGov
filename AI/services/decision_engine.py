"""
SetuGov AI Service — Deterministic Decision Engine

Pure Python deterministic logic for:
- Challenge readiness scoring (Brain 1)
- Startup match scoring (Brain 2)
- KPI status calculation (Brain 4)
- SCALE / EXTEND / STOP recommendation (Decision Engine)

NO LLM calls. All calculations are reproducible and auditable.
"""

from __future__ import annotations

import logging
from typing import Optional

from schemas.requests import (
    ChallengeCopilotRequest,
    KPIResult,
    MatchExplanationRequest,
    PilotIntelligenceRequest,
)
from schemas.responses import (
    DecisionCondition,
    DecisionEngineResponse,
    DecisionInput,
    DecisionRecommendation,
    KPIAnalysis,
    KPIStatus,
    MatchScoreBreakdown,
    ReadinessScore,
)

logger = logging.getLogger("setugov.ai.decision")


class DecisionEngine:
    """
    Deterministic rules engine for SetuGov.

    Every method is a pure function of its inputs — no randomness,
    no LLM calls, no side effects beyond logging.
    """

    @staticmethod
    def is_measurable_baseline(baseline: Optional[str]) -> bool:
        """
        Check if a text baseline provides measurable data rather than
        stating that data is absent, unmeasured, or unavailable.

        Distinguishes:
        1. Measurable baseline provided (e.g. "Average waiting time: 90 minutes", "90 mins") -> True
        2. Baseline explicitly unavailable / unmeasured (e.g. "Average waiting time is currently not consistently measured.") -> False
        3. Baseline completely absent (None or empty) -> False
        """
        if not baseline or not baseline.strip():
            return False

        text = baseline.strip().lower()

        # Explicit unavailability / unmeasured phrases
        unmeasured_indicators = [
            "not measured",
            "not consistently measured",
            "not currently measured",
            "currently not measured",
            "not tracked",
            "not recorded",
            "not available",
            "not provided",
            "no baseline",
            "not established",
            "not yet measured",
            "not known",
            "unmeasured",
            "unavailable",
            "unknown",
            "no data",
            "none",
            "n/a",
            "na",
            "nil",
            "tbd",
            "to be determined",
            "pending measurement",
            "cannot be measured",
        ]

        for indicator in unmeasured_indicators:
            if indicator in text:
                return False

        return len(text) > 2

    # ══════════════════════════════════════════════════════════════════
    # Brain 1 — Challenge Readiness Score
    # ══════════════════════════════════════════════════════════════════

    @staticmethod
    def calculate_readiness(request: ChallengeCopilotRequest) -> ReadinessScore:
        """
        Calculate deterministic challenge readiness score.

        Weights (total = 100):
            Problem clarity             20
            Baseline completeness       15
            Outcome measurability       20
            KPI completeness            20
            Pilot readiness             10
            Requirements clarity        10
            Evidence planning            5
        """
        # ── Problem clarity (0–20) ────────────────────────────────────
        problem_score = 0.0
        if request.problem.title and len(request.problem.title.strip()) > 5:
            problem_score += 6.0
        if request.problem.description and len(request.problem.description.strip()) > 20:
            problem_score += 8.0
        if request.problem.current_process:
            problem_score += 3.0
        if request.problem.location:
            problem_score += 3.0

        # ── Baseline completeness (0–15) ──────────────────────────────
        baseline_score = 0.0
        if request.problem.baseline and DecisionEngine.is_measurable_baseline(request.problem.baseline):
            baseline_score += 8.0
        if request.measurement and request.measurement.kpis:
            baselines_provided = sum(
                1 for k in request.measurement.kpis if k.baseline is not None
            )
            total_kpis = len(request.measurement.kpis)
            if total_kpis > 0:
                baseline_score += 7.0 * (baselines_provided / total_kpis)

        # ── Outcome measurability (0–20) ──────────────────────────────
        outcome_score = 0.0
        if request.outcome:
            if request.outcome.desired_outcome:
                outcome_score += 10.0
            if request.outcome.success_definition:
                outcome_score += 10.0

        # ── KPI completeness (0–20) ──────────────────────────────────
        kpi_score = 0.0
        if request.measurement and request.measurement.kpis:
            kpis = request.measurement.kpis
            n = len(kpis)
            if n > 0:
                kpi_score += min(8.0, n * 2.0)  # up to 4 KPIs
                # Quality bonus
                has_unit = sum(1 for k in kpis if k.unit) / n
                has_target = sum(1 for k in kpis if k.target is not None) / n
                has_direction = sum(1 for k in kpis if k.direction) / n
                has_method = sum(1 for k in kpis if k.measurement_method) / n
                kpi_score += 3.0 * has_unit
                kpi_score += 3.0 * has_target
                kpi_score += 3.0 * has_direction
                kpi_score += 3.0 * has_method

        # ── Pilot readiness (0–10) ───────────────────────────────────
        pilot_score = 0.0
        if request.pilot:
            if request.pilot.duration:
                pilot_score += 4.0
            if request.pilot.sites:
                pilot_score += 3.0
            if request.pilot.budget:
                pilot_score += 3.0

        # ── Requirements clarity (0–10) ──────────────────────────────
        req_score = 0.0
        if request.requirements:
            if request.requirements.technologies:
                req_score += 3.0
            if request.requirements.domain:
                req_score += 3.0
            if request.requirements.eligibility:
                req_score += 2.0
            if request.requirements.documents:
                req_score += 2.0

        # ── Evidence planning (0–5) ──────────────────────────────────
        evidence_score = 0.0
        if request.measurement and request.measurement.kpis:
            methods = sum(
                1 for k in request.measurement.kpis if k.measurement_method
            )
            total = len(request.measurement.kpis)
            if total > 0:
                evidence_score = 5.0 * (methods / total)

        # ── Clamp all to max ─────────────────────────────────────────
        problem_score = min(problem_score, 20.0)
        baseline_score = min(baseline_score, 15.0)
        outcome_score = min(outcome_score, 20.0)
        kpi_score = min(kpi_score, 20.0)
        pilot_score = min(pilot_score, 10.0)
        req_score = min(req_score, 10.0)
        evidence_score = min(evidence_score, 5.0)

        total = (
            problem_score
            + baseline_score
            + outcome_score
            + kpi_score
            + pilot_score
            + req_score
            + evidence_score
        )

        return ReadinessScore(
            score=round(total, 1),
            problem_clarity=round(problem_score, 1),
            baseline_completeness=round(baseline_score, 1),
            outcome_measurability=round(outcome_score, 1),
            kpi_completeness=round(kpi_score, 1),
            pilot_readiness=round(pilot_score, 1),
            requirements_clarity=round(req_score, 1),
            evidence_planning=round(evidence_score, 1),
        )

    # ══════════════════════════════════════════════════════════════════
    # Brain 2 — Startup Match Score
    # ══════════════════════════════════════════════════════════════════

    @staticmethod
    def calculate_match_score(request: MatchExplanationRequest) -> MatchScoreBreakdown:
        """
        Deterministic weighted startup match score.

        Weights:
            Technology Fit      30%
            Domain Fit          25%
            Readiness           20%
            Experience          15%
            Deployment Fit      10%
        """
        challenge = request.challenge
        startup = request.startup

        # ── Technology Fit (0–30) ─────────────────────────────────────
        tech_score = 0.0
        if challenge.technology_categories and startup.technologies:
            challenge_tech = {t.lower().strip() for t in challenge.technology_categories}
            startup_tech = {t.lower().strip() for t in startup.technologies}
            if challenge_tech:
                overlap = len(challenge_tech & startup_tech)
                tech_score = 30.0 * min(1.0, overlap / len(challenge_tech))
        elif startup.technologies:
            # Startup has tech but no challenge tech specified — partial credit
            tech_score = 10.0

        # ── Domain Fit (0–25) ─────────────────────────────────────────
        domain_score = 0.0
        if challenge.domain and startup.domain:
            if challenge.domain.lower().strip() == startup.domain.lower().strip():
                domain_score = 25.0
            elif (
                challenge.domain.lower().strip() in startup.domain.lower()
                or startup.domain.lower().strip() in challenge.domain.lower()
            ):
                domain_score = 15.0
        elif startup.domain:
            domain_score = 5.0

        # ── Readiness (0–20) ─────────────────────────────────────────
        readiness_score = 0.0
        if startup.description and len(startup.description.strip()) > 20:
            readiness_score += 5.0
        if startup.technologies:
            readiness_score += 5.0
        if startup.team_size and startup.team_size > 0:
            readiness_score += 5.0
        if startup.certifications:
            readiness_score += 5.0

        # ── Experience (0–15) ─────────────────────────────────────────
        experience_score = 0.0
        if startup.experience:
            experience_score += 8.0
        if startup.deployments:
            experience_score += min(7.0, len(startup.deployments) * 3.5)

        # ── Deployment Fit (0–10) ─────────────────────────────────────
        deployment_score = 0.0
        if startup.deployments:
            deployment_score += 5.0
        if startup.location and challenge.location:
            if (
                startup.location.lower().strip()
                == challenge.location.lower().strip()
            ):
                deployment_score += 5.0
            else:
                deployment_score += 2.0
        elif startup.location:
            deployment_score += 2.0

        # ── Clamp ────────────────────────────────────────────────────
        tech_score = min(round(tech_score, 1), 30.0)
        domain_score = min(round(domain_score, 1), 25.0)
        readiness_score = min(round(readiness_score, 1), 20.0)
        experience_score = min(round(experience_score, 1), 15.0)
        deployment_score = min(round(deployment_score, 1), 10.0)

        total = tech_score + domain_score + readiness_score + experience_score + deployment_score

        return MatchScoreBreakdown(
            technology_fit=tech_score,
            domain_fit=domain_score,
            readiness=readiness_score,
            experience=experience_score,
            deployment_fit=deployment_score,
            total=round(total, 1),
        )

    # ══════════════════════════════════════════════════════════════════
    # Brain 4 — KPI Calculations
    # ══════════════════════════════════════════════════════════════════

    @staticmethod
    def calculate_kpi_status(kpi: KPIResult) -> KPIAnalysis:
        """
        Deterministic KPI status calculation.

        Status:
            ON_TARGET         — achieved ≥ 90% of target improvement
            NEAR_TARGET       — achieved 60–89% of target improvement
            BELOW_TARGET      — achieved < 60% of target improvement
            INSUFFICIENT_DATA — missing baseline, target, or actual
        """
        if kpi.actual is None or kpi.baseline is None or kpi.target is None:
            return KPIAnalysis(
                name=kpi.name,
                baseline=kpi.baseline,
                target=kpi.target,
                actual=kpi.actual,
                improvement_pct=None,
                target_achievement_pct=None,
                status=KPIStatus.INSUFFICIENT_DATA,
            )

        direction = (kpi.direction or "decrease").lower()

        # Calculate improvement percentage
        if kpi.baseline != 0:
            if direction == "decrease":
                improvement_pct = ((kpi.baseline - kpi.actual) / kpi.baseline) * 100
            else:
                improvement_pct = ((kpi.actual - kpi.baseline) / kpi.baseline) * 100
        else:
            improvement_pct = 0.0

        # Calculate target achievement percentage
        target_delta = abs(kpi.target - kpi.baseline)
        if target_delta != 0:
            if direction == "decrease":
                actual_delta = kpi.baseline - kpi.actual
            else:
                actual_delta = kpi.actual - kpi.baseline
            target_achievement_pct = (actual_delta / target_delta) * 100
        else:
            target_achievement_pct = 100.0 if kpi.actual == kpi.target else 0.0

        # Determine status
        if target_achievement_pct >= 90:
            status = KPIStatus.ON_TARGET
        elif target_achievement_pct >= 60:
            status = KPIStatus.NEAR_TARGET
        else:
            status = KPIStatus.BELOW_TARGET

        return KPIAnalysis(
            name=kpi.name,
            baseline=kpi.baseline,
            target=kpi.target,
            actual=kpi.actual,
            improvement_pct=round(improvement_pct, 1),
            target_achievement_pct=round(target_achievement_pct, 1),
            status=status,
        )

    @staticmethod
    def calculate_all_kpis(kpi_results: list[KPIResult]) -> list[KPIAnalysis]:
        """Calculate status for all KPIs."""
        return [DecisionEngine.calculate_kpi_status(kpi) for kpi in kpi_results]

    @staticmethod
    def calculate_milestone_completion(
        milestones: list,
    ) -> Optional[float]:
        """Calculate milestone completion rate as a percentage."""
        if not milestones:
            return None
        completed = sum(
            1 for m in milestones if (m.status or "").lower() == "completed"
        )
        return round((completed / len(milestones)) * 100, 1)

    @staticmethod
    def calculate_risk_counts(risks: list) -> dict[str, int]:
        """Count risks by severity."""
        counts: dict[str, int] = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "UNKNOWN": 0}
        for r in risks:
            sev = (r.severity or "UNKNOWN").upper()
            if sev in counts:
                counts[sev] += 1
            else:
                counts["UNKNOWN"] += 1
        return counts

    # ══════════════════════════════════════════════════════════════════
    # KPI Weight Validation
    # ══════════════════════════════════════════════════════════════════

    @staticmethod
    def validate_kpi_weights(weights: list[float]) -> bool:
        """Verify that KPI weights sum to 100."""
        if not weights:
            return True
        return abs(sum(weights) - 100.0) < 0.01

    @staticmethod
    def normalize_kpi_weights(weights: list[float]) -> list[float]:
        """Normalize weights to sum to 100 if they don't already."""
        if not weights:
            return weights
        total = sum(weights)
        if total == 0:
            n = len(weights)
            return [round(100.0 / n, 1)] * n
        factor = 100.0 / total
        normalized = [round(w * factor, 1) for w in weights]
        # Fix rounding error on the last element
        diff = 100.0 - sum(normalized)
        if normalized:
            normalized[-1] = round(normalized[-1] + diff, 1)
        return normalized

    # ══════════════════════════════════════════════════════════════════
    # Decision Engine — SCALE / EXTEND / STOP
    # ══════════════════════════════════════════════════════════════════

    @staticmethod
    def recommend(decision_input: DecisionInput) -> DecisionEngineResponse:
        """
        Deterministic SCALE / EXTEND / STOP recommendation.

        Composite score = weighted combination of inputs.
        Thresholds:
            SCALE  — composite ≥ 70, validation completed, no critical risks
            EXTEND — composite ≥ 45, or conditions partially met
            STOP   — composite < 45, or critical blocking conditions
        """
        d = decision_input

        # ── Weighted composite score ──────────────────────────────────
        weights = {
            "kpi_achievement": 0.30,
            "evidence_quality": 0.15,
            "technical_stability": 0.20,
            "user_feedback": 0.15,
            "risk_penalty": 0.20,
        }

        # Validation bonus/penalty
        validation_multiplier = {
            "completed": 1.0,
            "partial": 0.7,
            "not_started": 0.4,
        }.get(d.validation_status.lower(), 0.5)

        risk_inverted = max(0, 100 - d.risk_score)  # Higher = less risky

        raw_score = (
            d.kpi_achievement_pct * weights["kpi_achievement"]
            + d.evidence_quality * weights["evidence_quality"]
            + d.technical_stability * weights["technical_stability"]
            + d.user_feedback_score * weights["user_feedback"]
            + risk_inverted * weights["risk_penalty"]
        )

        composite = round(raw_score * validation_multiplier, 1)

        # ── Build reasoning trail ─────────────────────────────────────
        reasoning: list[str] = []
        conditions: list[DecisionCondition] = []
        uncertainties: list[str] = []

        reasoning.append(f"KPI achievement: {d.kpi_achievement_pct:.1f}%")
        reasoning.append(f"Evidence quality: {d.evidence_quality:.1f}/100")
        reasoning.append(f"Validation status: {d.validation_status}")
        reasoning.append(f"Technical stability: {d.technical_stability:.1f}/100")
        reasoning.append(f"User feedback: {d.user_feedback_score:.1f}/100")
        reasoning.append(f"Risk score: {d.risk_score:.1f}/100")
        reasoning.append(f"Composite score: {composite:.1f}/100")

        # ── Decision logic ────────────────────────────────────────────
        is_validated = d.validation_status.lower() == "completed"
        has_critical_risk = d.risk_score >= 70

        if composite >= 70 and is_validated and not has_critical_risk:
            recommendation = DecisionRecommendation.SCALE
            reasoning.append(
                "Composite score meets SCALE threshold (≥70), "
                "validation completed, no critical risk."
            )
            if d.kpi_achievement_pct < 80:
                conditions.append(
                    DecisionCondition(
                        description="KPI achievement below 80% — monitor closely during scale.",
                        category="kpi",
                    )
                )
            if d.evidence_quality < 60:
                conditions.append(
                    DecisionCondition(
                        description="Evidence quality could be stronger — consider additional validation.",
                        category="evidence",
                    )
                )

        elif composite < 45 or has_critical_risk:
            recommendation = DecisionRecommendation.STOP
            reasoning.append(
                f"{'Critical risk detected. ' if has_critical_risk else ''}"
                f"{'Composite score below STOP threshold (<45). ' if composite < 45 else ''}"
                "Recommending STOP."
            )
            if has_critical_risk:
                conditions.append(
                    DecisionCondition(
                        description="Critical risk must be resolved before reconsideration.",
                        category="risk",
                    )
                )
            if d.kpi_achievement_pct < 30:
                conditions.append(
                    DecisionCondition(
                        description="KPI achievement significantly below expectations.",
                        category="kpi",
                    )
                )

        else:
            recommendation = DecisionRecommendation.EXTEND
            reasoning.append(
                "Composite score in EXTEND range (45–69). "
                "Additional time or evidence needed."
            )
            if not is_validated:
                conditions.append(
                    DecisionCondition(
                        description="Independent validation not yet completed.",
                        category="validation",
                    )
                )
            if d.evidence_quality < 50:
                conditions.append(
                    DecisionCondition(
                        description="Evidence quality insufficient for SCALE decision.",
                        category="evidence",
                    )
                )
            if d.kpi_achievement_pct < 60:
                conditions.append(
                    DecisionCondition(
                        description="KPI targets not sufficiently met.",
                        category="kpi",
                    )
                )

        # ── Uncertainties ─────────────────────────────────────────────
        if d.evidence_quality < 40:
            uncertainties.append("Low evidence quality reduces confidence in recommendation.")
        if d.validation_status.lower() == "not_started":
            uncertainties.append("No independent validation performed — recommendation is provisional.")
        if d.risk_score > 50:
            uncertainties.append("Elevated risk level introduces uncertainty.")

        score_breakdown = {
            "kpi_component": round(d.kpi_achievement_pct * weights["kpi_achievement"], 1),
            "evidence_component": round(d.evidence_quality * weights["evidence_quality"], 1),
            "stability_component": round(d.technical_stability * weights["technical_stability"], 1),
            "feedback_component": round(d.user_feedback_score * weights["user_feedback"], 1),
            "risk_component": round(risk_inverted * weights["risk_penalty"], 1),
            "validation_multiplier": validation_multiplier,
        }

        return DecisionEngineResponse(
            recommendation=recommendation,
            composite_score=composite,
            reasoning=reasoning,
            conditions=conditions,
            uncertainties=uncertainties,
            score_breakdown=score_breakdown,
        )
