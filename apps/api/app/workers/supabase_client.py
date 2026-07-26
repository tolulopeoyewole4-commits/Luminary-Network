from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


@lru_cache(maxsize=1)
def get_service_supabase() -> Client:
    if not settings.worker_configured():
        raise RuntimeError(
            "Worker requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        )
    return create_client(
        settings.supabase_url.strip(),
        settings.supabase_service_role_key.strip(),
    )
