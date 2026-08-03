from __future__ import annotations

from typing import Any

from supabase import Client

from app.services.documents.extract import DocumentExtractionError, extract_document
from app.services.video.export import VideoExportError, export_video_clip
from app.services.video.generate import (
    VideoGenerationError,
    build_storyboard,
    normalize_scenes,
    render_storyboard_video,
)
from app.services.video.metadata import VideoMetadataError, extract_video_metadata
from app.workers.jobs import (
    _first_row,
    bump_progress,
    complete_job,
    download_source_bytes,
    fail_job,
    job_still_active,
    upload_bytes,
)


class WorkerJobError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def _require_source_file(client: Client, source_file_id: str | None) -> dict[str, Any]:
    if not source_file_id:
        raise WorkerJobError("Job has no linked source file.")
    response = (
        client.table("source_files")
        .select("*")
        .eq("id", source_file_id)
        .limit(1)
        .execute()
    )
    row = _first_row(response.data)
    if not row:
        raise WorkerJobError("Source file not found.")
    return row


def handle_document_extract(client: Client, job: dict[str, Any]) -> None:
    job_id = job["id"]
    source = _require_source_file(client, job.get("source_file_id"))
    bump_progress(client, job_id, 20)

    file_bytes = download_source_bytes(client, source["internal_storage_path"])
    bump_progress(client, job_id, 40)

    try:
        result = extract_document(
            file_bytes=file_bytes,
            file_type=source["file_type"],
            original_filename=source["original_filename"],
        )
    except DocumentExtractionError as exc:
        raise WorkerJobError(exc.message) from exc

    if not job_still_active(client, job_id):
        raise WorkerJobError("This job was cancelled.")

    bump_progress(client, job_id, 70)
    client.table("document_sections").delete().eq(
        "source_file_id",
        source["id"],
    ).execute()

    if result.get("sections"):
        rows = [
            {
                "source_file_id": source["id"],
                "user_id": job["user_id"],
                "section_title": section["section_title"],
                "section_number": section["section_number"],
                "page_start": section.get("page_start"),
                "page_end": section.get("page_end"),
                "extracted_text": section["extracted_text"],
                "token_count": section.get("token_count", 0),
            }
            for section in result["sections"]
        ]
        client.table("document_sections").insert(rows).execute()

    if not complete_job(client, job_id):
        raise WorkerJobError("This job was cancelled.")

    client.table("source_files").update(
        {
            "processing_status": "ready",
            "page_count": result.get("page_count"),
            "error_message": None,
        },
    ).eq("id", source["id"]).execute()


def handle_video_metadata(client: Client, job: dict[str, Any]) -> None:
    job_id = job["id"]
    source = _require_source_file(client, job.get("source_file_id"))
    bump_progress(client, job_id, 20)

    file_bytes = download_source_bytes(client, source["internal_storage_path"])
    bump_progress(client, job_id, 45)

    try:
        result = extract_video_metadata(
            file_bytes=file_bytes,
            filename=source["original_filename"],
        )
    except VideoMetadataError as exc:
        raise WorkerJobError(exc.message) from exc

    if not job_still_active(client, job_id):
        raise WorkerJobError("This job was cancelled.")

    bump_progress(client, job_id, 80)
    client.table("source_files").update(
        {
            "processing_status": "ready",
            "video_duration_seconds": result["duration_seconds"],
            "media_metadata": {
                "width": result.get("width"),
                "height": result.get("height"),
                "video_codec": result.get("video_codec"),
                "audio_codec": result.get("audio_codec"),
                "format_name": result.get("format_name"),
            },
            "error_message": None,
        },
    ).eq("id", source["id"]).execute()

    if not complete_job(client, job_id):
        raise WorkerJobError("This job was cancelled.")


def handle_video_export(client: Client, job: dict[str, Any]) -> None:
    job_id = job["id"]
    source = _require_source_file(client, job.get("source_file_id"))

    export_response = (
        client.table("exported_clips")
        .select("*")
        .eq("processing_job_id", job_id)
        .limit(1)
        .execute()
    )
    exported = _first_row(export_response.data)
    if not exported:
        raise WorkerJobError("Unable to find exported clip linked to this job.")

    bump_progress(client, job_id, 20)
    file_bytes = download_source_bytes(client, source["internal_storage_path"])
    bump_progress(client, job_id, 40)

    start_time = float(exported["start_time"])
    end_time = float(exported["end_time"])

    try:
        clip_bytes = export_video_clip(
            file_bytes,
            start_time=start_time,
            end_time=end_time,
            filename=source["original_filename"],
        )
    except VideoExportError as exc:
        raise WorkerJobError(exc.message) from exc

    if not job_still_active(client, job_id):
        raise WorkerJobError("This job was cancelled.")

    bump_progress(client, job_id, 75)
    storage_path = exported["internal_storage_path"]
    upload_bytes(
        client,
        storage_path,
        clip_bytes,
        content_type="video/mp4",
    )

    client.table("exported_clips").update(
        {
            "status": "ready",
            "file_size": len(clip_bytes),
            "mime_type": "video/mp4",
            "error_message": None,
        },
    ).eq("id", exported["id"]).execute()

    if not complete_job(client, job_id):
        client.table("exported_clips").update(
            {
                "status": "failed",
                "error_message": "Export cancelled by user.",
            },
        ).eq("id", exported["id"]).execute()
        raise WorkerJobError("This job was cancelled.")

    if exported.get("clip_candidate_id"):
        client.table("clip_candidates").update({"status": "exported"}).eq(
            "id",
            exported["clip_candidate_id"],
        ).execute()


def handle_video_generate(client: Client, job: dict[str, Any]) -> None:
    job_id = job["id"]

    generated_response = (
        client.table("generated_videos")
        .select("*")
        .eq("processing_job_id", job_id)
        .limit(1)
        .execute()
    )
    generated = _first_row(generated_response.data)
    if not generated:
        raise WorkerJobError("Unable to find generated video linked to this job.")

    bump_progress(client, job_id, 20)

    try:
        storyboard = generated.get("storyboard") or []
        if storyboard:
            scenes = normalize_scenes(storyboard)
        else:
            scenes = build_storyboard(
                generated.get("source_text", ""),
                generated.get("mode", "TEXT_TO_VIDEO"),
            )
        bump_progress(client, job_id, 45)
        video_bytes = render_storyboard_video(scenes, title=generated.get("title", ""))
    except VideoGenerationError as exc:
        raise WorkerJobError(exc.message) from exc

    if not job_still_active(client, job_id):
        raise WorkerJobError("This job was cancelled.")

    bump_progress(client, job_id, 75)
    storage_path = generated["internal_storage_path"]
    upload_bytes(client, storage_path, video_bytes, content_type="video/mp4")

    duration_seconds = round(sum(scene.duration_seconds for scene in scenes), 3)
    client.table("generated_videos").update(
        {
            "status": "ready",
            "file_size": len(video_bytes),
            "mime_type": "video/mp4",
            "duration_seconds": duration_seconds,
            "error_message": None,
        },
    ).eq("id", generated["id"]).execute()

    if not complete_job(client, job_id):
        client.table("generated_videos").update(
            {
                "status": "failed",
                "error_message": "Generation cancelled by user.",
            },
        ).eq("id", generated["id"]).execute()
        raise WorkerJobError("This job was cancelled.")


HANDLERS = {
    "document_extract": handle_document_extract,
    "video_metadata": handle_video_metadata,
    "video_export": handle_video_export,
    "video_generate": handle_video_generate,
}


def process_job(client: Client, job: dict[str, Any]) -> None:
    job_type = job.get("job_type")
    handler = HANDLERS.get(job_type)
    if handler is None:
        message = f'Unsupported worker job type "{job_type}".'
        fail_job(client, job["id"], message)
        raise WorkerJobError(message)

    try:
        handler(client, job)
    except WorkerJobError as exc:
        failed = fail_job(client, job["id"], exc.message)
        if failed and job_type in {"document_extract", "video_metadata"}:
            source_file_id = job.get("source_file_id")
            if source_file_id:
                client.table("source_files").update(
                    {
                        "processing_status": "failed",
                        "error_message": exc.message[:500],
                    },
                ).eq("id", source_file_id).execute()
        if failed and job_type == "video_export":
            client.table("exported_clips").update(
                {
                    "status": "failed",
                    "error_message": exc.message[:500],
                },
            ).eq("processing_job_id", job["id"]).eq(
                "status",
                "processing",
            ).execute()
        if failed and job_type == "video_generate":
            client.table("generated_videos").update(
                {
                    "status": "failed",
                    "error_message": exc.message[:500],
                },
            ).eq("processing_job_id", job["id"]).eq(
                "status",
                "processing",
            ).execute()
        raise
    except Exception as exc:  # noqa: BLE001 - worker boundary
        message = str(exc) or "Worker job failed."
        failed = fail_job(client, job["id"], message)
        if failed and job.get("job_type") in {
            "document_extract",
            "video_metadata",
        }:
            source_file_id = job.get("source_file_id")
            if source_file_id:
                client.table("source_files").update(
                    {
                        "processing_status": "failed",
                        "error_message": message[:500],
                    },
                ).eq("id", source_file_id).execute()
        raise
