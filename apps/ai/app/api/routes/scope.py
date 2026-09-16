from fastapi import APIRouter, Depends

from app.schemas.scope import AiScopeRefineRequestPayload, AiScopeRequestPayload
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


@scope_router.post(
    "/refine",
    summary="Refine Existing AI Scope Analysis",
    description="Refines an existing structured scope analysis using conversational revision instructions.",
)
async def refine_scope_endpoint(payload: AiScopeRefineRequestPayload):
    result = await llm_scope_engine.refine_scope(
        current_scope=payload.input.current_scope,
        revision_prompt=payload.input.revision_prompt,
        workspace_id=payload.workspaceId,
    )

    return {
        "success": True,
        "data": result.model_dump(),
        "requestId": payload.requestId,
    }

