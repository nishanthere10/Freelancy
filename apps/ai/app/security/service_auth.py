import secrets
from typing import Optional
from fastapi import Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.config import get_settings

bearer_scheme = HTTPBearer(
    auto_error=False,
    description="Service-to-Service secret API key",
)


async def verify_service_api_key(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    authorization: Optional[str] = Header(None, description="Bearer service API key"),
) -> str:
    token: Optional[str] = None

    if credentials and credentials.credentials:
        token = credentials.credentials
    elif authorization:
        parts = authorization.strip().split(" ", 1)
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Authorization header format. Expected 'Bearer <token>'",
            )
        token = parts[1].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()
    expected_key = settings.AI_SERVICE_API_KEY

    # Constant-time comparison to prevent timing attacks
    if not secrets.compare_digest(token, expected_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return token
