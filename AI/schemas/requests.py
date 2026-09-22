"""
SetuGov AI Service — Request Schemas

Canonical Pydantic models for all AI brain inputs.
These models define the AI contract independently of any frontend.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator

from config import get_settings


# ═══════════════════════════════════════════════════════════════════════════
# Base model — input size limits
# ═══════════════════════════════════════════════════════════════════════════


def _enforce_limits(value: Any, path: str, max_chars: int, max_items: int) -> None:
    """Walk raw request data and reject oversized strings / lists."""
    if isinstance(value, str):
        if len(value) > max_chars:
            raise ValueError(
                f"Field '{path or 'input'}' is too long "
                f"({len(value)} characters; maximum is {max_chars})."
            )
    elif isinstance(value, dict):
        for key, item in value.items():
            _enforce_limits(item, f"{path}.{key}" if path else str(key), max_chars, max_items)
    elif isinstance(value, (list, tuple)):
        if len(value) > max_items:
            raise ValueError(
                f"Field '{path or 'input'}' has too many items "
                f"({len(value)}; maximum is {max_items})."
            )
        for idx, item in enumerate(value):
            _enforce_limits(item, f"{path}[{idx}]", max_chars, max_items)


class RequestModel(BaseModel):
    """
    Base class for every request schema.

    Rejects oversized text fields and lists before any prompt is built.
    Limits come from ``config.Settings`` (``max_input_chars`` / ``max_list_items``).
    """

    @model_validator(mode="before")
    @classmethod
    def _reject_oversized_input(cls, data: Any) -> Any:
        if isinstance(data, dict):
            settings = get_settings()
            _enforce_limits(data, "", settings.max_input_chars, settings.max_list_items)
        return data


# ═══════════════════════════════════════════════════════════════════════════
# Shared / Reusable Sub-Models
# ═══════════════════════════════════════════════════════════════════════════


class KPIInput(RequestModel):
    """A single KPI supplied by the requester."""

    name: str = Field(..., description="KPI name, e.g. 'Average Waiting Time'")
    description: Optional[str] = Field(None, description="What this KPI measures")
    unit: Optional[str] = Field(None, description="Measurement unit, e.g. 'minutes'")
    baseline: Optional[float] = Field(
        None, description="Current baseline value — null if unknown"
    )
    target: Optional[float] = Field(
        None, description="Desired target value — null if not set"
    )
    direction: Optional[str] = Field(
        None, description="'increase' or 'decrease'"
    )
    measurement_method: Optional[str] = Field(
        None, description="How the KPI will be measured"
    )
    weight: Optional[float] = Field(
        None, description="Suggested weight 0-100"
    )


# ═══════════════════════════════════════════════════════════════════════════
# Brain 1 — Challenge Copilot
# ═══════════════════════════════════════════════════════════════════════════


class ProblemContext(RequestModel):
    """The government operational problem."""

    title: str = Field(..., description="Short problem title")
    description: str = Field(..., description="Detailed problem description")
    current_process: Optional[str] = Field(
        None, description="How the process currently works"
    )
    baseline: Optional[str] = Field(
        None, description="Existing baseline data, if any"
    )
    location: Optional[str] = Field(
        None, description="Geographic or institutional scope"
    )


class OutcomeContext(RequestModel):
    """Desired outcome information."""

    desired_outcome: Optional[str] = Field(
        None, description="What the government wants to achieve"
    )
    success_definition: Optional[str] = Field(
        None, description="How success will be judged"
    )


class MeasurementContext(RequestModel):
    """KPIs and measurement information."""

    kpis: list[KPIInput] = Field(default_factory=list)


class PilotContext(RequestModel):
    """Pilot parameters."""

    duration: Optional[str] = Field(None, description="Pilot duration, e.g. '60 days'")
    sites: Optional[list[str]] = Field(
        None, description="Where the pilot will run"
    )
    budget: Optional[str] = Field(None, description="Pilot budget")


class RequirementsContext(RequestModel):
    """Technology and eligibility requirements."""

    technologies: Optional[list[str]] = Field(
        None, description="Technology categories"
    )
    domain: Optional[str] = Field(None, description="Domain/sector")
    eligibility: Optional[list[str]] = Field(
        None, description="Eligibility criteria"
    )
    documents: Optional[list[str]] = Field(
        None, description="Required documents"
    )


class ChallengeCopilotRequest(RequestModel):
    """Brain 1 input — canonical challenge contract."""

    problem: ProblemContext
    outcome: Optional[OutcomeContext] = None
    measurement: Optional[MeasurementContext] = None
    pilot: Optional[PilotContext] = None
    requirements: Optional[RequirementsContext] = None


# ═══════════════════════════════════════════════════════════════════════════
# Brain 2 — Startup Match Explanation
# ═══════════════════════════════════════════════════════════════════════════


class ChallengeContext(RequestModel):
    """Summary of the challenge for matching purposes."""

    title: str
    description: str
    domain: Optional[str] = None
    technology_categories: Optional[list[str]] = None
    location: Optional[str] = None
    kpis: list[KPIInput] = Field(default_factory=list)


class StartupProfile(RequestModel):
    """Startup information for matching."""

    name: str
    description: str
    technologies: Optional[list[str]] = None
    domain: Optional[str] = None
    experience: Optional[str] = None
    deployments: Optional[list[str]] = None
    certifications: Optional[list[str]] = None
    team_size: Optional[int] = None
    location: Optional[str] = None
    readiness_level: Optional[int] = None
    years_experience: Optional[int] = None
    previous_deployments: Optional[int] = None


class MatchExplanationRequest(RequestModel):
    """Brain 2 input — challenge + startup for match explanation."""

    challenge: ChallengeContext
    startup: StartupProfile
    authoritative_score: Optional[Any] = None
    eligibility_status: Optional[str] = None
    reasons: Optional[list[str]] = None
    review_reasons: Optional[list[str]] = None
    ineligibility_reasons: Optional[list[str]] = None
    semantic_similarity: Optional[float] = None


# ═══════════════════════════════════════════════════════════════════════════
# Brain 3 — Proposal Analysis
# ═══════════════════════════════════════════════════════════════════════════


class ProposalContent(RequestModel):
    """The startup's submitted proposal."""

    summary: Optional[str] = None
    technical_approach: Optional[str] = None
    implementation_timeline: Optional[str] = None
    estimated_cost: Optional[str] = None
    expected_impact: Optional[str] = None
    team_composition: Optional[str] = None
    past_experience: Optional[str] = None


class EligibilityInfo(RequestModel):
    """Eligibility documentation status."""

    dpiit_registered: Optional[bool] = None
    incorporation_date: Optional[str] = None
    annual_turnover: Optional[str] = None
    certifications: Optional[list[str]] = None
    additional_documents: Optional[list[str]] = None


class ProposalAnalysisRequest(RequestModel):
    """Brain 3 input — challenge, startup, and proposal for evaluator assistance."""

    challenge: ChallengeContext
    startup: StartupProfile
    proposal: ProposalContent
    eligibility: Optional[EligibilityInfo] = None
    available_documents: Optional[list[str]] = None


# ═══════════════════════════════════════════════════════════════════════════
# Brain 4 — Pilot Intelligence
# ═══════════════════════════════════════════════════════════════════════════


class KPIResult(RequestModel):
    """Actual KPI measurement from pilot."""

    name: str
    unit: Optional[str] = None
    baseline: Optional[float] = None
    target: Optional[float] = None
    actual: Optional[float] = None
    direction: Optional[str] = Field(
        None, description="'increase' or 'decrease'"
    )


class MilestoneResult(RequestModel):
    """Milestone completion status."""

    name: str
    expected_date: Optional[str] = None
    actual_date: Optional[str] = None
    status: Optional[str] = Field(
        None, description="'completed', 'delayed', 'pending'"
    )
    notes: Optional[str] = None


class PilotRisk(RequestModel):
    """Risk observed during pilot."""

    category: str = Field(
        ..., description="e.g. 'technical', 'adoption', 'data', 'security'"
    )
    description: str
    severity: Optional[str] = Field(
        None, description="'LOW', 'MEDIUM', 'HIGH'"
    )
    mitigation: Optional[str] = None


class PilotEvidence(RequestModel):
    """Evidence collected during pilot."""

    description: str
    source: Optional[str] = None
    verified: Optional[bool] = None


class PilotIntelligenceRequest(RequestModel):
    """Brain 4 input — pilot data for interpretation."""

    challenge_title: str
    startup_name: str
    pilot_duration: Optional[str] = None
    pilot_sites: Optional[list[str]] = None
    kpi_results: list[KPIResult] = Field(default_factory=list)
    milestones: list[MilestoneResult] = Field(default_factory=list)
    risks: list[PilotRisk] = Field(default_factory=list)
    evidence: list[PilotEvidence] = Field(default_factory=list)
    user_feedback: Optional[str] = None
    technical_stability: Optional[str] = None
    independent_validation: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# Brain 5 — Document Assistance
# ═══════════════════════════════════════════════════════════════════════════


class DocumentType(str, Enum):
    CHALLENGE_STATEMENT = "CHALLENGE_STATEMENT"
    EVALUATION_CRITERIA = "EVALUATION_CRITERIA"
    PILOT_AGREEMENT_DRAFT = "PILOT_AGREEMENT_DRAFT"
    GOVERNANCE_CHECKLIST = "GOVERNANCE_CHECKLIST"
    PROCUREMENT_PATHWAY_SUMMARY = "PROCUREMENT_PATHWAY_SUMMARY"


class DocumentAssistanceRequest(RequestModel):
    """Brain 5 input — document generation request."""

    document_type: DocumentType
    challenge_title: Optional[str] = None
    challenge_description: Optional[str] = None
    startup_name: Optional[str] = None
    pilot_duration: Optional[str] = None
    pilot_sites: Optional[list[str]] = None
    pilot_budget: Optional[str] = None
    kpis: list[KPIInput] = Field(default_factory=list)
    objectives: Optional[list[str]] = None
    additional_context: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# Decision Engine Input
# ═══════════════════════════════════════════════════════════════════════════


class DecisionInput(RequestModel):
    """Structured input for the deterministic SCALE / EXTEND / STOP decision engine."""

    kpi_achievement_pct: float = Field(
        ..., ge=0, le=100, description="Average KPI target achievement"
    )
    evidence_quality: float = Field(
        ..., ge=0, le=100, description="Evidence completeness/quality score"
    )
    validation_status: str = Field(
        ..., description="'completed', 'partial', 'not_started'"
    )
    technical_stability: float = Field(
        ..., ge=0, le=100, description="Technical stability score"
    )
    user_feedback_score: float = Field(
        ..., ge=0, le=100, description="User satisfaction score"
    )
    risk_score: float = Field(
        ..., ge=0, le=100, description="Aggregate risk score (0=no risk, 100=critical)"
    )


# ═══════════════════════════════════════════════════════════════════════════
# Brain 6 — Startup Comparator
# ═══════════════════════════════════════════════════════════════════════════


class StartupComparatorRequest(RequestModel):
    """Brain 6 input — compare and rank multiple startup candidates for a challenge.

    Requires at least two startups. The AI scores every startup
    deterministically using the same engine as Brain 2 (MatchScoreBreakdown)
    and the LLM provides qualitative explanations and comparative observations.
    """

    challenge: ChallengeContext = Field(
        ..., description="The challenge all startups are being evaluated against"
    )
    startups: list[StartupProfile] = Field(
        ..., min_length=2, description="List of startup candidates (minimum 2)"
    )
    evaluation_weights: Optional[dict[str, float]] = Field(
        None,
        description=(
            "Optional custom scoring weights per dimension. "
            "Keys: 'technology_fit', 'domain_fit', 'readiness', 'experience', 'deployment_fit'. "
            "Values: 0–100 (relative, need not sum to 100). "
            "If omitted, default engine weights are used."
        ),
    )


# ═══════════════════════════════════════════════════════════════════════════
# Embeddings
# ═══════════════════════════════════════════════════════════════════════════


class EmbeddingRequest(RequestModel):
    """
    Input for the provider-agnostic embeddings endpoint.

    The AI service generates and returns vectors only — it has no database
    dependency. Building embedding text from domain objects, persisting
    vectors, and computing similarity all remain the caller's
    responsibility (e.g. the Backend, which owns the pgvector columns).
    """

    texts: list[str] = Field(
        ..., min_length=1, description="One or more texts to embed, in order."
    )


# ═══════════════════════════════════════════════════════════════════════════
# Scale Recommendation
# ═══════════════════════════════════════════════════════════════════════════


class ScaleRecommendationRequest(RequestModel):
    """
    Input for the advisory SCALE/EXTEND/STOP recommendation.

    A thin adapter over DecisionEngine.recommend() — the same deterministic
    composite-score engine used by /ai/decision. No LLM call. Callers may
    supply either raw pilot data (``kpi_results``, ``evidence``, ``risks``)
    for Python to aggregate first, or pre-aggregated metrics
    (``kpi_achievement_pct``, ``evidence_quality``, ``risk_score``)
    directly; the latter takes precedence when both are given.
    """

    challenge_title: Optional[str] = None
    startup_name: Optional[str] = None
    pilot_duration: Optional[str] = None
    kpi_achievement_pct: Optional[float] = Field(None, ge=0, le=100)
    evidence_quality: Optional[float] = Field(None, ge=0, le=100)
    validation_status: Optional[str] = None
    technical_stability: Optional[float] = Field(None, ge=0, le=100)
    user_feedback_score: Optional[float] = Field(None, ge=0, le=100)
    risk_score: Optional[float] = Field(None, ge=0, le=100)
    kpi_results: list[KPIResult] = Field(default_factory=list)
    risks: list[PilotRisk] = Field(default_factory=list)
    evidence: list[PilotEvidence] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# Risk Analysis
# ═══════════════════════════════════════════════════════════════════════════


class RiskAnalysisRequest(RequestModel):
    """Input for 7-dimension procurement/pilot risk identification (advisory)."""

    challenge_title: Optional[str] = None
    challenge_description: Optional[str] = None
    startup_name: Optional[str] = None
    proposal_summary: Optional[str] = None
    technical_approach: Optional[str] = None
    pilot_duration: Optional[str] = None
    budget: Optional[str] = None
    categories: Optional[list[str]] = None
