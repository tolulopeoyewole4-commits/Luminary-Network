from __future__ import annotations

import re
from typing import Any


def build_mock_transcript_segments(
    *,
    duration_seconds: float,
    title: str | None = None,
) -> list[dict[str, Any]]:
    """Deterministic mock transcript (parity with web `buildMockTranscriptSegments`)."""
    duration = max(float(duration_seconds or 60), 15.0)
    chunk_seconds = min(12, max(5, int(duration // 6)))
    clean_title = re.sub(r"\.[^.]+$", "", title or "") or "this recording"

    lines = [
        f"Welcome. In this session we explore the key ideas from {clean_title}.",
        "Let's begin by clarifying the main teaching point for today's audience.",
        "Notice how the first example reinforces the practical takeaway.",
        "Speaker note: pause here and invite reflection before continuing.",
        "The next section connects the idea to everyday application.",
        "Summarise the insight in one sentence your learners can remember.",
        "Close with a clear call to action tied to the source material.",
    ]

    segments: list[dict[str, Any]] = []
    cursor = 0.0
    index = 0

    while cursor < duration - 0.5:
        start = round(cursor, 3)
        end = round(min(duration, cursor + chunk_seconds), 3)
        speaker = "Speaker 2" if index % 4 == 3 else "Speaker 1"
        segments.append(
            {
                "start_time": start,
                "end_time": end,
                "speaker": speaker,
                "text": lines[index % len(lines)],
                "confidence": 0.82 + ((index % 5) * 0.03),
            }
        )
        cursor = end
        index += 1
        if len(segments) >= 40:
            break

    if not segments:
        segments.append(
            {
                "start_time": 0.0,
                "end_time": round(duration, 3),
                "speaker": "Speaker 1",
                "text": f"Transcript placeholder for {clean_title}.",
                "confidence": 0.8,
            }
        )

    return segments


def format_timestamp(seconds: float) -> str:
    total = max(0, int(seconds))
    hrs = total // 3600
    mins = (total % 3600) // 60
    secs = total % 60
    if hrs > 0:
        return f"{hrs}:{mins:02d}:{secs:02d}"
    return f"{mins}:{secs:02d}"
