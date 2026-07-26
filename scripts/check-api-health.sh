#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${API_URL:-http://localhost:8000}}"
BASE_URL="${BASE_URL%/}"
STRICT="${STRICT_HEALTH:-1}"

echo "Checking ${BASE_URL}/health …"
response="$(curl -fsS "${BASE_URL}/health")"
echo "$response"

STRICT="$STRICT" python3 - <<'PY' "$response"
import json, os, sys
payload = json.loads(sys.argv[1])
strict = os.environ.get("STRICT", "1") != "0"
assert payload.get("status") == "ok", payload
assert payload.get("service") == "luminary-ai-api", payload

missing = [k for k in ("ffmpeg", "ffprobe") if k not in payload]
falsey = [k for k in ("ffmpeg", "ffprobe") if payload.get(k) is False]

if falsey:
    raise SystemExit(f"Health check reported tools unavailable: {', '.join(falsey)}")

if missing:
    message = f"Health payload missing tool fields: {', '.join(missing)} (is the API image outdated?)"
    if strict:
        raise SystemExit(message)
    print(f"WARN: {message}")
else:
    print("Health check passed (ffmpeg/ffprobe present).")
PY
