from __future__ import annotations

from typing import Any

from supabase import Client

from app.core.config import settings


def claim_next_job(client: Client) -> dict[str, Any] | None:
    response = client.rpc(
        "claim_processing_job",
        {"p_job_types": settings.worker_job_type_list()},
    ).execute()
    data = response.data
    if not data:
        return None
    if isinstance(data, list):
        return data[0] if data else None
    if isinstance(data, dict):
        return data
    return None


def job_still_active(client: Client, job_id: str) -> bool:
    response = (
        client.table("processing_jobs")
        .select("status")
        .eq("id", job_id)
        .maybe_single()
        .execute()
    )
    status = (response.data or {}).get("status")
    return status in {"queued", "processing"}


def bump_progress(client: Client, job_id: str, progress: int) -> None:
    client.table("processing_jobs").update(
        {"progress_percentage": progress},
    ).eq("id", job_id).in_("status", ["queued", "processing"]).execute()


def complete_job(
    client: Client,
    job_id: str,
    *,
    payload: dict[str, Any] | None = None,
) -> bool:
    update: dict[str, Any] = {
        "status": "completed",
        "progress_percentage": 100,
        "completed_at": "now()",
        "error_message": None,
    }
    # Use ISO timestamp via RPC-less approach: let PostgREST set with now()
    # through a raw value — supabase-py expects ISO strings.
    from datetime import datetime, timezone

    update["completed_at"] = datetime.now(timezone.utc).isoformat()
    if payload is not None:
        update["payload"] = payload

    response = (
        client.table("processing_jobs")
        .update(update)
        .eq("id", job_id)
        .in_("status", ["queued", "processing"])
        .select("id")
        .maybe_single()
        .execute()
    )
    return bool(response.data)


def fail_job(client: Client, job_id: str, message: str) -> bool:
    from datetime import datetime, timezone

    response = (
        client.table("processing_jobs")
        .update(
            {
                "status": "failed",
                "progress_percentage": 100,
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "error_message": message[:500],
            },
        )
        .eq("id", job_id)
        .in_("status", ["queued", "processing"])
        .select("id")
        .maybe_single()
        .execute()
    )
    return bool(response.data)


def download_source_bytes(client: Client, storage_path: str) -> bytes:
    return client.storage.from_(settings.source_storage_bucket).download(
        storage_path,
    )


def upload_bytes(
    client: Client,
    storage_path: str,
    data: bytes,
    *,
    content_type: str,
) -> None:
    client.storage.from_(settings.source_storage_bucket).upload(
        storage_path,
        data,
        file_options={"content-type": content_type, "upsert": "false"},
    )
