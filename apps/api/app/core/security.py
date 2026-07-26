from fastapi import Header, HTTPException, status

from app.core.config import settings


def require_internal_token(
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
) -> None:
    """Protect processing endpoints from anonymous/browser calls."""
    expected = settings.internal_api_token
    if not expected or not x_internal_token or x_internal_token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal API token.",
        )
