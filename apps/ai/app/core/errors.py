import logging
import uuid
from typing import Any, Optional
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


def get_or_create_request_id(request: Request) -> str:
    """Extract existing request ID or generate a fallback request ID."""
    req_id = request.headers.get("x-request-id") or getattr(request.state, "request_id", None)
    if not req_id:
        req_id = f"req_{uuid.uuid4().hex[:12]}"
        request.state.request_id = req_id
    return req_id


def create_error_envelope(
    error: str,
    message: str,
    details: Optional[Any] = None,
    request_id: Optional[str] = None,
) -> dict[str, Any]:
    envelope: dict[str, Any] = {
        "success": False,
        "error": error,
        "message": message,
        "requestId": request_id,
    }
    if details is not None:
        envelope["details"] = details
    return envelope


class AppError(Exception):
    def __init__(
        self,
        message: str,
        error_code: str = "API_ERROR",
        status_code: int = 400,
        details: Optional[Any] = None,
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Authentication required", details: Optional[Any] = None):
        super().__init__(message=message, error_code="UNAUTHORIZED", status_code=401, details=details)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Permission denied", details: Optional[Any] = None):
        super().__init__(message=message, error_code="FORBIDDEN", status_code=403, details=details)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found", details: Optional[Any] = None):
        super().__init__(message=message, error_code="NOT_FOUND", status_code=404, details=details)


class ValidationError(AppError):
    def __init__(self, message: str = "Request validation failed", details: Optional[Any] = None):
        super().__init__(message=message, error_code="VALIDATION_ERROR", status_code=422, details=details)


STATUS_CODE_TO_ERROR_CODE = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    408: "REQUEST_TIMEOUT",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMIT_EXCEEDED",
    500: "INTERNAL_SERVER_ERROR",
    502: "BAD_GATEWAY",
    503: "SERVICE_UNAVAILABLE",
}


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    request_id = get_or_create_request_id(request)
    body = create_error_envelope(
        error=exc.error_code,
        message=exc.message,
        details=exc.details,
        request_id=request_id,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=body,
        headers={"x-request-id": request_id},
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = get_or_create_request_id(request)
    body = create_error_envelope(
        error="VALIDATION_ERROR",
        message="Request validation failed",
        details=exc.errors(),
        request_id=request_id,
    )
    return JSONResponse(
        status_code=422,
        content=body,
        headers={"x-request-id": request_id},
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    request_id = get_or_create_request_id(request)
    error_code = STATUS_CODE_TO_ERROR_CODE.get(exc.status_code, "API_ERROR")
    message = exc.detail if isinstance(exc.detail, str) else "An error occurred"
    details = exc.detail if not isinstance(exc.detail, str) else None
    body = create_error_envelope(
        error=error_code,
        message=message,
        details=details,
        request_id=request_id,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=body,
        headers={"x-request-id": request_id},
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = get_or_create_request_id(request)
    logger.exception(f"Unhandled exception during request processing: {exc}")
    body = create_error_envelope(
        error="INTERNAL_SERVER_ERROR",
        message="An unexpected error occurred",
        request_id=request_id,
    )
    return JSONResponse(
        status_code=500,
        content=body,
        headers={"x-request-id": request_id},
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
