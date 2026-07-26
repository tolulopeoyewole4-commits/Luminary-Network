from __future__ import annotations

from io import BytesIO

import fitz
from docx import Document

from app.services.documents.text_utils import (
    normalize_whitespace,
    split_into_sections,
)


SUPPORTED_FILE_TYPES = {"pdf", "docx", "txt"}


class DocumentExtractionError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def extract_document(
    *,
    file_bytes: bytes,
    file_type: str,
    original_filename: str = "document",
) -> dict:
    normalized_type = file_type.lower().strip()
    if normalized_type not in SUPPORTED_FILE_TYPES:
        raise DocumentExtractionError(
            f"Unsupported document type '{file_type}'. Allowed: PDF, DOCX, TXT."
        )

    if not file_bytes:
        raise DocumentExtractionError("Uploaded file is empty.")

    if normalized_type == "pdf":
        return _extract_pdf(file_bytes, original_filename)
    if normalized_type == "docx":
        return _extract_docx(file_bytes, original_filename)
    return _extract_txt(file_bytes, original_filename)


def _extract_pdf(file_bytes: bytes, original_filename: str) -> dict:
    try:
        document = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:  # noqa: BLE001 - surface as extraction error
        raise DocumentExtractionError(
            "Unable to open PDF. The file may be corrupt or password-protected."
        ) from exc

    warnings: list[str] = []
    blocks: list[tuple[str, int | None]] = []
    page_count = document.page_count

    try:
        for index in range(page_count):
            page = document.load_page(index)
            text = page.get_text("text") or ""
            cleaned = normalize_whitespace(text)
            if cleaned:
                blocks.append((cleaned, index + 1))
    finally:
        document.close()

    if not blocks:
        raise DocumentExtractionError(
            "No extractable text found. This may be a scanned PDF; OCR is not enabled in the MVP."
        )

    total_chars = sum(len(block[0]) for block in blocks)
    if total_chars < 40:
        warnings.append(
            "Very little text was extracted. The PDF may be image-based."
        )

    sections = split_into_sections(
        blocks,
        fallback_title=_title_from_filename(original_filename),
    )

    return {
        "file_type": "pdf",
        "page_count": page_count,
        "section_count": len(sections),
        "sections": sections,
        "warnings": warnings,
    }


def _extract_docx(file_bytes: bytes, original_filename: str) -> dict:
    try:
        document = Document(BytesIO(file_bytes))
    except Exception as exc:  # noqa: BLE001
        raise DocumentExtractionError(
            "Unable to open Word document. The file may be corrupt."
        ) from exc

    blocks: list[tuple[str, int | None]] = []
    buffer: list[str] = []

    def flush_buffer() -> None:
        if not buffer:
            return
        blocks.append(("\n".join(buffer), None))
        buffer.clear()

    for paragraph in document.paragraphs:
        text = normalize_whitespace(paragraph.text)
        if not text:
            continue
        style_name = (paragraph.style.name if paragraph.style else "") or ""
        is_heading = style_name.lower().startswith("heading")
        if is_heading:
            flush_buffer()
            # Keep heading text as its own block so section splitting can title it.
            blocks.append((text, None))
            # Insert an empty marker body if consecutive headings appear.
            continue
        buffer.append(text)

    flush_buffer()

    if not blocks:
        raise DocumentExtractionError("No extractable text found in the Word document.")

    sections = split_into_sections(
        blocks,
        fallback_title=_title_from_filename(original_filename),
    )

    return {
        "file_type": "docx",
        "page_count": None,
        "section_count": len(sections),
        "sections": sections,
        "warnings": [],
    }


def _extract_txt(file_bytes: bytes, original_filename: str) -> dict:
    try:
        text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        text = file_bytes.decode("latin-1", errors="replace")

    cleaned = normalize_whitespace(text)
    if not cleaned:
        raise DocumentExtractionError("Text file is empty.")

    # Treat blank-line-separated chunks as blocks for heading detection.
    chunks = [chunk.strip() for chunk in re_split_blocks(cleaned)]
    blocks = [(chunk, None) for chunk in chunks if chunk]
    sections = split_into_sections(
        blocks,
        fallback_title=_title_from_filename(original_filename),
    )

    return {
        "file_type": "txt",
        "page_count": None,
        "section_count": len(sections),
        "sections": sections,
        "warnings": [],
    }


def re_split_blocks(text: str) -> list[str]:
    import re

    return re.split(r"\n\s*\n", text)


def _title_from_filename(filename: str) -> str:
    name = filename.rsplit("/", 1)[-1]
    if "." in name:
        name = name.rsplit(".", 1)[0]
    name = name.replace("_", " ").replace("-", " ").strip()
    return name[:300] or "Document"
