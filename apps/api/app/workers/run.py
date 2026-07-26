"""CLI entrypoint: ``python -m app.workers.run``."""

from __future__ import annotations

import argparse
import logging
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Luminary dedicated job worker")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Claim and process at most one job, then exit.",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging level (default: INFO).",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )

    from app.workers.loop import run_forever

    try:
        run_forever(once=args.once)
    except KeyboardInterrupt:
        logging.getLogger("luminary.worker").info("Worker interrupted; shutting down.")
        return 0
    except Exception as exc:  # noqa: BLE001
        logging.getLogger("luminary.worker").error("%s", exc)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
