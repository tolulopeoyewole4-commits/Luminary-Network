"""Worker handlers for mock video + mock AI generation jobs."""

from __future__ import annotations

from typing import Any

from supabase import Client

from app.services.ai.mock import generate_course_outline, generate_social_content
from app.services.mocks.captions import build_caption_cues_from_segments
from app.services.mocks.clips import build_mock_clip_candidates
from app.services.mocks.transcript import build_mock_transcript_segments
from app.workers.jobs import (
    WorkerJobError,
    bump_progress,
    complete_job,
    job_still_active,
    require_source_file,
)


def _payload(job: dict[str, Any]) -> dict[str, Any]:
    raw = job.get("payload") or {}
    if not isinstance(raw, dict):
        raise WorkerJobError("Job payload is missing or invalid.")
    return raw


def _duration(source: dict[str, Any]) -> float:
    value = source.get("video_duration_seconds")
    try:
        return float(value) if value is not None else 60.0
    except (TypeError, ValueError):
        return 60.0


def handle_video_transcribe(client: Client, job: dict[str, Any]) -> None:
    job_id = job["id"]
    source = require_source_file(client, job.get("source_file_id"))
    bump_progress(client, job_id, 20)

    segments = build_mock_transcript_segments(
        duration_seconds=_duration(source),
        title=source.get("original_filename"),
    )
    full_text = " ".join(segment["text"] for segment in segments)
    bump_progress(client, job_id, 40)
    if not job_still_active(client, job_id):
        raise WorkerJobError("This job was cancelled.")

    existing = (
        client.table("transcripts")
        .select("id")
        .eq("source_file_id", source["id"])
        .maybe_single()
        .execute()
    )
    transcript_id = (existing.data or {}).get("id")

    if transcript_id:
        client.table("transcript_segments").delete().eq(
            "transcript_id",
            transcript_id,
        ).execute()
        client.table("transcripts").update(
            {
                "language": "en",
                "full_text": full_text,
                "status": "ready",
                "error_message": None,
            },
        ).eq("id", transcript_id).execute()
    else:
        created = (
            client.table("transcripts")
            .insert(
                {
                    "user_id": job["user_id"],
                    "project_id": job["project_id"],
                    "source_file_id": source["id"],
                    "language": "en",
                    "full_text": full_text,
                    "status": "ready",
                },
            )
            .select("id")
            .single()
            .execute()
        )
        if not created.data:
            raise WorkerJobError("Unable to create transcript.")
        transcript_id = created.data["id"]

    bump_progress(client, job_id, 70)
    rows = [
        {
            "transcript_id": transcript_id,
            "user_id": job["user_id"],
            "start_time": segment["start_time"],
            "end_time": segment["end_time"],
            "speaker": segment["speaker"],
            "text": segment["text"],
            "confidence": segment["confidence"],
        }
        for segment in segments
    ]
    client.table("transcript_segments").insert(rows).execute()
    if not complete_job(client, job_id):
        raise WorkerJobError("This job was cancelled.")


def handle_clip_detect(client: Client, job: dict[str, Any]) -> None:
    job_id = job["id"]
    source = require_source_file(client, job.get("source_file_id"))
    bump_progress(client, job_id, 20)

    transcript_resp = (
        client.table("transcripts")
        .select("id")
        .eq("source_file_id", source["id"])
        .maybe_single()
        .execute()
    )
    transcript_id = (transcript_resp.data or {}).get("id")
    segment_rows: list[dict[str, Any]] = []
    if transcript_id:
        segments_resp = (
            client.table("transcript_segments")
            .select("start_time, end_time, text, speaker")
            .eq("transcript_id", transcript_id)
            .order("start_time")
            .execute()
        )
        segment_rows = [
            {
                "start_time": float(row["start_time"]),
                "end_time": float(row["end_time"]),
                "text": row["text"],
                "speaker": row.get("speaker"),
            }
            for row in (segments_resp.data or [])
        ]

    bump_progress(client, job_id, 40)
    mocks = build_mock_clip_candidates(
        duration_seconds=_duration(source),
        title=source.get("original_filename"),
        segments=segment_rows or None,
    )
    if not job_still_active(client, job_id):
        raise WorkerJobError("This job was cancelled.")

    client.table("clip_candidates").delete().eq(
        "source_file_id",
        source["id"],
    ).in_("status", ["suggested", "rejected"]).execute()

    bump_progress(client, job_id, 70)
    rows = [
        {
            "user_id": job["user_id"],
            "project_id": job["project_id"],
            "source_file_id": source["id"],
            "transcript_id": transcript_id,
            "title": clip["title"],
            "reason": clip["reason"],
            "start_time": clip["start_time"],
            "end_time": clip["end_time"],
            "score": clip["score"],
            "status": "suggested",
            "rank": clip["rank"],
        }
        for clip in mocks
    ]
    if rows:
        client.table("clip_candidates").insert(rows).execute()
    if not complete_job(client, job_id):
        raise WorkerJobError("This job was cancelled.")


def handle_caption_generate(client: Client, job: dict[str, Any]) -> None:
    job_id = job["id"]
    source = require_source_file(client, job.get("source_file_id"))
    bump_progress(client, job_id, 20)

    transcript_resp = (
        client.table("transcripts")
        .select("id, language")
        .eq("source_file_id", source["id"])
        .maybe_single()
        .execute()
    )
    transcript = transcript_resp.data
    segments: list[dict[str, Any]]
    if transcript:
        segments_resp = (
            client.table("transcript_segments")
            .select("start_time, end_time, text")
            .eq("transcript_id", transcript["id"])
            .order("start_time")
            .execute()
        )
        segments = [
            {
                "start_time": float(row["start_time"]),
                "end_time": float(row["end_time"]),
                "text": row["text"],
            }
            for row in (segments_resp.data or [])
        ]
    else:
        segments = [
            {
                "start_time": row["start_time"],
                "end_time": row["end_time"],
                "text": row["text"],
            }
            for row in build_mock_transcript_segments(
                duration_seconds=_duration(source),
                title=source.get("original_filename"),
            )
        ]

    bump_progress(client, job_id, 40)
    if not job_still_active(client, job_id):
        raise WorkerJobError("This job was cancelled.")

    cues = build_caption_cues_from_segments(segments)
    if not cues:
        raise WorkerJobError("No caption cues could be generated.")

    existing = (
        client.table("captions")
        .select("id")
        .eq("source_file_id", source["id"])
        .maybe_single()
        .execute()
    )
    caption_id = (existing.data or {}).get("id")
    language = (transcript or {}).get("language") or "en"
    transcript_id = (transcript or {}).get("id")

    if caption_id:
        client.table("caption_cues").delete().eq("caption_id", caption_id).execute()
        client.table("captions").update(
            {
                "language": language,
                "transcript_id": transcript_id,
                "status": "ready",
                "error_message": None,
            },
        ).eq("id", caption_id).execute()
    else:
        created = (
            client.table("captions")
            .insert(
                {
                    "user_id": job["user_id"],
                    "project_id": job["project_id"],
                    "source_file_id": source["id"],
                    "transcript_id": transcript_id,
                    "language": language,
                    "status": "ready",
                },
            )
            .select("id")
            .single()
            .execute()
        )
        if not created.data:
            raise WorkerJobError("Unable to create captions.")
        caption_id = created.data["id"]

    bump_progress(client, job_id, 70)
    rows = [
        {
            "caption_id": caption_id,
            "user_id": job["user_id"],
            "start_time": cue["start_time"],
            "end_time": cue["end_time"],
            "text": cue["text"],
        }
        for cue in cues
    ]
    client.table("caption_cues").insert(rows).execute()
    if not complete_job(client, job_id):
        raise WorkerJobError("This job was cancelled.")


def handle_course_generate(client: Client, job: dict[str, Any]) -> None:
    job_id = job["id"]
    payload = _payload(job)
    source_file_id = payload.get("sourceFileId") or job.get("source_file_id")
    section_ids = payload.get("sectionIds") or []
    if not source_file_id or not section_ids:
        raise WorkerJobError("Course job is missing source sections.")

    bump_progress(client, job_id, 15)
    sections_resp = (
        client.table("document_sections")
        .select("*")
        .eq("source_file_id", source_file_id)
        .in_("id", section_ids)
        .order("section_number")
        .execute()
    )
    sections = sections_resp.data or []
    if not sections:
        raise WorkerJobError("Unable to load the selected source sections.")

    bump_progress(client, job_id, 40)
    if not job_still_active(client, job_id):
        raise WorkerJobError("This job was cancelled.")

    outline = generate_course_outline(
        target_audience=str(payload.get("targetAudience") or "").strip(),
        course_objective=str(payload.get("courseObjective") or "").strip(),
        duration_label=str(payload.get("durationLabel") or "").strip(),
        module_count=int(payload.get("moduleCount") or 3),
        difficulty_level=str(payload.get("difficultyLevel") or "beginner"),
        sections=sections,
    )

    bump_progress(client, job_id, 70)
    if not job_still_active(client, job_id):
        raise WorkerJobError("This job was cancelled.")

    course = (
        client.table("courses")
        .insert(
            {
                "user_id": job["user_id"],
                "project_id": job["project_id"],
                "source_file_id": source_file_id,
                "title": outline["title"],
                "description": outline["description"],
                "target_audience": outline["targetAudience"],
                "course_objective": str(payload.get("courseObjective") or "").strip(),
                "duration_label": str(payload.get("durationLabel") or "").strip(),
                "difficulty_level": str(payload.get("difficultyLevel") or "beginner"),
                "learning_outcomes": outline["learningOutcomes"],
                "quiz_suggestions": outline["quizSuggestions"],
                "source_references": outline["sourceReferences"],
                "status": "draft",
            },
        )
        .select("id")
        .single()
        .execute()
    )
    if not course.data:
        raise WorkerJobError("Unable to save the generated course.")
    course_id = course.data["id"]

    for module_index, module_outline in enumerate(outline["modules"]):
        module_row = (
            client.table("course_modules")
            .insert(
                {
                    "user_id": job["user_id"],
                    "course_id": course_id,
                    "title": module_outline["title"],
                    "description": module_outline["description"],
                    "position": module_index + 1,
                    "source_references": module_outline["sourceReferences"],
                },
            )
            .select("id")
            .single()
            .execute()
        )
        if not module_row.data:
            raise WorkerJobError("Failed to save a course module.")
        lesson_rows = [
            {
                "user_id": job["user_id"],
                "module_id": module_row.data["id"],
                "title": lesson["title"],
                "learning_objectives": lesson["learningObjectives"],
                "lesson_content": lesson["summary"],
                "position": lesson_index + 1,
                "source_references": lesson["sourceReferences"],
            }
            for lesson_index, lesson in enumerate(module_outline["lessons"])
        ]
        client.table("course_lessons").insert(lesson_rows).execute()

    completed_payload = {**payload, "resultCourseId": course_id}
    if not complete_job(client, job_id, payload=completed_payload):
        raise WorkerJobError("This job was cancelled.")


def handle_social_generate(client: Client, job: dict[str, Any]) -> None:
    job_id = job["id"]
    payload = _payload(job)
    source_file_id = payload.get("sourceFileId") or job.get("source_file_id")
    section_ids = payload.get("sectionIds") or []
    if not source_file_id or not section_ids:
        raise WorkerJobError("Social job is missing source sections.")

    bump_progress(client, job_id, 15)
    sections_resp = (
        client.table("document_sections")
        .select("*")
        .eq("source_file_id", source_file_id)
        .in_("id", section_ids)
        .order("section_number")
        .execute()
    )
    sections = sections_resp.data or []
    if not sections:
        raise WorkerJobError("Unable to load the selected source sections.")

    bump_progress(client, job_id, 40)
    if not job_still_active(client, job_id):
        raise WorkerJobError("This job was cancelled.")

    outputs = generate_social_content(
        platform=str(payload.get("platform") or "linkedin"),
        tone=str(payload.get("tone") or "professional"),
        length=str(payload.get("length") or "medium"),
        target_audience=str(payload.get("targetAudience") or "").strip(),
        call_to_action=str(payload.get("callToAction") or "").strip(),
        output_count=int(payload.get("outputCount") or 1),
        sections=sections,
    )

    bump_progress(client, job_id, 70)
    if not job_still_active(client, job_id):
        raise WorkerJobError("This job was cancelled.")

    rows = [
        {
            "user_id": job["user_id"],
            "project_id": job["project_id"],
            "source_file_id": source_file_id,
            "content_type": output["contentType"],
            "title": output["title"],
            "body": output["body"],
            "tone": str(payload.get("tone") or "professional"),
            "length_label": str(payload.get("length") or "medium"),
            "target_audience": str(payload.get("targetAudience") or "").strip(),
            "call_to_action": str(payload.get("callToAction") or "").strip(),
            "platform": output["platform"],
            "generation_status": "draft",
            "source_references": output["sourceReferences"],
        }
        for output in outputs
    ]
    created = client.table("generated_content").insert(rows).select("id").execute()
    created_ids = [row["id"] for row in (created.data or [])]
    if not created_ids:
        raise WorkerJobError("Unable to save generated content.")

    completed_payload = {**payload, "resultContentIds": created_ids}
    if not complete_job(client, job_id, payload=completed_payload):
        raise WorkerJobError("This job was cancelled.")
