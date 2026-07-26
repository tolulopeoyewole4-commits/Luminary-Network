from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "database" / "migrations" / "0007_video_processing.sql"


def test_video_processing_migration() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "media_metadata jsonb" in sql
    assert "video_metadata" in sql
