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


settings = Settings()
