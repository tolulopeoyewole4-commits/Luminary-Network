from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "database" / "migrations" / "0014_job_worker_claim.sql"


def test_worker_claim_migration_exists() -> None:
    assert MIGRATION.is_file()
    text = MIGRATION.read_text(encoding="utf-8")
    assert "claim_processing_job" in text
    assert "for update skip locked" in text.lower()
    assert "service_role" in text
    assert "document_extract" in text
    assert "video_metadata" in text
    assert "video_export" in text
