from typing import Any
from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=dict[str, Any])
async def health_check() -> dict[str, Any]:
    return {"status": "ok", "service": "freelance-os-ai"}
