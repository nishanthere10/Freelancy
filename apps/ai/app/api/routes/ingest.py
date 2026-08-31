from fastapi import APIRouter, Depends, Path

from app.api.dependencies import verify_service_api_key
from scripts.ingest_historical_data import ingest_workspace_data

ingest_router = APIRouter(
    prefix="/ingest",
    tags=["Data Ingestion"],
    dependencies=[Depends(verify_service_api_key)],
)


@ingest_router.post(
    "/workspace/{workspace_id}",
    summary="Ingest historical workspace data into Chroma RAG store",
    description="Extracts projects and clients for the specified workspace from PostgreSQL and indexes them into Chroma.",
)
async def ingest_workspace_endpoint(
    workspace_id: str = Path(..., description="Target Workspace UUID"),
):
    indexed_count = await ingest_workspace_data(target_workspace_id=workspace_id)
    return {
        "success": True,
        "data": {
            "workspaceId": workspace_id,
            "indexedCount": indexed_count,
        },
    }
