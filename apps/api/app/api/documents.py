from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.security import require_internal_token
from app.schemas.documents import DocumentExtractResponse
from app.services.documents.extract import (
    DocumentExtractionError,
    extract_document,
)

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


@router.post(
    "/extract",
    response_model=DocumentExtractResponse,
    dependencies=[Depends(require_internal_token)],
)
async def extract_document_endpoint(
    file: UploadFile = File(...),
    file_type: str = Form(...),
    original_filename: str = Form(default="document"),
) -> DocumentExtractResponse:
    max_bytes = settings.max_extract_upload_mb * 1024 * 1024
    file_bytes = await file.read(max_bytes + 1)
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.max_extract_upload_mb} MB extraction limit.",
        )

    try:
        result = extract_document(
            file_bytes=file_bytes,
            file_type=file_type,
            original_filename=original_filename or (file.filename or "document"),
        )
    except DocumentExtractionError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.message,
        ) from exc

    return DocumentExtractResponse.model_validate(result)
