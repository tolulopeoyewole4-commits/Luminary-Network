from unittest.mock import MagicMock

from app.workers.jobs import claim_next_job

NULL_ROW = {
    "id": None,
    "user_id": None,
    "project_id": None,
    "job_type": None,
    "status": None,
}

REAL_ROW = {"id": "job-1", "job_type": "video_generate", "status": "processing"}


def _client_returning(data):
    client = MagicMock()
    resp = MagicMock()
    resp.data = data
    client.rpc.return_value.execute.return_value = resp
    return client


def test_claim_next_job_none_when_empty() -> None:
    assert claim_next_job(_client_returning(None)) is None
    assert claim_next_job(_client_returning([])) is None


def test_claim_next_job_ignores_all_null_row() -> None:
    # Newer PostgREST returns an all-null row instead of nothing.
    assert claim_next_job(_client_returning(NULL_ROW)) is None
    assert claim_next_job(_client_returning([NULL_ROW])) is None


def test_claim_next_job_returns_real_row() -> None:
    assert claim_next_job(_client_returning(REAL_ROW)) == REAL_ROW
    assert claim_next_job(_client_returning([REAL_ROW])) == REAL_ROW
