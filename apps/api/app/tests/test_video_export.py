import subprocess
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.video.export import VideoExportError, export_video_clip

client = TestClient(app)
AUTH = {"X-Internal-Token": settings.internal_api_token}


def _make_test_video(duration: float = 3.0) -> bytes:
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
            f"color=c=blue:s=320x240:d={duration}",
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


def test_export_video_clip_returns_bytes() -> None:
    video = _make_test_video(3.0)
    clip = export_video_clip(video, start_time=0.5, end_time=1.5, filename="sample.mp4")
    assert len(clip) > 500
    assert clip[:4] == b"\x00\x00\x00" or b"ftyp" in clip[:64]


def test_export_video_clip_rejects_invalid_window() -> None:
    video = _make_test_video(2.0)
    try:
        export_video_clip(video, start_time=1.5, end_time=1.0)
        raise AssertionError("expected VideoExportError")
    except VideoExportError as exc:
        assert "End time" in exc.message


def test_export_clip_endpoint_requires_token_and_works() -> None:
    video = _make_test_video(2.5)

    denied = client.post(
        "/api/v1/videos/export-clip",
        files={"file": ("clip.mp4", video, "video/mp4")},
        data={"start_time": "0.2", "end_time": "1.2", "original_filename": "clip.mp4"},
    )
    assert denied.status_code == 401

    ok = client.post(
        "/api/v1/videos/export-clip",
        headers=AUTH,
        files={"file": ("clip.mp4", video, "video/mp4")},
        data={"start_time": "0.2", "end_time": "1.2", "original_filename": "clip.mp4"},
    )
    assert ok.status_code == 200
    assert ok.headers["content-type"].startswith("video/mp4")
    assert len(ok.content) > 500
