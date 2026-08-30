"""
SetuGov AI Service — Request Schemas

Canonical Pydantic models for all five AI brain inputs.
These models define the AI contract independently of any frontend.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════
# Shared / Reusable Sub-Models
# ═══════════════════════════════════════════════════════════════════════════


class KPIInput(BaseModel):
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


class ProblemContext(BaseModel):
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


class OutcomeContext(BaseModel):
    """Desired outcome information."""

    desired_outcome: Optional[str] = Field(
        None, description="What the government wants to achieve"
    )
    success_definition: Optional[str] = Field(
        None, description="How success will be judged"
    )


class MeasurementContext(BaseModel):
    """KPIs and measurement information."""

    kpis: list[KPIInput] = Field(default_factory=list)


class PilotContext(BaseModel):
    """Pilot parameters."""

    duration: Optional[str] = Field(None, description="Pilot duration, e.g. '60 days'")
    sites: Optional[list[str]] = Field(
        None, description="Where the pilot will run"
    )
    budget: Optional[str] = Field(None, description="Pilot budget")


class RequirementsContext(BaseModel):
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


class ChallengeCopilotRequest(BaseModel):
    """Brain 1 input — canonical challenge contract."""

    problem: ProblemContext
    outcome: Optional[OutcomeContext] = None
    measurement: Optional[MeasurementContext] = None
    pilot: Optional[PilotContext] = None
    requirements: Optional[RequirementsContext] = None


# ═══════════════════════════════════════════════════════════════════════════
# Brain 2 — Startup Match Explanation
# ═══════════════════════════════════════════════════════════════════════════


class ChallengeContext(BaseModel):
    """Summary of the challenge for matching purposes."""

    title: str
    description: str
    domain: Optional[str] = None
    technology_categories: Optional[list[str]] = None
    location: Optional[str] = None
    kpis: list[KPIInput] = Field(default_factory=list)


class StartupProfile(BaseModel):
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


class MatchExplanationRequest(BaseModel):
    """Brain 2 input — challenge + startup for match explanation."""

    challenge: ChallengeContext
    startup: StartupProfile


# ═══════════════════════════════════════════════════════════════════════════
# Brain 3 — Proposal Analysis
# ═══════════════════════════════════════════════════════════════════════════


class ProposalContent(BaseModel):
    """The startup's submitted proposal."""

    summary: Optional[str] = None
    technical_approach: Optional[str] = None
    implementation_timeline: Optional[str] = None
    estimated_cost: Optional[str] = None
    expected_impact: Optional[str] = None
    team_composition: Optional[str] = None
    past_experience: Optional[str] = None


class EligibilityInfo(BaseModel):
    """Eligibility documentation status."""

    dpiit_registered: Optional[bool] = None
    incorporation_date: Optional[str] = None
    annual_turnover: Optional[str] = None
    certifications: Optional[list[str]] = None
    additional_documents: Optional[list[str]] = None


class ProposalAnalysisRequest(BaseModel):
    """Brain 3 input — challenge, startup, and proposal for evaluator assistance."""

    challenge: ChallengeContext
    startup: StartupProfile
    proposal: ProposalContent
    eligibility: Optional[EligibilityInfo] = None
    available_documents: Optional[list[str]] = None


# ═══════════════════════════════════════════════════════════════════════════
# Brain 4 — Pilot Intelligence
# ═══════════════════════════════════════════════════════════════════════════


class KPIResult(BaseModel):
    """Actual KPI measurement from pilot."""

    name: str
    unit: Optional[str] = None
    baseline: Optional[float] = None
    target: Optional[float] = None
    actual: Optional[float] = None
    direction: Optional[str] = Field(
        None, description="'increase' or 'decrease'"
    )


class MilestoneResult(BaseModel):
    """Milestone completion status."""

    name: str
    expected_date: Optional[str] = None
    actual_date: Optional[str] = None
    status: Optional[str] = Field(
        None, description="'completed', 'delayed', 'pending'"
    )
    notes: Optional[str] = None


class PilotRisk(BaseModel):
    """Risk observed during pilot."""

    category: str = Field(
        ..., description="e.g. 'technical', 'adoption', 'data', 'security'"
    )
    description: str
    severity: Optional[str] = Field(
        None, description="'LOW', 'MEDIUM', 'HIGH'"
    )
    mitigation: Optional[str] = None


class PilotEvidence(BaseModel):
    """Evidence collected during pilot."""

    description: str
    source: Optional[str] = None
    verified: Optional[bool] = None


class PilotIntelligenceRequest(BaseModel):
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


class DocumentAssistanceRequest(BaseModel):
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
