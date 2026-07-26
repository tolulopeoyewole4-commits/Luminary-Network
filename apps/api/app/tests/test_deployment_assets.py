from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]


def test_deployment_docs_and_sql_order_exist() -> None:
    assert (ROOT / "docs" / "deployment.md").is_file()
    assert (ROOT / "database" / "APPLY_ORDER.md").is_file()
    assert (ROOT / ".github" / "workflows" / "ci.yml").is_file()
    assert (ROOT / "infrastructure" / "fly.toml").is_file()
    assert (ROOT / "infrastructure" / "render.yaml").is_file()


def test_sql_apply_order_covers_latest_migrations() -> None:
    text = (ROOT / "database" / "APPLY_ORDER.md").read_text(encoding="utf-8")
    assert "0011_captions.sql" in text
    assert "0011_captions_rls.sql" in text
    assert "0012_ai_generation_jobs.sql" in text
    assert "0013_cancel_processing_jobs.sql" in text
    assert "0003_source_files_storage.sql" in text
