"""Poll/claim/execute loop for dedicated job workers."""

from __future__ import annotations

import logging
import time

from app.core.config import settings
from app.workers.handlers import WorkerJobError, process_job
from app.workers.jobs import claim_next_job
from app.workers.supabase_client import get_service_supabase

logger = logging.getLogger("luminary.worker")


def run_forever(*, once: bool = False) -> None:
    if not settings.worker_configured():
        raise RuntimeError(
            "Worker requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        )

    job_types = settings.worker_job_type_list()
    poll_seconds = max(0.5, float(settings.worker_poll_seconds))
    client = get_service_supabase()
    logger.info(
        "Luminary worker started (types=%s, poll=%ss)",
        ",".join(job_types) or "(none)",
        poll_seconds,
    )

    while True:
        job = claim_next_job(client)
        if job is None:
            if once:
                logger.info("No queued jobs; exiting (--once).")
                return
            time.sleep(poll_seconds)
            continue

        job_id = job.get("id")
        job_type = job.get("job_type")
        logger.info("claimed job %s type=%s", job_id, job_type)
        try:
            process_job(client, job)
            logger.info("job %s (%s) finished", job_id, job_type)
        except WorkerJobError as exc:
            logger.warning("job %s (%s) failed: %s", job_id, job_type, exc.message)
        except Exception:  # noqa: BLE001 - keep worker alive
            logger.exception("job %s (%s) crashed", job_id, job_type)

        if once:
            return
