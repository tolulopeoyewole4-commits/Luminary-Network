from __future__ import annotations

import re
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH = 1280
HEIGHT = 720
FPS = 30

MIN_SCENE_SECONDS = 2.5
MAX_SCENE_SECONDS = 7.0
MAX_SCENES_TEXT = 8
MAX_SCENES_FILM = 20
MAX_CAPTION_CHARS = 220
MAX_TOTAL_SECONDS = 180.0

_FONT_DIR = "/usr/share/fonts/truetype/dejavu"
_FONT_REGULAR = f"{_FONT_DIR}/DejaVuSans.ttf"
_FONT_BOLD = f"{_FONT_DIR}/DejaVuSans-Bold.ttf"

# A small palette of pleasant gradients; scenes cycle through them.
_GRADIENTS: list[tuple[tuple[int, int, int], tuple[int, int, int]]] = [
    ((15, 23, 42), (67, 56, 202)),
    ((17, 24, 39), (14, 116, 144)),
    ((30, 27, 75), (190, 24, 93)),
    ((5, 46, 22), (21, 128, 61)),
    ((28, 25, 23), (180, 83, 9)),
    ((8, 47, 73), (124, 58, 237)),
]


class VideoGenerationError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


@dataclass
class StoryboardScene:
    caption: str
    duration_seconds: float


def _clamp_caption(text: str) -> str:
    clean = re.sub(r"\s+", " ", text).strip()
    if len(clean) <= MAX_CAPTION_CHARS:
        return clean
    return clean[: MAX_CAPTION_CHARS - 1].rstrip() + "…"


def _estimate_duration(text: str) -> float:
    words = len([w for w in text.split() if w])
    seconds = words / 3.0  # ~3 words/second reading pace
    return round(min(MAX_SCENE_SECONDS, max(MIN_SCENE_SECONDS, seconds)), 1)


def _split_sentences(text: str) -> list[str]:
    normalized = re.sub(r"\s+", " ", text)
    parts = re.split(r"(?<=[.!?])\s+", normalized)
    return [p.strip() for p in parts if p.strip()]


def build_storyboard(source_text: str, mode: str = "TEXT_TO_VIDEO") -> list[StoryboardScene]:
    """Deterministic, dependency-free storyboard heuristic.

    mode: "TEXT_TO_VIDEO" (prompt -> sentence scenes) or
          "SCRIPT_TO_FILM" (script -> paragraph/scene-heading scenes).
    """
    trimmed = (source_text or "").strip()
    if not trimmed:
        raise VideoGenerationError("Provide some text to generate a video from.")

    max_scenes = MAX_SCENES_FILM if mode == "SCRIPT_TO_FILM" else MAX_SCENES_TEXT

    if mode == "SCRIPT_TO_FILM":
        paragraphs = [
            p.strip()
            for p in re.split(r"\n\s*\n|\n(?=(?:INT\.|EXT\.|SCENE\b))", trimmed, flags=re.IGNORECASE)
            if p.strip()
        ]
        chunks = paragraphs if len(paragraphs) > 1 else _split_sentences(trimmed)
    else:
        chunks = _split_sentences(trimmed) or [trimmed]

    if not chunks:
        chunks = [trimmed]

    # Merge neighbours if we exceed the scene budget so no text is dropped.
    if len(chunks) > max_scenes:
        group_size = -(-len(chunks) // max_scenes)  # ceil division
        merged = [
            " ".join(chunks[i : i + group_size])
            for i in range(0, len(chunks), group_size)
        ]
        chunks = merged

    scenes = [
        StoryboardScene(caption=_clamp_caption(chunk), duration_seconds=_estimate_duration(chunk))
        for chunk in chunks
    ]
    return _cap_total_duration(scenes)


def _cap_total_duration(scenes: list[StoryboardScene]) -> list[StoryboardScene]:
    total = sum(s.duration_seconds for s in scenes)
    if total <= MAX_TOTAL_SECONDS or total <= 0:
        return scenes
    scale = MAX_TOTAL_SECONDS / total
    for scene in scenes:
        scene.duration_seconds = round(max(MIN_SCENE_SECONDS, scene.duration_seconds * scale), 1)
    return scenes


def normalize_scenes(raw_scenes: list[dict]) -> list[StoryboardScene]:
    """Validate/normalize scenes supplied by the caller (e.g. the web AI provider)."""
    scenes: list[StoryboardScene] = []
    for raw in raw_scenes:
        caption = _clamp_caption(str(raw.get("caption", "")))
        if not caption:
            continue
        try:
            duration = float(raw.get("duration_seconds", MIN_SCENE_SECONDS))
        except (TypeError, ValueError):
            duration = MIN_SCENE_SECONDS
        duration = round(min(MAX_SCENE_SECONDS, max(MIN_SCENE_SECONDS, duration)), 1)
        scenes.append(StoryboardScene(caption=caption, duration_seconds=duration))
    if not scenes:
        raise VideoGenerationError("Storyboard has no usable scenes.")
    return _cap_total_duration(scenes)


def _load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = [w for w in text.split() if w]
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        width = draw.textlength(candidate, font=font)
        if width > max_width and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines or [""]


def _render_scene_png(
    scene: StoryboardScene,
    index: int,
    total: int,
    title: str,
    out_path: Path,
) -> None:
    from_color, to_color = _GRADIENTS[index % len(_GRADIENTS)]
    image = Image.new("RGB", (WIDTH, HEIGHT), from_color)
    draw = ImageDraw.Draw(image)

    # Vertical gradient (row-by-row lerp; cheap at 720 rows).
    for y in range(HEIGHT):
        t = y / (HEIGHT - 1)
        color = tuple(int(from_color[c] + (to_color[c] - from_color[c]) * t) for c in range(3))
        draw.line([(0, y), (WIDTH, y)], fill=color)

    header_font = _load_font(_FONT_BOLD, 28)
    label_font = _load_font(_FONT_REGULAR, 22)
    caption_font = _load_font(_FONT_BOLD, 52)
    footer_font = _load_font(_FONT_REGULAR, 24)

    draw.text((60, 46), "LUMINARY NETWORK", font=header_font, fill=(255, 255, 255))
    if title:
        title_width = draw.textlength(title, font=label_font)
        draw.text((WIDTH - 60 - title_width, 50), title, font=label_font, fill=(230, 230, 240))

    max_width = WIDTH - 200
    lines = _wrap(draw, scene.caption, caption_font, max_width)
    line_height = 66
    block_height = len(lines) * line_height
    y = (HEIGHT - block_height) // 2
    for line in lines:
        line_width = draw.textlength(line, font=caption_font)
        draw.text(((WIDTH - line_width) // 2, y), line, font=caption_font, fill=(255, 255, 255))
        y += line_height

    counter = f"Scene {index + 1} / {total}"
    draw.text((60, HEIGHT - 70), counter, font=footer_font, fill=(220, 220, 230))
    dur = f"{scene.duration_seconds:.1f}s"
    dur_width = draw.textlength(dur, font=footer_font)
    draw.text((WIDTH - 60 - dur_width, HEIGHT - 70), dur, font=footer_font, fill=(220, 220, 230))

    image.save(out_path, format="PNG")


def _run_ffmpeg(command: list[str]) -> None:
    try:
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=300,
        )
    except FileNotFoundError as exc:
        raise VideoGenerationError("ffmpeg is not installed on the API host.") from exc
    except subprocess.TimeoutExpired as exc:
        raise VideoGenerationError("Video rendering timed out.") from exc

    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "").strip()
        raise VideoGenerationError(detail[-500:] or "Unable to render video with ffmpeg.")


def render_storyboard_video(scenes: list[StoryboardScene], *, title: str = "") -> bytes:
    if not scenes:
        raise VideoGenerationError("Cannot render a video with no scenes.")

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        segment_paths: list[Path] = []

        for index, scene in enumerate(scenes):
            png_path = tmp_dir / f"scene_{index}.png"
            _render_scene_png(scene, index, len(scenes), title, png_path)

            segment_path = tmp_dir / f"seg_{index}.mp4"
            _run_ffmpeg(
                [
                    "ffmpeg",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-y",
                    "-loop",
                    "1",
                    "-i",
                    str(png_path),
                    "-t",
                    f"{scene.duration_seconds:.3f}",
                    "-r",
                    str(FPS),
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-pix_fmt",
                    "yuv420p",
                    "-vf",
                    f"scale={WIDTH}:{HEIGHT},format=yuv420p",
                    str(segment_path),
                ]
            )
            segment_paths.append(segment_path)

        concat_path = tmp_dir / "concat.txt"
        concat_path.write_text(
            "\n".join(f"file '{p}'" for p in segment_paths),
            encoding="utf-8",
        )

        output_path = tmp_dir / "output.mp4"
        _run_ffmpeg(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(concat_path),
                "-c",
                "copy",
                "-movflags",
                "+faststart",
                str(output_path),
            ]
        )

        if not output_path.exists():
            raise VideoGenerationError("Rendered video was not produced.")
        video_bytes = output_path.read_bytes()
        if not video_bytes:
            raise VideoGenerationError("Rendered video was empty.")
        return video_bytes


def generate_video(
    *,
    scenes: list[dict] | None = None,
    source_text: str | None = None,
    mode: str = "TEXT_TO_VIDEO",
    title: str = "",
) -> tuple[bytes, list[StoryboardScene]]:
    """Render an MP4 from either an explicit storyboard or raw text.

    Returns (mp4_bytes, resolved_scenes).
    """
    if scenes:
        resolved = normalize_scenes(scenes)
    elif source_text is not None:
        resolved = build_storyboard(source_text, mode)
    else:
        raise VideoGenerationError("Provide either scenes or source_text.")

    video_bytes = render_storyboard_video(resolved, title=title)
    return video_bytes, resolved
