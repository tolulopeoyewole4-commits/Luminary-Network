from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

ASPECT_RATIOS = frozenset({"original", "9:16", "1:1"})

_FONT_CANDIDATES = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    "/usr/share/fonts/truetype/macos/Inter-Bold.ttf",
)


class VideoExportError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def resolve_drawtext_font() -> str | None:
    for candidate in _FONT_CANDIDATES:
        if Path(candidate).is_file():
            return candidate
    return None


def _escape_filter_path(path: Path) -> str:
    # Escape characters that break ffmpeg filtergraph parsing.
    return str(path).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def _escape_drawtext(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "\\'")
        .replace("%", "\\%")
    )


def _aspect_filter(aspect_ratio: str) -> str | None:
    if aspect_ratio == "9:16":
        return (
            "scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920"
        )
    if aspect_ratio == "1:1":
        return (
            "scale=1080:1080:force_original_aspect_ratio=increase,"
            "crop=1080:1080"
        )
    return None


def _caption_style(aspect_ratio: str) -> str:
    # Larger type on vertical frames so burned captions stay readable on phones.
    font_size = 42 if aspect_ratio == "9:16" else 32 if aspect_ratio == "1:1" else 28
    margin_v = 120 if aspect_ratio == "9:16" else 80
    return (
        f"FontName=DejaVu Sans,FontSize={font_size},PrimaryColour=&H00FFFFFF&,"
        f"OutlineColour=&H00000000&,BorderStyle=3,Outline=2,Shadow=0,"
        f"Alignment=2,MarginV={margin_v}"
    )


def build_video_filters(
    *,
    aspect_ratio: str,
    captions_path: Path | None,
    brand_text: str | None,
    font_path: str | None,
) -> list[str]:
    filters: list[str] = []
    aspect = _aspect_filter(aspect_ratio)
    if aspect:
        filters.append(aspect)

    if captions_path is not None:
        escaped = _escape_filter_path(captions_path)
        style = _caption_style(aspect_ratio).replace("'", "")
        filters.append(f"subtitles={escaped}:force_style='{style}'")

    if brand_text:
        if not font_path:
            raise VideoExportError(
                "Brand stamp requires a TrueType font on the API host "
                "(install fonts-dejavu-core)."
            )
        text = _escape_drawtext(brand_text.strip()[:48])
        font = _escape_filter_path(Path(font_path))
        font_size = 40 if aspect_ratio == "9:16" else 32
        filters.append(
            "drawtext="
            f"fontfile={font}:"
            f"text='{text}':"
            f"fontsize={font_size}:"
            "fontcolor=white:"
            "borderw=2:"
            "bordercolor=black@0.85:"
            "x=(w-text_w)/2:"
            "y=h*0.055"
        )

    return filters


def export_video_clip(
    file_bytes: bytes,
    *,
    start_time: float,
    end_time: float,
    filename: str = "source.mp4",
    aspect_ratio: str = "original",
    captions_vtt: str | None = None,
    brand_text: str | None = None,
) -> bytes:
    if not file_bytes:
        raise VideoExportError("Video file is empty.")
    if start_time < 0:
        raise VideoExportError("Start time must be zero or greater.")
    if end_time <= start_time:
        raise VideoExportError("End time must be after start time.")
    if end_time - start_time > 180:
        raise VideoExportError("Clip duration cannot exceed 3 minutes.")
    if aspect_ratio not in ASPECT_RATIOS:
        raise VideoExportError(
            'Aspect ratio must be one of: original, 9:16, 1:1.'
        )

    brand = (brand_text or "").strip() or None
    caption_payload = (captions_vtt or "").strip() or None

    suffix = Path(filename).suffix or ".mp4"
    with tempfile.TemporaryDirectory() as tmp:
        source_path = Path(tmp) / f"source{suffix}"
        output_path = Path(tmp) / "clip.mp4"
        source_path.write_bytes(file_bytes)

        captions_path: Path | None = None
        if caption_payload:
            captions_path = Path(tmp) / "captions.vtt"
            captions_path.write_text(caption_payload, encoding="utf-8")

        font_path = resolve_drawtext_font() if brand else None
        filters = build_video_filters(
            aspect_ratio=aspect_ratio,
            captions_path=captions_path,
            brand_text=brand,
            font_path=font_path,
        )

        # Re-encode for accurate cuts and social-ready framing/overlays.
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
        ]
        if filters:
            command.extend(["-vf", ",".join(filters)])
        command.extend(
            [
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
        )

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
