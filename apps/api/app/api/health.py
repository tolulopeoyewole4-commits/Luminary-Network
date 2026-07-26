import shutil

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, object]:
    """Liveness check used by deployment and local smoke tests."""
    return {
        "status": "ok",
        "service": "luminary-ai-api",
        "ffmpeg": shutil.which("ffmpeg") is not None,
        "ffprobe": shutil.which("ffprobe") is not None,
    }
