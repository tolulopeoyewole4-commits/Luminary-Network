#!/usr/bin/env bash
# Local release smoke: unit gates + optional API health if reachable.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Running CI gate (typecheck, lint, tests, build)"
pnpm gate

echo "==> Bundling SQL"
pnpm sql:bundle

echo "==> Verifying SQL bundle mentions latest reel-export migration"
grep -q "0015_reel_export_presets.sql" database/dist/supabase_schema.sql
grep -q "clip_aspect_ratio" database/dist/supabase_schema.sql
grep -q "burn_captions" database/dist/supabase_schema.sql
grep -q "claim_processing_job" database/dist/supabase_schema.sql
grep -q "cancelled" database/dist/supabase_schema.sql

API_URL="${API_URL:-http://localhost:8000}"
if curl -fsS "${API_URL%/}/health" >/dev/null 2>&1; then
  echo "==> API reachable — running health smoke"
  # Soft mode: warn if an older /health payload lacks ffmpeg fields.
  STRICT_HEALTH=0 bash scripts/check-api-health.sh "$API_URL"
else
  echo "==> API not reachable at $API_URL (skipping health smoke)"
fi

echo "Local smoke completed."
