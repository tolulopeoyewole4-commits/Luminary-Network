from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


class VideoMetadataError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def extract_video_metadata(file_bytes: bytes, filename: str = "video.mp4") -> dict:
    if not file_bytes:
        raise VideoMetadataError("Video file is empty.")

    suffix = Path(filename).suffix or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as temp:
        temp.write(file_bytes)
        temp.flush()
        return probe_video_path(temp.name)


def probe_video_path(path: str) -> dict:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration,size,format_name:stream=codec_type,codec_name,width,height",
        "-of",
        "json",
        path,
    ]

    try:
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=60,
        )
    except FileNotFoundError as exc:
        raise VideoMetadataError(
            "ffprobe is not installed on the API host."
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise VideoMetadataError("Video metadata extraction timed out.") from exc

    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "").strip()
        raise VideoMetadataError(
            detail or "Unable to read video metadata with ffprobe."
        )

    try:
        payload = json.loads(completed.stdout or "{}")
    except json.JSONDecodeError as exc:
        raise VideoMetadataError("ffprobe returned invalid JSON.") from exc

    fmt = payload.get("format") or {}
    streams = payload.get("streams") or []

    duration_raw = fmt.get("duration")
    try:
        duration_seconds = float(duration_raw) if duration_raw is not None else 0.0
    except (TypeError, ValueError) as exc:
        raise VideoMetadataError("Video duration is missing or invalid.") from exc

    if duration_seconds <= 0:
        raise VideoMetadataError("Video duration could not be determined.")

    video_stream = next(
        (stream for stream in streams if stream.get("codec_type") == "video"),
        None,
    )
    audio_stream = next(
        (stream for stream in streams if stream.get("codec_type") == "audio"),
        None,
    )

    size_raw = fmt.get("size")
    try:
        size_bytes = int(size_raw) if size_raw is not None else None
    except (TypeError, ValueError):
        size_bytes = None

    return {
        "duration_seconds": round(duration_seconds, 3),
        "width": int(video_stream["width"]) if video_stream and video_stream.get("width") else None,
        "height": int(video_stream["height"]) if video_stream and video_stream.get("height") else None,
        "video_codec": video_stream.get("codec_name") if video_stream else None,
        "audio_codec": audio_stream.get("codec_name") if audio_stream else None,
        "format_name": fmt.get("format_name"),
        "size_bytes": size_bytes,
    }
