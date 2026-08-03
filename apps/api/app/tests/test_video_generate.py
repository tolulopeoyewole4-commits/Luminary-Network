from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.video.generate import (
    VideoGenerationError,
    build_storyboard,
    render_storyboard_video,
)

client = TestClient(app)
AUTH = {"X-Internal-Token": settings.internal_api_token}

SAMPLE_TEXT = (
    "A calm morning by the ocean. The sun rises slowly. "
    "Gentle waves roll onto the shore. A new day begins."
)


def test_build_storyboard_text_mode_splits_sentences() -> None:
    scenes = build_storyboard(SAMPLE_TEXT, "TEXT_TO_VIDEO")
    assert len(scenes) == 4
    assert scenes[0].caption == "A calm morning by the ocean."
    assert all(s.duration_seconds >= 2.5 for s in scenes)


def test_build_storyboard_script_mode_splits_scene_headings() -> None:
    script = (
        "EXT. CITY - DAY\n\nA traveler arrives.\n\n"
        "INT. CAFE - LATER\n\nShe opens a notebook."
    )
    scenes = build_storyboard(script, "SCRIPT_TO_FILM")
    assert len(scenes) >= 2


def test_build_storyboard_rejects_empty() -> None:
    try:
        build_storyboard("   ", "TEXT_TO_VIDEO")
        raise AssertionError("expected VideoGenerationError")
    except VideoGenerationError as exc:
        assert "Provide some text" in exc.message


def test_render_storyboard_video_returns_mp4_bytes() -> None:
    scenes = build_storyboard(SAMPLE_TEXT, "TEXT_TO_VIDEO")
    video = render_storyboard_video(scenes, title="Ocean")
    assert len(video) > 500
    assert b"ftyp" in video[:64]


def test_generate_endpoint_requires_token_and_works() -> None:
    denied = client.post(
        "/api/v1/videos/generate",
        json={"title": "Ocean", "mode": "TEXT_TO_VIDEO", "source_text": SAMPLE_TEXT},
    )
    assert denied.status_code == 401

    ok = client.post(
        "/api/v1/videos/generate",
        headers=AUTH,
        json={"title": "Ocean", "mode": "TEXT_TO_VIDEO", "source_text": SAMPLE_TEXT},
    )
    assert ok.status_code == 200
    assert ok.headers["content-type"].startswith("video/mp4")
    assert int(ok.headers["x-video-scenes"]) == 4
    assert len(ok.content) > 500


def test_generate_endpoint_accepts_explicit_scenes() -> None:
    ok = client.post(
        "/api/v1/videos/generate",
        headers=AUTH,
        json={
            "title": "From scenes",
            "scenes": [
                {"caption": "Scene one.", "duration_seconds": 2.5},
                {"caption": "Scene two.", "duration_seconds": 3.0},
            ],
        },
    )
    assert ok.status_code == 200
    assert int(ok.headers["x-video-scenes"]) == 2


def test_generate_endpoint_rejects_empty_input() -> None:
    resp = client.post(
        "/api/v1/videos/generate",
        headers=AUTH,
        json={"title": "Nothing", "mode": "TEXT_TO_VIDEO", "source_text": "   "},
    )
    assert resp.status_code == 422
