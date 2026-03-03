#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/validate_episodes.py
python3 scripts/validate_feed.py
echo "OK: blog tests passed"
