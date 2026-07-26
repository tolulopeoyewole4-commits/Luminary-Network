from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "database" / "migrations" / "0008_transcripts.sql"
RLS = ROOT / "database" / "policies" / "0008_transcripts_rls.sql"


def test_transcripts_migration() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "create table if not exists public.transcripts" in sql
    assert "create table if not exists public.transcript_segments" in sql
    assert "transcripts_source_file_unique" in sql
    assert "start_time" in sql
    assert "end_time" in sql
    assert "video_transcribe" in sql


def test_transcripts_rls() -> None:
    sql = RLS.read_text(encoding="utf-8")
    assert "enable row level security" in sql
    assert "auth.uid() = user_id" in sql
    assert "Users can view own transcripts" in sql
    assert "Users can update own transcript segments" in sql
