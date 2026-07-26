"""Lightweight contract checks for the projects migration expectations."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "database" / "migrations" / "0002_projects.sql"
POLICY = ROOT / "database" / "policies" / "0002_projects_rls.sql"


def test_projects_migration_defines_core_columns() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    for fragment in [
        "create table if not exists public.projects",
        "user_id uuid not null",
        "name text not null",
        "project_type public.project_type",
        "status public.project_status",
    ]:
        assert fragment in sql


def test_projects_rls_policies_cover_crud() -> None:
    sql = POLICY.read_text(encoding="utf-8")
    assert "enable row level security" in sql
    assert "for select" in sql
    assert "for insert" in sql
    assert "for update" in sql
    assert "for delete" in sql
    assert "auth.uid() = user_id" in sql
