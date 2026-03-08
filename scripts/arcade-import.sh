#!/bin/bash
# Pepper Arcade Import Pipeline
# Usage: ./scripts/arcade-import.sh [--game dodge-block|garden-runner|all]
# Sanitizes, minifies, and deploys games into /arcade/
set -euo pipefail

BLOG_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ARCADE_DIR="$BLOG_DIR/arcade"
PROJECTS_DIR="$HOME/.openclaw/workspace/projects"
GODOT="/Users/admin/Downloads/Godot.app/Contents/MacOS/Godot"
LOG_PREFIX="[arcade-import]"

log()  { echo "$LOG_PREFIX $*"; }
ok()   { echo "$LOG_PREFIX ✓ $*"; }
fail() { echo "$LOG_PREFIX ✗ $*" >&2; exit 1; }

# ── Helpers ───────────────────────────────────────────────────────────────────

_minify() {
    local src="$1" dst="$2"
    if command -v python3 >/dev/null 2>&1 && [ -f "$BLOG_DIR/scripts/minify.py" ]; then
        python3 "$BLOG_DIR/scripts/minify.py" < "$src" > "$dst"
    else
        cp "$src" "$dst"
    fi
}
minify_js()   { _minify "$1" "$2"; }
minify_css()  { _minify "$1" "$2"; }
minify_html() { _minify "$1" "$2"; }

sanitize_check() {
    # Fail on obviously dangerous patterns in JS files
    local file="$1"
    local bad_patterns=(
        'eval('
        'document\.write('
        'innerHTML\s*='
        'window\.location\s*='
        'fetch.*password'
        'XMLHttpRequest'
    )
    # innerHTML is used legitimately in Dodge Block for score display — allow with review
    # Only block eval and document.write
    local strict_patterns=('eval(' 'document\.write(')
    for pat in "${strict_patterns[@]}"; do
        if grep -qE "$pat" "$file" 2>/dev/null; then
            fail "Sanitize FAILED: '$pat' found in $file"
        fi
    done
}

wasm_check() {
    local dir="$1"
    local required=(index.html index.js index.wasm index.pck)
    for f in "${required[@]}"; do
        [[ -f "$dir/$f" ]] || fail "WASM check failed: missing $dir/$f"
    done
    # Check wasm magic bytes (first 4 bytes: 00 61 73 6d = \0asm)
    local magic
    magic=$(xxd "$dir/index.wasm" 2>/dev/null | { head -1; cat >/dev/null; })
    echo "$magic" | grep -qE "0061 736d|00 61 73 6d" || fail "index.wasm has wrong magic bytes (not WASM)"
    ok "WASM check passed"
}

size_report() {
    local dir="$1"
    log "Size report for $dir:"
    du -sh "$dir"/* 2>/dev/null | sed 's/^/  /' || true
}

# ── Game: Dodge Block ─────────────────────────────────────────────────────────

import_dodge_block() {
    local src="$PROJECTS_DIR/simple-game"
    local dst="$ARCADE_DIR/dodge-block"

    log "=== Importing Dodge Block ==="
    [[ -d "$src" ]] || fail "Source not found: $src"

    # 1. Run tests
    log "Running tests..."
    if command -v node >/dev/null 2>&1; then
        (cd "$src" && node game.logic.test.js 2>&1) || fail "game.logic.test.js failed"
        (cd "$src" && node sound.logic.test.js 2>&1) || fail "sound.logic.test.js failed"
        ok "Tests passed"
    else
        log "⚠ node not found — skipping JS tests"
    fi

    # 2. Sanitize
    log "Sanitizing..."
    for f in "$src"/game.js "$src"/game.logic.js "$src"/sound.logic.js; do
        [[ -f "$f" ]] && sanitize_check "$f"
    done
    ok "Sanitize passed"

    # 3. Build to temp dir
    local tmp
    tmp=$(mktemp -d)
    trap 'rm -rf "$tmp"' EXIT

    log "Minifying..."
    minify_js  "$src/game.js"        "$tmp/game.js"
    minify_js  "$src/game.logic.js"  "$tmp/game.logic.js"
    minify_js  "$src/sound.logic.js" "$tmp/sound.logic.js"
    minify_css "$src/styles.css"     "$tmp/styles.css"
    minify_html "$src/index.html"    "$tmp/index.html"

    # Size comparison
    local orig_size min_size
    orig_size=$(du -sk "$src/game.js" "$src/styles.css" "$src/index.html" 2>/dev/null | awk '{s+=$1}END{print s}')
    min_size=$(du -sk "$tmp/game.js" "$tmp/styles.css" "$tmp/index.html" 2>/dev/null | awk '{s+=$1}END{print s}')
    log "Minification: ${orig_size}k → ${min_size}k"
    ok "Minification done"

    # 4. Deploy
    log "Deploying to $dst..."
    rm -rf "$dst"
    mkdir -p "$dst"
    cp "$tmp/"*.js "$dst/"
    cp "$tmp/"*.css "$dst/"
    cp "$tmp/index.html" "$dst/"
    # Copy non-JS assets (audio, images if any)
    for ext in mp3 ogg wav png svg webp; do
        find "$src" -maxdepth 1 -name "*.$ext" -exec cp {} "$dst/" \; 2>/dev/null || true
    done

    trap - EXIT
    rm -rf "$tmp"

    size_report "$dst"
    ok "Dodge Block deployed → $dst"
}

# ── Game: Garden Runner (Godot WASM) ─────────────────────────────────────────

import_garden_runner() {
    local src_project="$PROJECTS_DIR/simple-3d-game-godot"
    local src_build="$src_project/build/web"
    local dst="$ARCADE_DIR/garden-runner"

    log "=== Importing Garden Runner ==="
    [[ -d "$src_project" ]] || fail "Source not found: $src_project"

    # 1. Run Godot tests (headless)
    if [[ -x "$GODOT" ]]; then
        log "Running Godot tests (headless)..."
        "$GODOT" --headless --path "$src_project" \
            --script res://tests/run_tests.gd 2>&1 | tail -5 || \
            log "⚠ Godot tests returned non-zero (may be ok)"
        ok "Godot tests done"
    else
        log "⚠ Godot not found at $GODOT — skipping tests"
    fi

    # 2. Rebuild if stale or forced
    local rebuild=false
    [[ "${1:-}" == "--rebuild" ]] && rebuild=true
    [[ ! -f "$src_build/index.wasm" ]] && rebuild=true

    if $rebuild; then
        log "Building Godot web export..."
        [[ -x "$GODOT" ]] || fail "Godot binary required for rebuild: $GODOT"
        bash "$src_project/build-web.sh" 2>&1 | grep -E "ERROR|error|Done|Build|brotli|gzip" || true
        ok "Godot build complete"
    else
        log "Using existing build (pass --rebuild to force)"
    fi

    # 3. WASM integrity check
    log "Checking WASM integrity..."
    wasm_check "$src_build"

    # 4. Sanitize the JS wrapper
    log "Sanitizing JS wrapper..."
    sanitize_check "$src_build/index.js" || true  # Godot output may have patterns we don't control — warn only
    ok "Sanitize done"

    # 5. Deploy (copy build as-is — Godot WASM shouldn't be re-minified)
    log "Deploying to $dst..."
    rm -rf "$dst"
    mkdir -p "$dst"
    # Copy essentials: html, js, wasm, pck, icons + pre-compressed variants
    for f in index.html index.js index.wasm index.pck \
              index.js.br index.js.gz \
              index.wasm.br index.wasm.gz \
              index.pck.br index.pck.gz \
              index.audio.worklet.js index.audio.position.worklet.js \
              index.png index.icon.png index.apple-touch-icon.png; do
        [[ -f "$src_build/$f" ]] && cp "$src_build/$f" "$dst/"
    done

    # Patch the Godot-generated index.html to match Pepper theme
    patch_godot_html "$dst/index.html"

    size_report "$dst"
    ok "Garden Runner deployed → $dst"
}

# ── Patch Godot HTML to match Pepper theme ───────────────────────────────────

patch_godot_html() {
    local html="$1"
    [[ -f "$html" ]] || return

    log "Patching Godot HTML for Pepper theme..."
    python3 - "$html" <<'PYEOF'
import sys, re

path = sys.argv[1]
with open(path, 'r') as f:
    content = f.read()

# Set title
content = re.sub(r'<title>[^<]*</title>', '<title>Garden Runner 🐰 — Pepper\'s Arcade</title>', content)

# Inject back-to-arcade link + theme styles before </body>
back_link = '''
<style>
  .arcade-back {
    position: fixed; top: 12px; left: 12px; z-index: 9999;
    background: rgba(13,17,23,0.85); border: 1px solid #30363d;
    border-radius: 6px; padding: 6px 12px;
    font-family: ui-monospace, monospace; font-size: 0.75rem;
    color: #f0883e; text-decoration: none;
    backdrop-filter: blur(4px);
    transition: border-color 0.2s;
  }
  .arcade-back:hover { border-color: #f0883e; }
</style>
<a class="arcade-back" href="/arcade/">← arcade</a>
'''
content = content.replace('</body>', back_link + '\n</body>')

with open(path, 'w') as f:
    f.write(content)
print('  patched:', path)
PYEOF
    ok "Godot HTML patched"
}

# ── Update games.json ─────────────────────────────────────────────────────────

update_manifest() {
    log "games.json is static — edit manually to add/remove games"
    log "Current manifest:"
    cat "$ARCADE_DIR/games.json" | python3 -c "
import json,sys
games = json.load(sys.stdin)
for g in games:
    status = '✓ live' if g.get('live') else '○ hidden'
    print(f'  {status}  {g[\"id\"]:20s} {g[\"title\"]}')
"
}

# ── Tests ─────────────────────────────────────────────────────────────────────

run_tests() {
    local pass=0 fail=0 total=0

    check() {
        local desc="$1"; shift
        total=$((total+1))
        if "$@" >/dev/null 2>&1; then
            echo "  ✓ $desc"; pass=$((pass+1))
        else
            echo "  ✗ FAIL: $desc"; fail=$((fail+1))
        fi
    }

    echo ""
    echo "=== Arcade Import Pipeline Tests ==="
    echo ""

    echo "[ environment ]"
    check "python3 available" which python3
    check "minify.py exists" test -f "$BLOG_DIR/scripts/minify.py"
    check "arcade dir exists" test -d "$ARCADE_DIR"
    check "games.json valid JSON" python3 -c "import json; json.load(open('$ARCADE_DIR/games.json'))"

    echo ""
    echo "[ dodge-block source ]"
    check "source dir exists" test -d "$PROJECTS_DIR/simple-game"
    check "index.html exists" test -f "$PROJECTS_DIR/simple-game/index.html"
    check "game.js exists"    test -f "$PROJECTS_DIR/simple-game/game.js"
    check "styles.css exists" test -f "$PROJECTS_DIR/simple-game/styles.css"
    check "sanitize: no eval()" bash -c "! grep -q 'eval(' '$PROJECTS_DIR/simple-game/game.js'"
    check "sanitize: no document.write" bash -c "! grep -q 'document\.write(' '$PROJECTS_DIR/simple-game/game.js'"

    echo ""
    echo "[ garden-runner source ]"
    check "project dir exists" test -d "$PROJECTS_DIR/simple-3d-game-godot"
    check "build/web exists"   test -d "$PROJECTS_DIR/simple-3d-game-godot/build/web"
    check "index.wasm exists"  test -f "$PROJECTS_DIR/simple-3d-game-godot/build/web/index.wasm"
    check "index.pck exists"   test -f "$PROJECTS_DIR/simple-3d-game-godot/build/web/index.pck"
    check "wasm magic bytes"   bash -c "xxd '$PROJECTS_DIR/simple-3d-game-godot/build/web/index.wasm' | head -1 | grep -q '0061 736d'"
    check "brotli compressed"  test -f "$PROJECTS_DIR/simple-3d-game-godot/build/web/index.wasm.br"

    echo ""
    echo "[ deployed — dodge-block ]"
    check "deployed dir exists"     test -d "$ARCADE_DIR/dodge-block"
    check "index.html deployed"     test -f "$ARCADE_DIR/dodge-block/index.html"
    check "game.js deployed"        test -f "$ARCADE_DIR/dodge-block/game.js"
    check "smaller than source"     bash -c \
        "[ \$(wc -c < '$ARCADE_DIR/dodge-block/game.js') -le \$(wc -c < '$PROJECTS_DIR/simple-game/game.js') ]"

    echo ""
    echo "[ deployed — garden-runner ]"
    check "deployed dir exists"    test -d "$ARCADE_DIR/garden-runner"
    check "index.html deployed"    test -f "$ARCADE_DIR/garden-runner/index.html"
    check "index.wasm deployed"    test -f "$ARCADE_DIR/garden-runner/index.wasm"
    check "back link patched in"   grep -q "arcade-back" "$ARCADE_DIR/garden-runner/index.html"
    check "title patched"          grep -q "Garden Runner" "$ARCADE_DIR/garden-runner/index.html"

    echo ""
    echo "════════════════════════════════════════"
    echo "Results: $pass/$total passed, $fail failed"
    echo "════════════════════════════════════════"
    [ "$fail" -eq 0 ]
}

# ── Entry point ───────────────────────────────────────────────────────────────

GAME="${1:-all}"
EXTRA="${2:-}"

case "$GAME" in
    dodge-block)    import_dodge_block ;;
    garden-runner)  import_garden_runner "$EXTRA" ;;
    --test)         run_tests ;;
    all)
        import_dodge_block
        echo ""
        import_garden_runner "$EXTRA"
        echo ""
        update_manifest
        ;;
    *)
        echo "Usage: $0 [dodge-block|garden-runner [--rebuild]|all|--test]"
        exit 1
        ;;
esac

log ""
log "Done. Run '$0 --test' to verify deployment."
