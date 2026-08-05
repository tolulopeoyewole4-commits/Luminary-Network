import subprocess
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.video.export import (
    VideoExportError,
    build_video_filters,
    export_video_clip,
    resolve_drawtext_font,
)

client = TestClient(app)
AUTH = {"X-Internal-Token": settings.internal_api_token}


def _make_test_video(duration: float = 3.0, size: str = "640x360") -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "sample.mp4"
        command = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            f"color=c=blue:s={size}:d={duration}",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=440:duration={duration}",
            "-shortest",
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            str(path),
        ]
        completed = subprocess.run(command, check=False, capture_output=True, text=True)
        assert completed.returncode == 0, completed.stderr
        return path.read_bytes()


def _probe_size(video: bytes) -> tuple[int, int]:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "clip.mp4"
        path.write_bytes(video)
        completed = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=width,height",
                "-of",
                "csv=p=0",
                str(path),
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        assert completed.returncode == 0, completed.stderr
        width_s, height_s = completed.stdout.strip().split(",")
        return int(width_s), int(height_s)


def test_build_video_filters_vertical_and_brand() -> None:
    font = resolve_drawtext_font()
    assert font is not None
    filters = build_video_filters(
        aspect_ratio="9:16",
        captions_path=None,
        brand_text="Luminary",
        font_path=font,
    )
    assert any("1080:1920" in part for part in filters)
    assert any("drawtext=" in part for part in filters)


def test_export_vertical_clip_with_captions_and_brand() -> None:
    video = _make_test_video(3.0, size="640x360")
    vtt = (
        "WEBVTT\n\n"
        "1\n00:00:00.000 --> 00:00:01.200\n"
        "Hook line\n"
    )
    clip = export_video_clip(
        video,
        start_time=0.2,
        end_time=1.8,
        filename="sample.mp4",
        aspect_ratio="9:16",
        captions_vtt=vtt,
        brand_text="Creator",
    )
    assert len(clip) > 500
    width, height = _probe_size(clip)
    assert width == 1080
    assert height == 1920


def test_export_rejects_unknown_aspect_ratio() -> None:
    video = _make_test_video(2.0)
    try:
        export_video_clip(
            video,
            start_time=0.1,
            end_time=1.0,
            aspect_ratio="4:3",
        )
        raise AssertionError("expected VideoExportError")
    except VideoExportError as exc:
        assert "Aspect ratio" in exc.message


def test_export_clip_endpoint_accepts_reel_presets() -> None:
    video = _make_test_video(2.5)
    ok = client.post(
        "/api/v1/videos/export-clip",
        headers=AUTH,
        files={"file": ("clip.mp4", video, "video/mp4")},
        data={
            "start_time": "0.2",
            "end_time": "1.2",
            "original_filename": "clip.mp4",
            "aspect_ratio": "1:1",
            "brand_text": "Brand",
            "captions_vtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:00.800\nHi\n",
        },
    )
    assert ok.status_code == 200
    assert ok.headers["content-type"].startswith("video/mp4")
    assert ok.headers.get("X-Clip-Aspect-Ratio") == "1:1"
    width, height = _probe_size(ok.content)
    assert width == 1080
    assert height == 1080


def test_reel_export_migration_contract() -> None:
    root = Path(__file__).resolve().parents[4]
    sql = (root / "database" / "migrations" / "0015_reel_export_presets.sql").read_text(
        encoding="utf-8",
    )
    assert "clip_aspect_ratio" in sql
    assert "burn_captions" in sql
    assert "brand_stamp" in sql
