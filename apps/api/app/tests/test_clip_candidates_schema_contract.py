from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "database" / "migrations" / "0009_clip_candidates.sql"
RLS = ROOT / "database" / "policies" / "0009_clip_candidates_rls.sql"


def test_clip_candidates_migration() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "create table if not exists public.clip_candidates" in sql
    assert "clip_candidate_status" in sql
    assert "start_time" in sql
    assert "end_time" in sql
    assert "clip_detect" in sql


def test_clip_candidates_rls() -> None:
    sql = RLS.read_text(encoding="utf-8")
    assert "enable row level security" in sql
    assert "auth.uid() = user_id" in sql
    assert "Users can view own clip candidates" in sql
    assert "Users can update own clip candidates" in sql
