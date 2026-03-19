#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/test_star_system.py
echo "OK: star system tests passed"
