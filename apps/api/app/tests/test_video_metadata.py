import subprocess
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.video.metadata import extract_video_metadata, probe_video_path

client = TestClient(app)
AUTH = {"X-Internal-Token": settings.internal_api_token}


def _make_test_video() -> bytes:
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
            "color=c=black:s=320x240:d=1",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:duration=1",
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


def test_probe_video_path_returns_duration() -> None:
    video = _make_test_video()
    with tempfile.NamedTemporaryFile(suffix=".mp4") as temp:
        temp.write(video)
        temp.flush()
        meta = probe_video_path(temp.name)

    assert meta["duration_seconds"] >= 0.9
    assert meta["width"] == 320
    assert meta["height"] == 240
    assert meta["video_codec"]


def test_extract_video_metadata_from_bytes() -> None:
    video = _make_test_video()
    meta = extract_video_metadata(video, filename="clip.mp4")
    assert meta["duration_seconds"] > 0


def test_metadata_endpoint_requires_token_and_works() -> None:
    video = _make_test_video()

    denied = client.post(
        "/api/v1/videos/metadata",
        files={"file": ("clip.mp4", video, "video/mp4")},
        data={"original_filename": "clip.mp4"},
    )
    assert denied.status_code == 401

    ok = client.post(
        "/api/v1/videos/metadata",
        headers=AUTH,
        files={"file": ("clip.mp4", video, "video/mp4")},
        data={"original_filename": "clip.mp4"},
    )
    assert ok.status_code == 200
    body = ok.json()
    assert body["duration_seconds"] > 0
    assert body["width"] == 320
