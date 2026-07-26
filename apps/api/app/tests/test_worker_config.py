from app.core.config import Settings


def test_worker_configured_requires_url_and_key() -> None:
    assert Settings(supabase_url="", supabase_service_role_key="").worker_configured() is False
    assert (
        Settings(
            supabase_url="https://example.supabase.co",
            supabase_service_role_key="",
        ).worker_configured()
        is False
    )
    assert (
        Settings(
            supabase_url="https://example.supabase.co",
            supabase_service_role_key="secret",
        ).worker_configured()
        is True
    )


def test_worker_job_type_list_parses_csv() -> None:
    settings = Settings(worker_job_types="document_extract, video_export ,")
    assert settings.worker_job_type_list() == ["document_extract", "video_export"]
