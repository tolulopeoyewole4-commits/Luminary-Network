from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path


class VideoExportError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def export_video_clip(
    file_bytes: bytes,
    *,
    start_time: float,
    end_time: float,
    filename: str = "source.mp4",
) -> bytes:
    if not file_bytes:
        raise VideoExportError("Video file is empty.")
    if start_time < 0:
        raise VideoExportError("Start time must be zero or greater.")
    if end_time <= start_time:
        raise VideoExportError("End time must be after start time.")
    if end_time - start_time > 180:
        raise VideoExportError("Clip duration cannot exceed 3 minutes.")

    suffix = Path(filename).suffix or ".mp4"
    with tempfile.TemporaryDirectory() as tmp:
        source_path = Path(tmp) / f"source{suffix}"
        output_path = Path(tmp) / "clip.mp4"
        source_path.write_bytes(file_bytes)

        # Re-encode for accurate cuts on short social clips.
        command = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-ss",
            f"{start_time:.3f}",
            "-to",
            f"{end_time:.3f}",
            "-i",
            str(source_path),
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            str(output_path),
        ]

        try:
            completed = subprocess.run(
                command,
                check=False,
                capture_output=True,
                text=True,
                timeout=180,
            )
        except FileNotFoundError as exc:
            raise VideoExportError("ffmpeg is not installed on the API host.") from exc
        except subprocess.TimeoutExpired as exc:
            raise VideoExportError("Clip export timed out.") from exc

        if completed.returncode != 0 or not output_path.exists():
            detail = (completed.stderr or completed.stdout or "").strip()
            raise VideoExportError(detail or "Unable to export clip with ffmpeg.")

        clip_bytes = output_path.read_bytes()
        if not clip_bytes:
            raise VideoExportError("Exported clip was empty.")
        return clip_bytes
