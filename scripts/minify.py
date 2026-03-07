#!/usr/bin/env python3
"""
Minification pipeline for pepper-blog.

Reads index.html, minifies inline CSS and JS, strips HTML comments,
collapses whitespace, writes to dist/index.html.

Usage: python3 scripts/minify.py [--check]
  --check   Dry-run: verify dist/ is up-to-date (exit 1 if stale/missing).
"""

import argparse
import os
import re
import sys
import hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "index.html")
DIST_DIR = os.path.join(ROOT, "dist")
DIST = os.path.join(DIST_DIR, "index.html")
HASH_FILE = os.path.join(DIST_DIR, ".src_hash")


def sha256(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()


def minify_css(css: str) -> str:
    # Strip comments
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)
    # Collapse whitespace
    css = re.sub(r"\s+", " ", css)
    # Remove spaces around punctuation
    css = re.sub(r"\s*([{};:,>~+])\s*", r"\1", css)
    # Remove trailing semicolon before }
    css = re.sub(r";}", "}", css)
    return css.strip()


def minify_js(js: str) -> str:
    try:
        import rjsmin
        return rjsmin.jsmin(js)
    except ImportError:
        # Fallback: basic strip
        js = re.sub(r"//[^\n]*", "", js)
        js = re.sub(r"/\*.*?\*/", "", js, flags=re.DOTALL)
        js = re.sub(r"\s+", " ", js)
        return js.strip()


def minify_html(html: str) -> str:
    # Strip HTML comments (preserve IE conditionals just in case)
    html = re.sub(r"<!--(?!\[if).*?-->", "", html, flags=re.DOTALL)

    # Minify inline <style> blocks
    def min_style(m):
        return f"<style>{minify_css(m.group(1))}</style>"
    html = re.sub(r"<style>(.*?)</style>", min_style, html, flags=re.DOTALL)

    # Minify inline <script> blocks
    def min_script(m):
        attrs = m.group(1)
        body = m.group(2)
        return f"<script{attrs}>{minify_js(body)}</script>"
    html = re.sub(r"<script([^>]*)>(.*?)</script>", min_script, html, flags=re.DOTALL)

    # Collapse inter-tag whitespace (preserve pre/textarea content)
    html = re.sub(r">\s+<", "><", html)
    # Collapse runs of spaces/tabs (not newlines inside text)
    html = re.sub(r"[ \t]{2,}", " ", html)
    # Strip leading/trailing whitespace per line then rejoin
    lines = [l.strip() for l in html.splitlines()]
    html = "\n".join(l for l in lines if l)

    return html.strip()


def build(check_only: bool = False) -> int:
    with open(SRC, encoding="utf-8") as f:
        src = f.read()

    src_hash = sha256(src)
    minified = minify_html(src)

    if check_only:
        if not os.path.exists(DIST):
            print("FAIL: dist/index.html does not exist. Run: python3 scripts/minify.py", file=sys.stderr)
            return 1
        if not os.path.exists(HASH_FILE):
            print("FAIL: dist/.src_hash missing. Run: python3 scripts/minify.py", file=sys.stderr)
            return 1
        with open(HASH_FILE) as f:
            saved_hash = f.read().strip()
        if saved_hash != src_hash:
            print("FAIL: dist/index.html is stale. Run: python3 scripts/minify.py", file=sys.stderr)
            return 1
        print(f"OK: dist/index.html is up-to-date ({len(minified)} chars, {100*(1-len(minified)/len(src)):.1f}% reduction)")
        return 0

    os.makedirs(DIST_DIR, exist_ok=True)
    with open(DIST, "w", encoding="utf-8") as f:
        f.write(minified)
    with open(HASH_FILE, "w") as f:
        f.write(src_hash)

    reduction = 100 * (1 - len(minified) / len(src))
    print(f"OK: {SRC} -> {DIST}")
    print(f"    {len(src):,} -> {len(minified):,} chars ({reduction:.1f}% reduction)")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Check if dist is up-to-date")
    args = parser.parse_args()
    sys.exit(build(check_only=args.check))
