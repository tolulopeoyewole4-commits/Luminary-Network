from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness check used by deployment and local smoke tests."""
    return {"status": "ok", "service": "luminary-ai-api"}
