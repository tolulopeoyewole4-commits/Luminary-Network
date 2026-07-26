import re

HEADING_PATTERN = re.compile(
    r"^(?:"
    r"chapter\s+\d+\b.*|"
    r"part\s+\d+\b.*|"
    r"section\s+\d+(?:\.\d+)*\b.*|"
    r"\d+\.\s+\S.*|"
    r"[A-Z][A-Z0-9 ,\-]{3,80}"
    r")$",
    re.IGNORECASE,
)


def normalize_whitespace(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def approximate_token_count(text: str) -> int:
    # Lightweight estimate for MVP storage/metrics (not model-accurate).
    words = re.findall(r"\S+", text)
    return max(len(words), 1) if text.strip() else 0


def looks_like_heading(line: str) -> bool:
    cleaned = line.strip()
    if not cleaned or len(cleaned) > 120:
        return False
    if cleaned.endswith("."):
        return False
    return bool(HEADING_PATTERN.match(cleaned))


def split_into_sections(
    blocks: list[tuple[str, int | None]],
    *,
    fallback_title: str = "Document",
) -> list[dict]:
    """
    Split ordered text blocks into sections using heading heuristics.

    Each block is (text, page_number_or_none).
    """
    sections: list[dict] = []
    current_title = fallback_title
    current_pages: list[int] = []
    current_chunks: list[str] = []
    section_number = 1

    def flush() -> None:
        nonlocal section_number, current_title, current_pages, current_chunks
        body = normalize_whitespace("\n\n".join(current_chunks))
        if not body and not current_chunks:
            current_title = fallback_title
            current_pages = []
            current_chunks = []
            return

        page_start = min(current_pages) if current_pages else None
        page_end = max(current_pages) if current_pages else None
        sections.append(
            {
                "section_title": current_title[:300] or f"Section {section_number}",
                "section_number": section_number,
                "page_start": page_start,
                "page_end": page_end,
                "extracted_text": body,
                "token_count": approximate_token_count(body),
            }
        )
        section_number += 1
        current_title = fallback_title
        current_pages = []
        current_chunks = []

    for text, page in blocks:
        cleaned = normalize_whitespace(text)
        if not cleaned:
            continue

        lines = cleaned.split("\n")
        first_line = lines[0].strip()
        remainder = normalize_whitespace("\n".join(lines[1:]))

        if looks_like_heading(first_line) and (remainder or len(lines) == 1):
            if current_chunks:
                flush()
            current_title = first_line
            if page is not None:
                current_pages.append(page)
            if remainder:
                current_chunks.append(remainder)
            elif len(lines) == 1:
                # Heading-only block; keep title and wait for body.
                continue
            continue

        if page is not None:
            current_pages.append(page)
        current_chunks.append(cleaned)

    flush()

    if not sections:
        sections.append(
            {
                "section_title": fallback_title,
                "section_number": 1,
                "page_start": None,
                "page_end": None,
                "extracted_text": "",
                "token_count": 0,
            }
        )

    return sections
