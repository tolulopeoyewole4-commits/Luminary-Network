from unittest.mock import MagicMock, patch

import pytest

from app.workers.handlers import (
    WorkerJobError,
    handle_document_extract,
    handle_video_generate,
    process_job,
)


def test_process_job_unknown_type_fails() -> None:
    client = MagicMock()
    with (
        patch("app.workers.handlers.fail_job", return_value=True) as fail,
        pytest.raises(WorkerJobError, match="Unsupported"),
    ):
        process_job(client, {"id": "j1", "job_type": "nope"})
    fail.assert_called_once_with(client, "j1", 'Unsupported worker job type "nope".')


def test_handle_document_extract_writes_sections() -> None:
    client = MagicMock()
    source_row = {
        "id": "sf1",
        "internal_storage_path": "u/p/file.pdf",
        "file_type": "pdf",
        "original_filename": "file.pdf",
    }
    source_resp = MagicMock()
    source_resp.data = [source_row]
    complete_resp = MagicMock()
    complete_resp.data = {"id": "j1"}

    table = client.table.return_value
    table.select.return_value.eq.return_value.limit.return_value.execute.return_value = (
        source_resp
    )
    table.delete.return_value.eq.return_value.execute.return_value = MagicMock()
    table.insert.return_value.execute.return_value = MagicMock()
    table.update.return_value.eq.return_value.execute.return_value = MagicMock()
    # complete_job path: update(...).eq(...).in_(...).select(...).maybe_single().execute()
    table.update.return_value.eq.return_value.in_.return_value.select.return_value.maybe_single.return_value.execute.return_value = (
        complete_resp
    )

    job = {
        "id": "j1",
        "user_id": "u1",
        "source_file_id": "sf1",
        "job_type": "document_extract",
    }

    with (
        patch(
            "app.workers.handlers.download_source_bytes",
            return_value=b"%PDF-1.4",
        ),
        patch(
            "app.workers.handlers.extract_document",
            return_value={
                "sections": [
                    {
                        "section_title": "Intro",
                        "section_number": 1,
                        "page_start": 1,
                        "page_end": 1,
                        "extracted_text": "Hello",
                        "token_count": 1,
                    }
                ],
                "page_count": 1,
            },
        ),
        patch("app.workers.handlers.job_still_active", return_value=True),
        patch("app.workers.handlers.bump_progress"),
        patch("app.workers.handlers.complete_job", return_value=True) as complete,
    ):
        handle_document_extract(client, job)
        complete.assert_called_once_with(client, "j1")
        table.insert.assert_called_once()


def test_handle_video_generate_uploads_and_completes() -> None:
    client = MagicMock()
    generated_row = {
        "id": "gv1",
        "processing_job_id": "j1",
        "title": "Neon City",
        "mode": "TEXT_TO_VIDEO",
        "source_text": "A neon city wakes at midnight.",
        "storyboard": [
            {"caption": "A neon city wakes at midnight.", "duration_seconds": 2.5},
        ],
        "internal_storage_path": "u1/p1/generated/abc.mp4",
    }
    generated_resp = MagicMock()
    generated_resp.data = [generated_row]

    table = client.table.return_value
    table.select.return_value.eq.return_value.limit.return_value.execute.return_value = (
        generated_resp
    )
    table.update.return_value.eq.return_value.execute.return_value = MagicMock()

    job = {
        "id": "j1",
        "user_id": "u1",
        "project_id": "p1",
        "job_type": "video_generate",
    }

    with (
        patch(
            "app.workers.handlers.render_storyboard_video",
            return_value=b"\x00\x00\x00\x18ftypmp42fakevideo",
        ) as render,
        patch("app.workers.handlers.upload_bytes") as upload,
        patch("app.workers.handlers.job_still_active", return_value=True),
        patch("app.workers.handlers.bump_progress"),
        patch("app.workers.handlers.complete_job", return_value=True) as complete,
    ):
        handle_video_generate(client, job)
        render.assert_called_once()
        upload.assert_called_once()
        complete.assert_called_once_with(client, "j1")
