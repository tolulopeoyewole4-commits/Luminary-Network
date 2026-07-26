from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "database" / "migrations" / "0006_generated_content.sql"
RLS = ROOT / "database" / "policies" / "0006_generated_content_rls.sql"


def test_generated_content_migration() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "create table if not exists public.generated_content" in sql
    assert "source_references jsonb" in sql
    assert "duplicated_from_id" in sql


def test_generated_content_rls() -> None:
    sql = RLS.read_text(encoding="utf-8")
    assert "enable row level security" in sql
    assert "auth.uid() = user_id" in sql
