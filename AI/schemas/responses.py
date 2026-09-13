"""
SetuGov AI Service — Response Schemas

Typed Pydantic models for all AI brain outputs,
the decision engine, and the API envelope.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════
# API Envelope
# ═══════════════════════════════════════════════════════════════════════════


class ErrorDetail(BaseModel):
    code: str
    message: str


class APIResponse(BaseModel):
    """Standard success envelope."""

    success: bool = True
    data: Optional[dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Standard error envelope."""

    success: bool = False
    error: ErrorDetail


# ═══════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════


class RiskSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class KPIStatus(str, Enum):
    ON_TARGET = "ON_TARGET"
    NEAR_TARGET = "NEAR_TARGET"
    BELOW_TARGET = "BELOW_TARGET"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class DecisionRecommendation(str, Enum):
    SCALE = "SCALE"
    EXTEND = "EXTEND"
    STOP = "STOP"


# ═══════════════════════════════════════════════════════════════════════════
# Brain 1 — Challenge Copilot Response
# ═══════════════════════════════════════════════════════════════════════════


class SuggestedKPI(BaseModel):
    """A KPI suggested or refined by the AI."""

    name: str
    description: str
    unit: Optional[str] = None
    baseline: Optional[float] = Field(
        None, description="null if baseline was not supplied"
    )
    target: Optional[float] = Field(
        None, description="AI-suggested target — requires validation"
    )
    direction: Optional[str] = None
    measurement_method: Optional[str] = None
    suggested_weight: Optional[float] = None
    reason: Optional[str] = None


class ReadinessScore(BaseModel):
    """Deterministic readiness assessment — computed by Python, not LLM."""

    score: float = Field(..., ge=0, le=100)
    problem_clarity: float = Field(..., ge=0, le=20)
    baseline_completeness: float = Field(..., ge=0, le=15)
    outcome_measurability: float = Field(..., ge=0, le=20)
    kpi_completeness: float = Field(..., ge=0, le=20)
    pilot_readiness: float = Field(..., ge=0, le=10)
    requirements_clarity: float = Field(..., ge=0, le=10)
    evidence_planning: float = Field(..., ge=0, le=5)


class PilotRecommendation(BaseModel):
    """Pilot configuration suggestions."""

    suggested_duration: Optional[str] = None
    suggested_sites: Optional[list[str]] = None
    suggested_budget_considerations: Optional[str] = None
    rationale: Optional[str] = None


class ChallengeCopilotResponse(BaseModel):
    """Brain 1 output — structured challenge analysis."""

    # Analyze
    problem_summary: str
    stakeholders: list[str] = Field(default_factory=list)
    root_cause_hypotheses: list[str] = Field(default_factory=list)

    # Suggest
    desired_outcome: Optional[str] = None
    success_definition: Optional[str] = None
    suggested_kpis: list[SuggestedKPI] = Field(default_factory=list)
    pilot_recommendation: Optional[PilotRecommendation] = None
    technology_categories: list[str] = Field(default_factory=list)
    domain: Optional[str] = None
    eligibility_considerations: list[str] = Field(default_factory=list)
    suggested_documents: list[str] = Field(default_factory=list)

    # Validate
    missing_information: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

    # Deterministic
    readiness: Optional[ReadinessScore] = None


# ═══════════════════════════════════════════════════════════════════════════
# Brain 2 — Startup Match Response
# ═══════════════════════════════════════════════════════════════════════════


class MatchScoreBreakdown(BaseModel):
    """Deterministic scoring breakdown — computed by Python."""

    technology_fit: float = Field(..., ge=0, le=30)
    domain_fit: float = Field(..., ge=0, le=25)
    readiness: float = Field(..., ge=0, le=20)
    experience: float = Field(..., ge=0, le=15)
    deployment_fit: float = Field(..., ge=0, le=10)
    total: float = Field(..., ge=0, le=100)


class MatchExplanationResponse(BaseModel):
    """Brain 2 output — deterministic score + LLM explanation."""

    score: MatchScoreBreakdown
    why_matched: str
    strengths: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    deployment_considerations: list[str] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# Brain 3 — Proposal Analysis Response
# ═══════════════════════════════════════════════════════════════════════════


class ProposalRisk(BaseModel):
    """An identified risk in the proposal."""

    category: str
    description: str
    severity: RiskSeverity
    mitigation_suggestion: Optional[str] = None


class RequirementTrace(BaseModel):
    """Maps a challenge requirement to proposal evidence (or lack thereof)."""

    requirement: str = Field(..., description="The challenge requirement being traced")
    evidence: Optional[str] = Field(
        None, description="Corresponding proposal evidence, or null if not addressed"
    )
    status: str = Field(
        ..., description="'addressed', 'partially_addressed', or 'not_addressed'"
    )


class ProposalAnalysisResponse(BaseModel):
    """Brain 3 output — evaluator assistance."""

    executive_summary: str
    technical_approach: Optional[str] = None
    expected_impact: Optional[str] = None
    technology_readiness: Optional[str] = None
    risks: list[ProposalRisk] = Field(default_factory=list)
    estimated_cost: Optional[str] = None
    implementation_timeline: Optional[str] = None
    missing_information: list[str] = Field(default_factory=list)
    questions_for_evaluator: list[str] = Field(default_factory=list)

    # Enhanced AI intelligence fields (optional — backward compatible)
    requirement_traceability: Optional[list[RequirementTrace]] = None
    unsupported_claims: Optional[list[str]] = None
    evidence_quality: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# Brain 4 — Pilot Intelligence Response
# ═══════════════════════════════════════════════════════════════════════════


class KPIAnalysis(BaseModel):
    """Per-KPI deterministic analysis + LLM observation."""

    name: str
    baseline: Optional[float] = None
    target: Optional[float] = None
    actual: Optional[float] = None
    improvement_pct: Optional[float] = None
    target_achievement_pct: Optional[float] = None
    status: KPIStatus
    observation: Optional[str] = None


class PilotIntelligenceResponse(BaseModel):
    """Brain 4 output — deterministic calculations + LLM interpretation."""

    # Deterministic
    kpi_analyses: list[KPIAnalysis] = Field(default_factory=list)
    milestone_completion_rate: Optional[float] = None
    risk_summary: Optional[str] = None
    risk_counts: Optional[dict[str, int]] = None

    # LLM interpretation
    overall_assessment: Optional[str] = None
    observations: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)
    evidence_gaps: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)

    # Enhanced AI intelligence fields (optional — backward compatible)
    confidence_level: Optional[str] = None
    confidence_reasoning: Optional[str] = None
    anomalies: Optional[list[str]] = None
    scale_readiness: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# Brain 5 — Document Assistance Response
# ═══════════════════════════════════════════════════════════════════════════


class DocumentAssistanceResponse(BaseModel):
    """Brain 5 output — generated document draft."""

    document_type: str
    title: str
    content: str
    sections: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    review_label: str = Field(
        default="AI-generated draft — requires authorized review."
    )


# ═══════════════════════════════════════════════════════════════════════════
# Decision Engine — SCALE / EXTEND / STOP
# ═══════════════════════════════════════════════════════════════════════════

# DecisionInput is a request schema — canonical definition is in schemas/requests.py.
# Re-exported here for backward compatibility.
from schemas.requests import DecisionInput as DecisionInput  # noqa: F401


class DecisionCondition(BaseModel):
    """A condition attached to the recommendation."""

    description: str
    category: Optional[str] = None


class DecisionEngineResponse(BaseModel):
    """Decision engine output — deterministic recommendation."""

    recommendation: DecisionRecommendation
    composite_score: float = Field(..., ge=0, le=100)
    reasoning: list[str] = Field(default_factory=list)
    conditions: list[DecisionCondition] = Field(default_factory=list)
    uncertainties: list[str] = Field(default_factory=list)
    score_breakdown: dict[str, float] = Field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════
# Brain 6 — Startup Comparator Response
# ═══════════════════════════════════════════════════════════════════════════


class RecommendationLabel(str, Enum):
    """Deterministic label assigned based on total match score."""

    HIGHLY_RECOMMENDED = "Highly Recommended"
    RECOMMENDED = "Recommended"
    MARGINAL = "Marginal"
    NOT_RECOMMENDED = "Not Recommended"


class StartupRank(BaseModel):
    """Single ranked startup entry — scores are deterministic, narrative is LLM."""

    rank: int = Field(..., ge=1, description="Rank position (1 = best fit)")
    startup_name: str
    total_score: float = Field(..., ge=0, le=100, description="Overall match score (deterministic)")
    score_breakdown: MatchScoreBreakdown
    recommendation_label: RecommendationLabel
    explanation: str = Field(
        ..., description="LLM narrative explaining this startup's fit with the challenge"
    )
    strengths: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)


class StartupComparatorResponse(BaseModel):
    """Brain 6 output — ranked startup list with explanations and comparisons."""

    recommended_startup: str = Field(
        ..., description="Name of the top-ranked startup"
    )
    recommendation_rationale: str = Field(
        ..., description="LLM explanation for why this startup is recommended"
    )
    ranked_startups: list[StartupRank] = Field(
        ..., description="All startups ordered by score, rank 1 = best"
    )
    comparative_observations: list[str] = Field(
        default_factory=list,
        description="Cross-startup insights highlighting key differentiators",
    )
    evaluation_disclaimer: str = Field(
        default=(
            "AI-generated comparative analysis — scores are deterministic; "
            "qualitative explanations require authorized evaluator review before use."
        )
    )
