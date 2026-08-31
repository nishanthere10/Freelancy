import logging
import uuid
from fastapi import APIRouter, Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.api.dependencies import verify_service_api_key
from app.api.routes import health
from app.core.config import get_settings
from app.core.errors import register_error_handlers


def create_app() -> FastAPI:
    settings = get_settings()

    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    app = FastAPI(
        title="Freelance OS AI Service",
        description="Python AI Service providing RAG, Scope Analysis, and Task Intelligence",
        version="0.1.0",
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    )

    # Middleware: CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware: Request ID
    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        req_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:12]}"
        request.state.request_id = req_id
        response: Response = await call_next(request)
        response.headers["x-request-id"] = req_id
        return response

    # Register standardized error handlers
    register_error_handlers(app)

    # Unprotected routes (Health)
    app.include_router(health.router)

    # Protected API router (Requires service-to-service auth)
    api_v1_router = APIRouter(
        prefix="/api/v1",
        dependencies=[Depends(verify_service_api_key)],
    )

    @api_v1_router.get("/protected")
    async def protected_check():
        return {"success": True, "message": "Authenticated successfully"}

    @api_v1_router.post("/test")
    async def test_echo(request: Request):
        body = await request.json()
        return {
            "success": True,
            "data": {
                "status": "received",
                "workspaceId": body.get("workspaceId"),
                "actorId": body.get("actorId"),
                "actorRole": body.get("actorRole"),
                "requestId": body.get("requestId"),
                "echoInput": body.get("input"),
            },
        }

    # Mount dedicated Scope Analysis and Ingest routers
    from app.api.routes.scope import scope_router
    from app.api.routes.ingest import ingest_router

    api_v1_router.include_router(scope_router)
    api_v1_router.include_router(ingest_router)
    app.include_router(api_v1_router)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    current_settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=current_settings.HOST,
        port=current_settings.PORT,
        reload=current_settings.ENVIRONMENT == "development",
    )
