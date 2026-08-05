from __future__ import annotations


def format_vtt_timestamp(seconds: float) -> str:
    total_ms = max(0, int(round(seconds * 1000)))
    hours = total_ms // 3_600_000
    minutes = (total_ms % 3_600_000) // 60_000
    secs = (total_ms % 60_000) // 1000
    ms = total_ms % 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{ms:03d}"


def slice_caption_cues_for_clip(
    cues: list[dict[str, object]],
    *,
    start_time: float,
    end_time: float,
) -> list[dict[str, object]]:
    """Return cues overlapping [start_time, end_time], times relative to clip start."""
    if end_time <= start_time:
        return []

    sliced: list[dict[str, object]] = []
    for cue in cues:
        try:
            cue_start = float(cue["start_time"])  # type: ignore[arg-type]
            cue_end = float(cue["end_time"])  # type: ignore[arg-type]
        except (KeyError, TypeError, ValueError):
            continue
        text = str(cue.get("text") or "").strip()
        if not text:
            continue
        if cue_end <= start_time or cue_start >= end_time:
            continue

        relative_start = max(0.0, cue_start - start_time)
        relative_end = min(end_time - start_time, cue_end - start_time)
        if relative_end - relative_start < 0.15:
            continue

        sliced.append(
            {
                "start_time": round(relative_start, 3),
                "end_time": round(relative_end, 3),
                "text": text,
            }
        )

    return sliced


def build_webvtt(cues: list[dict[str, object]]) -> str:
    blocks: list[str] = []
    for index, cue in enumerate(cues, start=1):
        text = str(cue.get("text") or "").strip() or "…"
        start = format_vtt_timestamp(float(cue["start_time"]))  # type: ignore[arg-type]
        end = format_vtt_timestamp(float(cue["end_time"]))  # type: ignore[arg-type]
        blocks.append(f"{index}\n{start} --> {end}\n{text}")
    return "WEBVTT\n\n" + "\n\n".join(blocks) + ("\n" if blocks else "")
