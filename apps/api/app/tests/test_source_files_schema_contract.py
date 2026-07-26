"""Contract checks for source file migration and storage policies."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "database" / "migrations" / "0003_source_files.sql"
RLS = ROOT / "database" / "policies" / "0003_source_files_rls.sql"
STORAGE = ROOT / "database" / "policies" / "0003_source_files_storage.sql"


def test_source_files_migration_has_required_fields() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    for fragment in [
        "create table if not exists public.source_files",
        "internal_storage_path text not null unique",
        "processing_status public.source_processing_status",
        "file_type public.source_file_type",
    ]:
        assert fragment in sql


def test_source_files_rls_is_owner_scoped() -> None:
    sql = RLS.read_text(encoding="utf-8")
    assert "enable row level security" in sql
    assert "auth.uid() = user_id" in sql
    assert "for insert" in sql
    assert "exists (" in sql


def test_storage_bucket_is_private() -> None:
    sql = STORAGE.read_text(encoding="utf-8")
    assert "'source-files'" in sql
    assert "public = excluded.public" in sql or "false" in sql
    assert "auth.uid()::text" in sql
    assert "for insert" in sql
    assert "for select" in sql
