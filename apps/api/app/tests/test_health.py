from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "luminary-ai-api"
    assert "ffmpeg" in body
    assert "ffprobe" in body


def test_root_returns_service_info() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "luminary-ai-api"


def test_cors_origins_include_configured_values() -> None:
    settings = Settings(
        allowed_origins="https://app.example.com, https://preview.example.com"
    )
    origins = settings.cors_origins()
    assert "http://localhost:3000" in origins
    assert "https://app.example.com" in origins
    assert "https://preview.example.com" in origins
