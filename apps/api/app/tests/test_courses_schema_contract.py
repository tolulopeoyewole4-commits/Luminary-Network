from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "database" / "migrations" / "0005_courses.sql"
RLS = ROOT / "database" / "policies" / "0005_courses_rls.sql"


def test_courses_migration_defines_hierarchy() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "create table if not exists public.courses" in sql
    assert "create table if not exists public.course_modules" in sql
    assert "create table if not exists public.course_lessons" in sql
    assert "source_references jsonb" in sql


def test_courses_rls_is_owner_scoped() -> None:
    sql = RLS.read_text(encoding="utf-8")
    assert "enable row level security" in sql
    assert sql.count("auth.uid() = user_id") >= 3
