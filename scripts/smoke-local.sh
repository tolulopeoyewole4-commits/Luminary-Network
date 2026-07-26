#!/usr/bin/env bash
# Local release smoke: unit gates + optional API health if reachable.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Running CI gate (typecheck, lint, tests, build)"
pnpm gate

echo "==> Bundling SQL"
pnpm sql:bundle

echo "==> Verifying SQL bundle mentions latest captions migration"
grep -q "0011_captions.sql" database/dist/supabase_schema.sql
grep -q "create table if not exists public.captions" database/dist/supabase_schema.sql

API_URL="${API_URL:-http://localhost:8000}"
if curl -fsS "${API_URL%/}/health" >/dev/null 2>&1; then
  echo "==> API reachable — running health smoke"
  # Soft mode: warn if an older /health payload lacks ffmpeg fields.
  STRICT_HEALTH=0 bash scripts/check-api-health.sh "$API_URL"
else
  echo "==> API not reachable at $API_URL (skipping health smoke)"
fi

echo "Local smoke completed."
