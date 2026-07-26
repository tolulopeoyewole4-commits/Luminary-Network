"""Allow ``python -m app.workers``."""

from app.workers.run import main

raise SystemExit(main())
