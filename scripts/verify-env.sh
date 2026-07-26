#!/usr/bin/env bash
# Verifies required deployment env vars are present without printing secret values.
set -euo pipefail

TARGET="${1:-web}" # web | api
missing=0

require() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "MISSING: $name"
    missing=1
  else
    echo "OK: $name (set)"
  fi
}

if [[ "$TARGET" == "web" ]]; then
  require NEXT_PUBLIC_SUPABASE_URL
  require NEXT_PUBLIC_SUPABASE_ANON_KEY
  require NEXT_PUBLIC_APP_URL
  require NEXT_PUBLIC_API_URL
  require API_URL
  require INTERNAL_API_TOKEN
  require AI_PROVIDER
elif [[ "$TARGET" == "api" ]]; then
  require INTERNAL_API_TOKEN
  require ALLOWED_ORIGINS
else
  echo "Usage: $0 [web|api]"
  exit 2
fi

if [[ "$missing" -ne 0 ]]; then
  echo "Environment verification failed."
  exit 1
fi

echo "Environment verification passed for target=$TARGET."
