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
must_contain("const shouldOpen = sessionPanel !== null ? sessionPanel === '1' : !!prefs.panelOpen;", "missing resolved panel open-state restore logic")
must_contain("setPanelOpen(shouldOpen, false);", "missing centralized panel restore path")
must_contain("const setPanelOpen = (show, persist = true)", "missing centralized panel state setter")
must_contain("panel.addEventListener('toggle'", "missing native details toggle persistence sync")
must_contain("window.addEventListener('pagehide', saveSkyPrefs)", "missing pagehide persistence save hook")
must_contain("document.addEventListener('visibilitychange'", "missing visibility pause/resume hook")
must_contain("function getSessionValue(key)", "missing safe sessionStorage getter")
must_contain("function setSessionValue(key, value)", "missing safe sessionStorage setter")
must_contain("setSessionValue('pepperSkyPanelOpen'", "missing sessionStorage panel-open persistence")
must_contain("const sessionPanel = getSessionValue('pepperSkyPanelOpen');", "missing sessionStorage panel-open restore")
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
must_contain("function applyStarsDomState()", "missing centralized stars DOM state sync")
must_contain("classList.toggle('stars-on', starsOn)", "missing stars-on root class toggle")
must_contain("classList.toggle('stars-off', !starsOn)", "missing stars-off root class toggle")

# 8) No duplicate element IDs — each control ID must appear exactly once as id="..."
import collections
id_counts = collections.Counter(re.findall(r'id="([^"]+)"', html))
for control_id in ["stars-canvas", "cookie-consent-btn", "stars-toggle-btn",
                    "stars-power-btn", "sky-controls-panel", "sky-seed-input",
                    "sky-randomize-btn"]:
    count = id_counts.get(control_id, 0)
    if count > 1:
        errors.append(f"duplicate id=\"{control_id}\" found {count} times — must be unique")
    elif count == 0:
        errors.append(f"missing id=\"{control_id}\"")

# 9) No JavaScript inside <style> blocks
style_blocks = re.findall(r'<style>(.*?)</style>', html, re.DOTALL)
for i, block in enumerate(style_blocks):
    for js_pattern in [r'\bconst\s+\w+\s*=', r'\blet\s+\w+\s*=', r'\bvar\s+\w+\s*=',
                        r'\bfunction\s+\w+\s*\(']:
        if re.search(js_pattern, block):
            errors.append(f"JavaScript found inside <style> block {i+1}: {js_pattern}")

# 10) Accessibility: interactive elements should have aria-labels
must_contain('aria-label="Toggle star animation"', "stars toggle button missing aria-label")
must_contain('aria-label="Star animation settings"', "stars power button missing aria-label")
must_contain('aria-label="Enable cookie consent', "cookie consent button missing aria-label")

# 11) Performance: innerHTML should be assigned once, not appended in loop
if 'container.innerHTML +=' in html:
    errors.append("innerHTML += in loop causes O(n²) re-parsing — use single assignment")

# 12) Episode rendering should avoid HTML string interpolation for transcript/title/tag data
must_contain("function compareEpisodes(a, b)", "missing stable episode sort")
must_contain("function renderTranscript(transcript)", "missing transcript renderer")
must_contain("function renderEpisode(ep)", "missing episode renderer")
must_contain("document.createDocumentFragment()", "missing fragment-based episode render")
must_contain("container.replaceChildren(fragment)", "missing single-pass episode DOM replacement")
must_contain("title.textContent = ep.title || ''", "episode title should render via textContent")
must_contain("p.textContent = paragraph;", "transcript paragraphs should render via textContent")
must_contain("error.textContent = 'Episodes failed to load.';", "missing fetch failure fallback")
must_contain("const el = document.getElementById(id);", "hash routing should avoid querySelector hash parsing")
must_contain("if (!r.ok) throw new Error('episodes request failed');", "missing HTTP failure handling for episodes fetch")

# 13) Footer image should have alt attribute
if re.search(r'<img[^>]+pepper-headphones[^>]+(?<!alt="")>', html):
    if not re.search(r'<img[^>]+pepper-headphones[^>]+alt=', html):
        errors.append("footer image missing alt attribute")

if errors:
    print("FAIL: UI validation")
    for e in errors:
        print("-", e)
    sys.exit(1)

print("OK: index.html UI guards valid")
