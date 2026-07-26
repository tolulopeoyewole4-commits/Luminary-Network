from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "database" / "migrations" / "0013_cancel_processing_jobs.sql"


def test_cancel_jobs_migration_exists() -> None:
    assert MIGRATION.is_file()
    text = MIGRATION.read_text(encoding="utf-8")
    assert "cancelled" in text
    assert "processing_job_status" in text
