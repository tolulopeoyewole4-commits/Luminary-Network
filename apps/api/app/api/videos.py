from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.security import require_internal_token
from app.schemas.video import VideoMetadataResponse
from app.services.video.metadata import VideoMetadataError, extract_video_metadata

router = APIRouter(prefix="/api/v1/videos", tags=["videos"])


@router.post(
    "/metadata",
    response_model=VideoMetadataResponse,
    dependencies=[Depends(require_internal_token)],
)
async def extract_video_metadata_endpoint(
    file: UploadFile = File(...),
    original_filename: str = Form(default="video.mp4"),
) -> VideoMetadataResponse:
    # Keep a generous ceiling for MVP metadata probes; app enforces upload limits.
    max_bytes = max(settings.max_extract_upload_mb, 520) * 1024 * 1024
    file_bytes = await file.read(max_bytes + 1)
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Video exceeds the metadata extraction size limit.",
        )

    try:
        result = extract_video_metadata(
            file_bytes=file_bytes,
            filename=original_filename or (file.filename or "video.mp4"),
        )
    except VideoMetadataError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.message,
        ) from exc

    return VideoMetadataResponse.model_validate(result)
