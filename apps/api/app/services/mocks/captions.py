from __future__ import annotations

from typing import Any


def build_caption_cues_from_segments(
    segments: list[dict[str, Any]],
    *,
    max_chars_per_cue: int = 84,
) -> list[dict[str, Any]]:
    """Parity with web `buildCaptionCuesFromSegments`."""
    cues: list[dict[str, Any]] = []

    for segment in segments:
        text = str(segment.get("text") or "").strip()
        if not text:
            continue
        start_time = float(segment["start_time"])
        end_time = float(segment["end_time"])

        if len(text) <= max_chars_per_cue:
            cues.append(
                {
                    "start_time": round(start_time, 3),
                    "end_time": round(end_time, 3),
                    "text": text,
                }
            )
            continue

        words = text.split()
        lines: list[str] = []
        current = ""
        for word in words:
            next_line = f"{current} {word}".strip() if current else word
            if len(next_line) > max_chars_per_cue and current:
                lines.append(current)
                current = word
            else:
                current = next_line
        if current:
            lines.append(current)

        duration = max(0.5, end_time - start_time)
        slice_len = duration / len(lines)
        for index, line in enumerate(lines):
            start = round(start_time + slice_len * index, 3)
            end = round(min(end_time, start + slice_len), 3)
            cues.append(
                {
                    "start_time": start,
                    "end_time": max(end, round(start + 0.4, 3)),
                    "text": line,
                }
            )

    return cues
