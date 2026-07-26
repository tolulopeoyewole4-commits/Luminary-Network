from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Luminary AI API"
    # Shared secret between Next.js server actions and FastAPI.
    # Never expose this to the browser.
    internal_api_token: str = "dev-internal-token"
    max_extract_upload_mb: int = 55
    # Comma-separated browser origins allowed for CORS (production web URL).
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Dedicated job worker (service-role Supabase access; never expose to browser).
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    source_storage_bucket: str = "source-files"
    worker_poll_seconds: float = 2.0
    worker_job_types: str = (
        "document_extract,video_metadata,video_export,"
        "video_transcribe,clip_detect,caption_generate,"
        "course_generate,social_generate"
    )

    def cors_origins(self) -> list[str]:
        defaults = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
        extras = [
            origin.strip()
            for origin in self.allowed_origins.split(",")
            if origin.strip()
        ]
        # Preserve order while de-duplicating.
        return list(dict.fromkeys([*defaults, *extras]))

    def worker_configured(self) -> bool:
        return bool(self.supabase_url.strip() and self.supabase_service_role_key.strip())

    def worker_job_type_list(self) -> list[str]:
        return [
            item.strip()
            for item in self.worker_job_types.split(",")
            if item.strip()
        ]


settings = Settings()
