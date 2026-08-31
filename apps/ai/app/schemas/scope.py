from typing import Literal
from pydantic import BaseModel, Field


class Deliverable(BaseModel):
    title: str = Field(..., description="Name or title of the deliverable milestone")
    description: str = Field(..., description="Detailed technical or functional breakdown of what will be built")
    estimated_hours: int = Field(..., ge=1, description="Estimated hours to complete this deliverable")
    complexity: Literal["low", "medium", "high"] = Field(
        default="medium",
        description="Complexity rating of the deliverable",
    )
    skills_required: list[str] = Field(
        default_factory=list,
        description="Key engineering or design skills needed (e.g. React, Next.js, PostgreSQL)",
    )


class ScopeAnalysisResult(BaseModel):
    summary: str = Field(
        ...,
        description="Executive summary and architectural vision for the project brief",
    )
    deliverables: list[Deliverable] = Field(
        ...,
        min_length=1,
        description="List of scoped deliverables and milestones",
    )
    timeline_weeks: int = Field(
        ...,
        ge=1,
        description="Realistic total project duration in weeks",
    )
    risks_and_dependencies: list[str] = Field(
        default_factory=list,
        description="Identified risks, technical constraints, or third-party dependencies",
    )
    recommended_tech_stack: list[str] = Field(
        default_factory=list,
        description="Recommended technologies, libraries, and frameworks",
    )
    confidence_score: int = Field(
        ...,
        ge=1,
        le=100,
        description="AI confidence score percentage (1-100) based on brief clarity",
    )


class AiScopeInput(BaseModel):
    inputText: str = Field(..., min_length=10, description="Raw project brief or client specification")
    projectId: str | None = Field(default=None, description="Optional associated project UUID")


class AiScopeRequestPayload(BaseModel):
    workspaceId: str
    actorId: str
    actorRole: str
    requestId: str
    input: AiScopeInput
