#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/validate_episodes.py
python3 scripts/validate_feed.py
python3 scripts/validate_ui.py
python3 scripts/test_star_system.py
python3 scripts/test_minify.py -v 2>&1 | tail -5
python3 scripts/minify.py --check
echo "OK: blog tests passed"
