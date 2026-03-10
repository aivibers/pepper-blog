#!/usr/bin/env bash
# arcade-import.sh — Import a Godot WASM build into the arcade
# Usage: arcade-import.sh <game-id>
#        arcade-import.sh --test

set -euo pipefail

BLOG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCADE_DIR="$BLOG_DIR/arcade"
WORKSPACE="$HOME/.openclaw/workspace"
PROJECTS_DIR="$WORKSPACE/projects"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
pass() { echo "  ✓ $1"; PASS_COUNT=$((PASS_COUNT+1)); }
fail() { echo "  ✗ $1"; FAIL_COUNT=$((FAIL_COUNT+1)); }
PASS_COUNT=0
FAIL_COUNT=0

# ---------------------------------------------------------------------------
# Game config registry
# ---------------------------------------------------------------------------
game_source_dir() {
  case "$1" in
    garden-runner) echo "$PROJECTS_DIR/simple-3d-game-godot/build/web" ;;
    *) echo "" ;;
  esac
}

game_title() {
  case "$1" in
    garden-runner) echo "Garden Runner 🐰 — Pepper's Arcade" ;;
    *) echo "$1" ;;
  esac
}

# ---------------------------------------------------------------------------
# patch_godot_html — patch a Godot-exported index.html in-place
# ---------------------------------------------------------------------------
patch_godot_html() {
  local html_file="$1"
  local title="$2"

  # 1. Update <title>
  sed -i '' "s|<title>.*</title>|<title>${title}</title>|" "$html_file"

  # 2. Inject back link + beta notice after <body>
  local back_link='<a class="arcade-back" href="/arcade/" style="position:fixed;top:12px;left:12px;z-index:9999;background:rgba(13,17,23,0.85);border:1px solid #30363d;border-radius:6px;padding:6px 12px;font-family:ui-monospace,monospace;font-size:0.75rem;color:#f0883e;text-decoration:none;backdrop-filter:blur(4px);">← arcade</a>'

  local beta_notice='<div class="arcade-beta-notice">\
  β early access — may have bugs · <a href="/arcade/">back to arcade</a>\
</div>\
<style>\
  .arcade-beta-notice {\
    position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);\
    background: rgba(13,17,23,0.85); border: 1px solid rgba(139,148,158,0.25);\
    border-radius: 6px; padding: 5px 14px;\
    font-family: ui-monospace, monospace; font-size: 0.7rem;\
    color: #8b949e; z-index: 9999;\
    backdrop-filter: blur(4px); white-space: nowrap;\
  }\
  .arcade-beta-notice a { color: #f0883e; text-decoration: none; }\
</style>'

  # Insert back_link and beta_notice after <body>
  sed -i '' "s|<body>|<body>${back_link}${beta_notice}|" "$html_file"
}

# ---------------------------------------------------------------------------
# import_game — copy + patch a game into the arcade
# ---------------------------------------------------------------------------
import_game() {
  local game_id="$1"
  local src
  src="$(game_source_dir "$game_id")"

  if [[ -z "$src" ]]; then
    echo "ERROR: Unknown game id: $game_id" >&2
    exit 1
  fi

  if [[ ! -d "$src" ]]; then
    echo "ERROR: Source dir not found: $src" >&2
    exit 1
  fi

  local dest="$ARCADE_DIR/$game_id"
  echo "Importing $game_id → $dest"

  mkdir -p "$dest"
  cp -r "$src/." "$dest/"

  local title
  title="$(game_title "$game_id")"
  patch_godot_html "$dest/index.html" "$title"

  echo "Done. $game_id imported and patched."
}

# ---------------------------------------------------------------------------
# run_tests — 25 tests covering the full import pipeline
# ---------------------------------------------------------------------------
run_tests() {
  echo "Running arcade-import tests..."
  echo ""

  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap '[[ -n "${tmp_dir:-}" ]] && rm -rf "$tmp_dir"' EXIT

  # --- Group 1: Script structure (5 tests) ---
  echo "[1] Script structure"

  [[ -f "$BLOG_DIR/scripts/arcade-import.sh" ]] \
    && pass "arcade-import.sh exists" || fail "arcade-import.sh exists"

  [[ -x "$BLOG_DIR/scripts/arcade-import.sh" ]] \
    && pass "arcade-import.sh is executable" || fail "arcade-import.sh is executable"

  [[ -f "$ARCADE_DIR/games.json" ]] \
    && pass "games.json exists" || fail "games.json exists"

  [[ -f "$ARCADE_DIR/index.html" ]] \
    && pass "arcade/index.html exists" || fail "arcade/index.html exists"

  python3 -c "import json,sys; d=json.load(open('$ARCADE_DIR/games.json')); sys.exit(0 if isinstance(d, list) else 1)" 2>/dev/null \
    && pass "games.json is valid JSON array" || fail "games.json is valid JSON array"

  echo ""

  # --- Group 2: games.json content (5 tests) ---
  echo "[2] games.json content"

  python3 -c "
import json,sys
d=json.load(open('$ARCADE_DIR/games.json'))
ids=[g['id'] for g in d]
sys.exit(0 if 'garden-runner' in ids else 1)
" 2>/dev/null && pass "garden-runner entry exists" || fail "garden-runner entry exists"

  python3 -c "
import json,sys
d=json.load(open('$ARCADE_DIR/games.json'))
g=next((x for x in d if x['id']=='garden-runner'),None)
sys.exit(0 if g and g.get('beta')==True else 1)
" 2>/dev/null && pass "garden-runner has beta:true" || fail "garden-runner has beta:true"

  python3 -c "
import json,sys
d=json.load(open('$ARCADE_DIR/games.json'))
g=next((x for x in d if x['id']=='garden-runner'),None)
sys.exit(0 if g and 'beta' in g.get('tag','') else 1)
" 2>/dev/null && pass "garden-runner tag contains 'beta'" || fail "garden-runner tag contains 'beta'"

  python3 -c "
import json,sys
d=json.load(open('$ARCADE_DIR/games.json'))
g=next((x for x in d if x['id']=='garden-runner'),None)
sys.exit(0 if g and g.get('live')==True else 1)
" 2>/dev/null && pass "garden-runner has live:true" || fail "garden-runner has live:true"

  python3 -c "
import json,sys
d=json.load(open('$ARCADE_DIR/games.json'))
g=next((x for x in d if x['id']=='garden-runner'),None)
sys.exit(0 if g and g.get('icon') else 1)
" 2>/dev/null && pass "garden-runner has icon" || fail "garden-runner has icon"

  echo ""

  # --- Group 3: arcade/index.html content (5 tests) ---
  echo "[3] arcade/index.html"

  grep -q "beta-badge" "$ARCADE_DIR/index.html" \
    && pass "index.html has .beta-badge CSS" || fail "index.html has .beta-badge CSS"

  grep -q "g\.beta" "$ARCADE_DIR/index.html" \
    && pass "index.html has beta conditional in JS" || fail "index.html has beta conditional in JS"

  grep -q "beta-badge" "$ARCADE_DIR/index.html" && grep -q "β" "$ARCADE_DIR/index.html" \
    && pass "index.html renders β character" || fail "index.html renders β character"

  grep -q "games\.json" "$ARCADE_DIR/index.html" \
    && pass "index.html fetches games.json" || fail "index.html fetches games.json"

  grep -q "game-card" "$ARCADE_DIR/index.html" \
    && pass "index.html has game-card class" || fail "index.html has game-card class"

  echo ""

  # --- Group 4: Godot source files (3 tests) ---
  echo "[4] Godot source"

  local godot_src
  godot_src="$(game_source_dir garden-runner)"

  [[ -d "$godot_src" ]] \
    && pass "Godot build dir exists" || fail "Godot build dir exists"

  [[ -f "$godot_src/index.html" ]] \
    && pass "Godot index.html exists" || fail "Godot index.html exists"

  [[ -f "$godot_src/index.js" ]] \
    && pass "Godot index.js exists" || fail "Godot index.js exists"

  echo ""

  # --- Group 5: patch_godot_html function (5 tests) ---
  echo "[5] patch_godot_html"

  # Copy Godot build to tmp for testing patch
  local test_html="$tmp_dir/index.html"
  cp "$godot_src/index.html" "$test_html"
  patch_godot_html "$test_html" "Test Title — Pepper's Arcade"

  grep -q "Test Title" "$test_html" \
    && pass "patch sets custom title" || fail "patch sets custom title"

  grep -q "arcade-back" "$test_html" \
    && pass "patch injects back link" || fail "patch injects back link"

  grep -q "arcade-beta-notice" "$test_html" \
    && pass "patch injects beta notice" || fail "patch injects beta notice"

  grep -q "/arcade/" "$test_html" \
    && pass "patch back link points to /arcade/" || fail "patch back link points to /arcade/"

  grep -q "f0883e" "$test_html" \
    && pass "patch uses arcade accent color" || fail "patch uses arcade accent color"

  echo ""

  # --- Group 6: Imported game dir (2 tests) ---
  echo "[6] Imported game dir"

  local imported="$ARCADE_DIR/garden-runner"

  [[ -d "$imported" ]] \
    && pass "garden-runner dir exists in arcade" || fail "garden-runner dir exists in arcade"

  [[ -f "$imported/index.html" ]] \
    && pass "garden-runner/index.html exists" || fail "garden-runner/index.html exists"

  echo ""

  # --- Summary ---
  local total=$((PASS_COUNT+FAIL_COUNT))
  echo "Results: $PASS_COUNT/$total passed"
  if [[ $FAIL_COUNT -gt 0 ]]; then
    echo "FAIL — $FAIL_COUNT test(s) failed"
    exit 1
  else
    echo "ALL TESTS PASSED ✓"
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
case "${1:-}" in
  --test) run_tests ;;
  "") echo "Usage: arcade-import.sh <game-id> | --test"; exit 1 ;;
  *) import_game "$1" ;;
esac
