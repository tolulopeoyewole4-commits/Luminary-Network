from __future__ import annotations

import re
from typing import Any

from app.services.mocks.transcript import format_timestamp


def build_mock_clip_candidates(
    *,
    duration_seconds: float,
    title: str | None = None,
    segments: list[dict[str, Any]] | None = None,
    max_candidates: int = 5,
) -> list[dict[str, Any]]:
    """Deterministic mock clip detection (parity with web `buildMockClipCandidates`)."""
    duration = max(float(duration_seconds or 60), 20.0)
    max_n = min(max(max_candidates, 1), 8)
    source_title = re.sub(r"\.[^.]+$", "", (title or "").strip()) or "this recording"

    if segments:
        built = _from_segments(segments, duration, source_title, max_n)
        if built:
            return built
    return _from_duration(duration, source_title, max_n)


def _clip_title(source_title: str, rank: int, excerpt: str | None = None) -> str:
    if excerpt:
        words = " ".join(excerpt.split()[:6])
        return f"Clip {rank}: {words}"
    return f"Clip {rank}: {source_title}"


def _from_segments(
    segments: list[dict[str, Any]],
    duration: float,
    source_title: str,
    max_candidates: int,
) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    step = max(1, len(segments) // max_candidates)
    i = 0
    while i < len(segments) and len(candidates) < max_candidates:
        start_seg = segments[i]
        end_seg = segments[min(i + 1, len(segments) - 1)]
        start_time = round(max(0.0, float(start_seg["start_time"])), 3)
        end_time = round(
            min(duration, max(float(end_seg["end_time"]), start_time + 12)),
            3,
        )
        if end_time - start_time > 45:
            end_time = round(start_time + 45, 3)
        if end_time <= start_time:
            i += step
            continue

        full_text = str(start_seg.get("text") or "").strip()
        excerpt = full_text[:90]
        rank = len(candidates) + 1
        ellipsis = "…" if len(full_text) >= 90 else ""
        candidates.append(
            {
                "title": _clip_title(source_title, rank, excerpt),
                "reason": (
                    f"Strong teaching beat around {format_timestamp(start_time)}: "
                    f"“{excerpt}{ellipsis}”"
                ),
                "start_time": start_time,
                "end_time": end_time,
                "score": round(0.92 - len(candidates) * 0.05, 4),
                "rank": rank,
            }
        )
        i += step

    return candidates or _from_duration(duration, source_title, max_candidates)


def _from_duration(
    duration: float,
    source_title: str,
    max_candidates: int,
) -> list[dict[str, Any]]:
    clip_length = min(30, max(12, int(duration // 5)))
    gap = max(clip_length, int(duration // max(max_candidates, 1)))
    candidates: list[dict[str, Any]] = []
    start = 0.0
    while start < duration - 8 and len(candidates) < max_candidates:
        start_time = round(start, 3)
        end_time = round(min(duration, start + clip_length), 3)
        if end_time <= start_time:
            break
        rank = len(candidates) + 1
        candidates.append(
            {
                "title": _clip_title(source_title, rank),
                "reason": (
                    f"Evenly spaced highlight window "
                    f"({format_timestamp(start_time)}–{format_timestamp(end_time)}) "
                    "for short-form review."
                ),
                "start_time": start_time,
                "end_time": end_time,
                "score": round(0.8 - len(candidates) * 0.04, 4),
                "rank": rank,
            }
        )
        start += gap

    if not candidates:
        candidates.append(
            {
                "title": _clip_title(source_title, 1),
                "reason": "Fallback highlight covering the available recording.",
                "start_time": 0.0,
                "end_time": round(min(duration, 20), 3),
                "score": 0.75,
                "rank": 1,
            }
        )
    return candidates
