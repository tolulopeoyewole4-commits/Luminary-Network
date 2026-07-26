from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "database" / "migrations" / "0012_ai_generation_jobs.sql"


def test_ai_generation_jobs_migration_exists() -> None:
    assert MIGRATION.is_file()
    text = MIGRATION.read_text(encoding="utf-8")
    assert "course_generate" in text
    assert "social_generate" in text
    assert "add column if not exists payload jsonb" in text
