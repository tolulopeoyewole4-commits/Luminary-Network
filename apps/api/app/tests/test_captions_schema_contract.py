from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "database" / "migrations" / "0011_captions.sql"
RLS = ROOT / "database" / "policies" / "0011_captions_rls.sql"


def test_captions_migration() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "create table if not exists public.captions" in sql
    assert "create table if not exists public.caption_cues" in sql
    assert "caption_generate" in sql
    assert "captions_source_file_unique" in sql
    assert "start_time" in sql


def test_captions_rls() -> None:
    sql = RLS.read_text(encoding="utf-8")
    assert "enable row level security" in sql
    assert "auth.uid() = user_id" in sql
    assert "Users can view own captions" in sql
    assert "Users can update own caption cues" in sql
