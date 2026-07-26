from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Luminary AI API"
    # Shared secret between Next.js server actions and FastAPI.
    # Never expose this to the browser.
    internal_api_token: str = "dev-internal-token"
    max_extract_upload_mb: int = 55


settings = Settings()
