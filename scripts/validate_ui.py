#!/usr/bin/env python3
"""
UI guardrail checks for index.html.
Focused on real regressions we care about:
- no-JS fallback should hide stars/controls/buttons
- JS bootstrapping should remove no-js class
- key star controls must exist
"""

import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
index_path = root / "index.html"

try:
    html = index_path.read_text()
except Exception as e:
    print(f"FAIL: cannot read {index_path}: {e}")
    sys.exit(1)

errors = []

def must_contain(snippet: str, msg: str):
    if snippet not in html:
        errors.append(msg)

# 1) no-js default + bootstrap removal
must_contain('<html lang="en" class="no-js">', "html must default to class=no-js")
must_contain("classList.remove('no-js')", "missing no-js bootstrap removal script")

# 2) CSS no-js hiding contract for stars/buttons/panel
for selector in [
    ".no-js .stars",
    ".no-js .stars-canvas",
    ".no-js .cookie-consent-btn",
    ".no-js .stars-toggle-btn",
    ".no-js .stars-power-btn",
    ".no-js .sky-controls",
]:
    if selector not in html:
        errors.append(f"missing no-js hide selector: {selector}")

if "display: none !important;" not in html:
    errors.append("no-js hide block should force display:none !important")

# 3) Required star UI controls exist
for control_id in [
    "cookie-consent-btn",
    "stars-toggle-btn",
    "stars-power-btn",
    "sky-seed-input",
    "sky-randomize-btn",
    "sky-controls-panel",
    "stars-canvas",
]:
    if f'id="{control_id}"' not in html:
        errors.append(f"missing required control id: {control_id}")

# 4) Konami gate should exist for hidden settings toggle
must_contain("const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];",
             "missing Konami code sequence gate")
must_contain("btn.classList.add('unlocked');", "missing unlocked state for settings button")
must_contain("window.__konamiCount", "missing konami count tracking")
must_contain("window.__konamiPinned", "missing konami pinned persistence")
must_contain("btn.classList.add('revealed');", "missing revealed state for persistent button")
must_contain("panelOpen:", "missing panel open-state persistence field")
must_contain("skySeed:", "missing seed persistence field")
must_contain("window.__skySeed = window.__skySeed || 'pepper'", "missing default pepper seed")
must_contain("id=\"sky-seed-input\"", "missing sky seed input control")
must_contain("panel.classList.toggle('show', prefs.panelOpen)", "missing panel open-state restore")
must_contain("panel.open = prefs.panelOpen", "missing <details> open-state restore")
must_contain("const setPanelOpen = (show, persist = true)", "missing centralized panel state setter")
must_contain("panel.addEventListener('toggle'", "missing native details toggle persistence sync")
must_contain("window.addEventListener('pagehide', saveSkyPrefs)", "missing pagehide persistence save hook")
must_contain("sessionStorage.setItem('pepperSkyPanelOpen'", "missing sessionStorage panel-open persistence")
must_contain("sessionStorage.getItem('pepperSkyPanelOpen'", "missing sessionStorage panel-open restore")
must_contain("const PLANET_STYLE =", "missing drifting planet style config")
must_contain("window.__skyDebug", "missing sky debug telemetry for sanity checks")

# 5) Persistence support should exist via cookies
must_contain("setCookie('pepperSkyPrefs'", "missing cookie prefs save")
must_contain("getCookie('pepperSkyPrefs'", "missing cookie prefs load")
must_contain("setCookie('pepperCookieConsent', '1'", "missing cookie consent write")
must_contain("hasCookieConsent()", "missing cookie consent gate")

# 6) Rapid-toggle race hardening should exist
must_contain("window.__starsOnTimer", "missing on-animation timer guard")
must_contain("window.__starsOffTimer", "missing off-animation timer guard")
must_contain("clearTimeout(window.__starsOnTimer)", "missing clearTimeout for on-animation")
must_contain("clearTimeout(window.__starsOffTimer)", "missing clearTimeout for off-animation")
must_contain("if (window.__starsEnabled === false)", "missing stale-state guard before final off class")

# 7) No-flash refresh path when stars are OFF (early bootstrap)
must_contain("stars-off-initial", "missing initial stars-off class bootstrap")
must_contain("getCookie('pepperCookieConsent')", "missing early cookie consent read for initial stars state")
must_contain("consent !== '1'", "missing no-consent initial stars-off gate")
must_contain("getCookie('pepperSkyPrefs')", "missing early prefs cookie read for initial stars state")
must_contain("window.__starsEnabled = false", "missing early starsEnabled preload for no-flash path")

if errors:
    print("FAIL: UI validation")
    for e in errors:
        print("-", e)
    sys.exit(1)

print("OK: index.html UI guards valid")
