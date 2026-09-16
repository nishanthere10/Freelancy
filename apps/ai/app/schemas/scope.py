from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator


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

    @field_validator("skills_required", mode="before")
    @classmethod
    def normalize_skills(cls, v):
        if v is None:
            return []
        return v

    @field_validator("complexity", mode="before")
    @classmethod
    def normalize_complexity(cls, v):
        if not v or not isinstance(v, str):
            return "medium"
        cleaned = v.strip().lower()
        if cleaned in ("low", "medium", "high"):
            return cleaned
        if "high" in cleaned:
            return "high"
        if "low" in cleaned:
            return "low"
        return "medium"

    @field_validator("estimated_hours", mode="before")
    @classmethod
    def normalize_hours(cls, v):
        if v is None:
            return 1
        try:
            return max(1, round(float(v)))
        except (ValueError, TypeError):
            return 1


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

    @field_validator("risks_and_dependencies", "recommended_tech_stack", mode="before")
    @classmethod
    def normalize_lists(cls, v):
        if v is None:
            return []
        return v

    @field_validator("timeline_weeks", mode="before")
    @classmethod
    def normalize_timeline(cls, v):
        if v is None:
            return 1
        try:
            return max(1, round(float(v)))
        except (ValueError, TypeError):
            return 1

    @field_validator("confidence_score", mode="before")
    @classmethod
    def normalize_confidence(cls, v):
        if v is None:
            return 90
        try:
            val = round(float(v))
            return max(1, min(100, val))
        except (ValueError, TypeError):
            return 90



class AiScopeInput(BaseModel):
    inputText: str = Field(..., min_length=10, description="Raw project brief or client specification")
    projectId: str | None = Field(default=None, description="Optional associated project UUID")


class AiScopeRequestPayload(BaseModel):
    workspaceId: str
    actorId: str
    actorRole: str
    requestId: str
    input: AiScopeInput


class ScopeRefineInput(BaseModel):
    current_scope: ScopeAnalysisResult
    revision_prompt: str = Field(
        ...,
        min_length=5,
        max_length=1000,
        description="Instructions on what to add, remove, or modify in the current scope",
    )


class AiScopeRefineRequestPayload(BaseModel):
    workspaceId: str
    actorId: str
    actorRole: str
    requestId: str
    input: ScopeRefineInput

