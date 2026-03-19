#!/usr/bin/env python3
"""
Tests for the star/cookie system in index.html.
Validates that there are no duplicate function definitions,
property name consistency, and no undefined variable references.
"""

import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
html = (root / "index.html").read_text()

errors = []

# ── Test 1: No duplicate function definitions ──
# Functions that must only be defined once
UNIQUE_FUNCTIONS = [
    "setCookie",
    "getCookie",
    "hasCookieConsent",
    "saveSkyPrefs",
    "loadSkyPrefs",
]

for fn in UNIQUE_FUNCTIONS:
    # Match "function fnName(" pattern
    pattern = rf'\bfunction\s+{fn}\s*\('
    matches = re.findall(pattern, html)
    if len(matches) > 1:
        errors.append(
            f"DUPLICATE: function {fn}() defined {len(matches)} times — "
            f"second definition will silently overwrite the first"
        )

# Also check for duplicate const arrow definitions of setPanelOpen
set_panel_defs = re.findall(r'\bconst\s+setPanelOpen\s*=', html)
if len(set_panel_defs) > 1:
    errors.append(
        f"DUPLICATE: const setPanelOpen defined {len(set_panel_defs)} times — "
        f"will cause SyntaxError or silent overwrite"
    )

# ── Test 2: Property name consistency ──
# The early bootstrap reads "starsOn" from pepperSkyPrefs cookie.
# saveSkyPrefs must write "starsOn", not "starsEnabled".
# Check that if saveSkyPrefs writes properties, they match what bootstrap reads.
bootstrap_reads_starsOn = "p.starsOn === false" in html
save_writes_starsEnabled = re.search(
    r'function\s+saveSkyPrefs\b[\s\S]*?starsEnabled\s*:', html
)
save_writes_starsOn = re.search(
    r'function\s+saveSkyPrefs\b[\s\S]*?starsOn\s*:', html
)

if bootstrap_reads_starsOn and save_writes_starsEnabled and not save_writes_starsOn:
    errors.append(
        "MISMATCH: early bootstrap reads 'starsOn' but saveSkyPrefs writes "
        "'starsEnabled' — preferences won't survive page reload"
    )

# ── Test 3: No undefined variable references in setPanelOpen ──
# Check that setPanelOpen doesn't reference 'prefs' (which would be out of scope)
for m in re.finditer(r'const\s+setPanelOpen\s*=\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\};', html):
    body = m.group(1)
    if 'prefs.panelOpen' in body:
        errors.append(
            "UNDEFINED: setPanelOpen references 'prefs.panelOpen' but 'prefs' "
            "is not in scope — will throw ReferenceError"
        )

# ── Test 4: Only one <script> block should contain star system core ──
# Count how many <script> blocks define the star system core functions
script_blocks = re.findall(r'<script>([\s\S]*?)</script>', html)
star_core_blocks = 0
for block in script_blocks:
    # A block is a "star core" if it defines setCookie AND hasCookieConsent
    if re.search(r'function\s+setCookie\b', block) and \
       re.search(r'function\s+hasCookieConsent\b', block):
        star_core_blocks += 1
if star_core_blocks > 1:
    errors.append(
        f"DUPLICATE BLOCKS: {star_core_blocks} separate <script> blocks define "
        f"star system core functions — they will conflict"
    )

# ── Test 5: getCookie regex must handle optional whitespace ──
# The cookie spec allows optional whitespace after semicolons.
# A getCookie using '(?:^|; )' (literal space) will fail on cookies
# like "a=1;b=2" (no space). The correct pattern uses \s*.
get_cookie_patterns = re.findall(r"function\s+getCookie\b[\s\S]*?\.match\('([^']+)'\)", html)
for pat in get_cookie_patterns:
    if r'(?:^|; )' in pat:
        errors.append(
            "FRAGILE: getCookie uses '(?:^|; )' — requires space after semicolon. "
            "Should use \\s* to handle both 'a=1; b=2' and 'a=1;b=2'"
        )

# ── Test 6: Timer logic — setTimeout should not be immediately cleared ──
# The pattern "setTimeout(...); clearTimeout(same)" is a no-op bug.
# After the fix, toggleStars should clearTimeout the *opposite* timer, not its own.
toggle_fn_match = re.search(r'function\s+toggleStars\s*\(\)\s*\{([\s\S]*?)\n    \}', html)
if toggle_fn_match:
    toggle_body = toggle_fn_match.group(1)
    # Check that we don't set and immediately clear the same timer
    if re.search(r'window\.__starsOnTimer\s*=\s*setTimeout.*?clearTimeout\(window\.__starsOnTimer\)', toggle_body, re.DOTALL):
        errors.append(
            "BROKEN TIMER: starsOnTimer is set via setTimeout then immediately cleared — "
            "the timeout never fires"
        )
    if re.search(r'window\.__starsOffTimer\s*=\s*setTimeout.*?clearTimeout\(window\.__starsOffTimer\)', toggle_body, re.DOTALL):
        errors.append(
            "BROKEN TIMER: starsOffTimer is set via setTimeout then immediately cleared — "
            "the timeout never fires"
        )

# ── Test 7: No duplicate <script> blocks containing the full star system ──
# After cleanup, the first <script> should only be the early bootstrap (getCookie).
# The main star system should be in a later <script> block, not duplicated.
early_scripts = []
for block in script_blocks:
    if re.search(r'function\s+getCookie\b', block) and \
       re.search(r'function\s+toggleStars\b', block):
        early_scripts.append(block)
if early_scripts:
    errors.append(
        "MERGED: getCookie and toggleStars should be in separate <script> blocks — "
        "early bootstrap should only contain getCookie for no-flash"
    )

# ── Results ──
if errors:
    print("FAIL: star system validation")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)

print("OK: star system integrity checks passed")
