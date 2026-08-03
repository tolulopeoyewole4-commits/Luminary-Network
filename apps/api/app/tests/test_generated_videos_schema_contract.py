from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "database" / "migrations" / "0015_generated_videos.sql"
RLS = ROOT / "database" / "policies" / "0015_generated_videos_rls.sql"
APPLY_ORDER = ROOT / "database" / "APPLY_ORDER.md"


def test_generated_videos_migration() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "create table if not exists public.generated_videos" in sql
    assert "generated_video_status" in sql
    assert "internal_storage_path" in sql
    assert "video_generate" in sql
    assert "storyboard jsonb" in sql


def test_generated_videos_rls() -> None:
    sql = RLS.read_text(encoding="utf-8")
    assert "enable row level security" in sql
    assert "auth.uid() = user_id" in sql
    assert "Users can view own generated videos" in sql
    assert "Users can create own generated videos" in sql


def test_generated_videos_in_apply_order() -> None:
    text = APPLY_ORDER.read_text(encoding="utf-8")
    assert "migrations/0015_generated_videos.sql" in text
    assert "policies/0015_generated_videos_rls.sql" in text
