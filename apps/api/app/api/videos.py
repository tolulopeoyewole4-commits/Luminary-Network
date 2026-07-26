from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.core.config import settings
from app.core.security import require_internal_token
from app.schemas.video import VideoMetadataResponse
from app.services.video.export import VideoExportError, export_video_clip
from app.services.video.metadata import VideoMetadataError, extract_video_metadata

router = APIRouter(prefix="/api/v1/videos", tags=["videos"])


def _max_video_bytes() -> int:
    # Keep a generous ceiling for MVP video jobs; app enforces upload limits.
    return max(settings.max_extract_upload_mb, 520) * 1024 * 1024


@router.post(
    "/metadata",
    response_model=VideoMetadataResponse,
    dependencies=[Depends(require_internal_token)],
)
async def extract_video_metadata_endpoint(
    file: UploadFile = File(...),
    original_filename: str = Form(default="video.mp4"),
) -> VideoMetadataResponse:
    max_bytes = _max_video_bytes()
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


@router.post(
    "/export-clip",
    dependencies=[Depends(require_internal_token)],
)
async def export_video_clip_endpoint(
    file: UploadFile = File(...),
    start_time: float = Form(...),
    end_time: float = Form(...),
    original_filename: str = Form(default="video.mp4"),
) -> Response:
    max_bytes = _max_video_bytes()
    file_bytes = await file.read(max_bytes + 1)
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Video exceeds the clip export size limit.",
        )

    try:
        clip_bytes = export_video_clip(
            file_bytes,
            start_time=start_time,
            end_time=end_time,
            filename=original_filename or (file.filename or "video.mp4"),
        )
    except VideoExportError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.message,
        ) from exc

    return Response(
        content=clip_bytes,
        media_type="video/mp4",
        headers={
            "Content-Disposition": 'attachment; filename="clip.mp4"',
            "X-Clip-Bytes": str(len(clip_bytes)),
            "X-Clip-Start": f"{start_time:.3f}",
            "X-Clip-End": f"{end_time:.3f}",
        },
    )
