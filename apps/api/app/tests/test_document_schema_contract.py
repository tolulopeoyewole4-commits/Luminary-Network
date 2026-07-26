from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "database" / "migrations" / "0004_document_sections.sql"
RLS = ROOT / "database" / "policies" / "0004_document_sections_rls.sql"


def test_document_sections_migration() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "create table if not exists public.document_sections" in sql
    assert "page_start" in sql
    assert "create table if not exists public.processing_jobs" in sql


def test_document_sections_rls() -> None:
    sql = RLS.read_text(encoding="utf-8")
    assert "enable row level security" in sql
    assert "auth.uid() = user_id" in sql
    assert "document_sections" in sql
    assert "processing_jobs" in sql
