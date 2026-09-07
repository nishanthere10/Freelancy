from fastapi import APIRouter, Depends

from app.schemas.drift import AiDriftRequestPayload
from app.security.service_auth import verify_service_api_key
from app.services.drift_service import drift_detection_engine

drift_router = APIRouter(
    prefix="/drift",
    tags=["Scope Drift Detection"],
    dependencies=[Depends(verify_service_api_key)],
)


@drift_router.post(
    "/analyze",
    summary="Analyze Scope Drift from Client Change Request",
    description=(
        "Compares a client change request against the original confirmed scope document. "
        "Returns structured drift impact: affected deliverables, timeline delta in days, "
        "budget delta as percentage, new deliverables required, and a recommendation "
        "(accept / decline / negotiate)."
    ),
)
async def analyze_drift_endpoint(payload: AiDriftRequestPayload):
    result = await drift_detection_engine.analyze_drift(
        change_request=payload.input.changeRequestText,
        original_scope_json=payload.input.originalScopeJson,
        workspace_id=payload.workspaceId,
    )

    return {
        "success": True,
        "data": result.model_dump(),
        "requestId": payload.requestId,
    }
