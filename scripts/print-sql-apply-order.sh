#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ORDER_FILE="$ROOT/database/APPLY_ORDER.md"

echo "SQL apply order (from database/APPLY_ORDER.md):"
echo

# Print numbered migration/policy paths from the checklist.
grep -E '^[0-9]+\. `' "$ORDER_FILE" | sed -E 's/`//g'
