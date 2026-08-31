from fastapi import APIRouter, Depends

from app.schemas.scope import AiScopeRequestPayload
from app.security.service_auth import verify_service_api_key
from app.services.llm_service import llm_scope_engine

scope_router = APIRouter(
    prefix="/scope",
    tags=["Scope Analysis"],
    dependencies=[Depends(verify_service_api_key)],
)


@scope_router.post(
    "",
    summary="Generate AI Scope Analysis from Project Brief",
    description="Analyzes raw project brief requirements and returns structured milestones, deliverables, and timeline estimates.",
)
async def generate_scope_endpoint(payload: AiScopeRequestPayload):
    result = await llm_scope_engine.generate_scope_from_brief(
        brief=payload.input.inputText,
        workspace_id=payload.workspaceId,
    )

    return {
        "success": True,
        "data": result.model_dump(),
        "requestId": payload.requestId,
    }
