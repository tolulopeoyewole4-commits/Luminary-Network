#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${API_URL:-http://localhost:8000}}"
BASE_URL="${BASE_URL%/}"

echo "Checking ${BASE_URL}/health …"
response="$(curl -fsS "${BASE_URL}/health")"
echo "$response"

python3 - <<'PY' "$response"
import json, sys
payload = json.loads(sys.argv[1])
assert payload.get("status") == "ok", payload
assert payload.get("service") == "luminary-ai-api", payload
missing = [k for k in ("ffmpeg", "ffprobe") if payload.get(k) is not True]
if missing:
    raise SystemExit(f"Health check missing tools: {', '.join(missing)}")
print("Health check passed.")
PY
