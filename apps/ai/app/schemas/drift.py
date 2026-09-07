from typing import Literal
from pydantic import BaseModel, Field


class AffectedDeliverable(BaseModel):
    title: str = Field(..., description="Title of the deliverable affected by the change request")
    impact_description: str = Field(
        ..., description="Specific description of how this deliverable is affected"
    )
    additional_hours: float = Field(
        ..., ge=0, description="Extra hours this change adds to the deliverable"
    )


class DriftAnalysisResult(BaseModel):
    summary: str = Field(
        ..., description="Executive summary of the scope drift impact assessment"
    )
    recommendation: Literal["accept", "decline", "negotiate"] = Field(
        ...,
        description=(
            "Recommended response to the change request: "
            "'accept' (within scope or minimal impact), "
            "'decline' (out of scope or unacceptable cost), "
            "'negotiate' (partial acceptance, revised terms needed)"
        ),
    )
    recommendation_rationale: str = Field(
        ..., description="Clear reasoning behind the recommendation"
    )
    affected_deliverables: list[AffectedDeliverable] = Field(
        default_factory=list,
        description="List of original deliverables impacted by this change request",
    )
    timeline_delta_days: int = Field(
        ...,
        ge=0,
        description="Total additional calendar days the change would add to the project (0 if no impact)",
    )
    budget_delta_percentage: float = Field(
        ...,
        ge=0.0,
        description="Estimated additional budget as a percentage of the original scope cost (0.0 = no change)",
    )
    new_deliverables_required: list[str] = Field(
        default_factory=list,
        description="Entirely new deliverables introduced by this change that were not in the original scope",
    )
    confidence_score: int = Field(
        ...,
        ge=1,
        le=100,
        description="AI confidence score (1-100) based on clarity of both the original scope and change request",
    )


class AiDriftInput(BaseModel):
    changeRequestText: str = Field(
        ..., min_length=10, description="Client's change request description"
    )
    originalScopeJson: dict = Field(
        ..., description="The confirmed ScopeAnalysisResult JSON to compare against"
    )
    scopeAnalysisId: str = Field(
        ..., description="UUID of the confirmed scope analysis being compared against"
    )


class AiDriftRequestPayload(BaseModel):
    workspaceId: str
    actorId: str
    actorRole: str
    requestId: str
    input: AiDriftInput
