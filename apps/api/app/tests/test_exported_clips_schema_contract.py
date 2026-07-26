from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "database" / "migrations" / "0010_exported_clips.sql"
RLS = ROOT / "database" / "policies" / "0010_exported_clips_rls.sql"


def test_exported_clips_migration() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "create table if not exists public.exported_clips" in sql
    assert "exported_clip_status" in sql
    assert "internal_storage_path" in sql
    assert "video_export" in sql
    assert "exported_clips_candidate_unique" in sql


def test_exported_clips_rls() -> None:
    sql = RLS.read_text(encoding="utf-8")
    assert "enable row level security" in sql
    assert "auth.uid() = user_id" in sql
    assert "Users can view own exported clips" in sql
    assert "Users can create own exported clips" in sql
