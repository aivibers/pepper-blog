#!/usr/bin/env python3
"""
Unit tests for the minification pipeline.
"""

import os
import sys
import tempfile
import shutil
import unittest

# Make scripts importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from minify import minify_css, minify_js, minify_html, build, SRC, DIST

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class TestMinifyCSS(unittest.TestCase):
    def test_strips_comments(self):
        result = minify_css("/* comment */ body { color: red; }")
        self.assertNotIn("comment", result)

    def test_collapses_whitespace(self):
        result = minify_css("body   {  color :  red  ;  }")
        self.assertNotIn("  ", result)

    def test_removes_trailing_semicolon(self):
        result = minify_css("body { color: red; }")
        self.assertNotIn(";}", result)
        self.assertIn("red}", result)

    def test_preserves_rules(self):
        result = minify_css("body { color: red; margin: 0; }")
        self.assertIn("color:red", result)
        self.assertIn("margin:0", result)

    def test_multiline_comment(self):
        result = minify_css("/* line1\nline2 */ a { color: blue; }")
        self.assertNotIn("line1", result)
        self.assertIn("color:blue", result)


class TestMinifyJS(unittest.TestCase):
    def test_strips_line_comments(self):
        result = minify_js("var x = 1; // comment\nvar y = 2;")
        self.assertNotIn("comment", result)

    def test_strips_block_comments(self):
        result = minify_js("/* block */ var x = 1;")
        self.assertNotIn("block", result)

    def test_preserves_strings(self):
        result = minify_js('var s = "hello world";')
        self.assertIn("hello world", result)

    def test_preserves_logic(self):
        result = minify_js("if (x > 0) { return true; }")
        self.assertIn("return true", result)


class TestMinifyJSEdgeCases(unittest.TestCase):
    def test_url_in_string_preserved(self):
        result = minify_js('var u = "https://cdn.example.com/lib.js";')
        self.assertIn("https://cdn.example.com", result)

    def test_double_slash_in_string_preserved(self):
        result = minify_js('var s = "http://x.com";')
        self.assertIn("http://x.com", result)

    def test_fallback_preserves_url_in_string(self):
        """Force fallback path and verify URLs in strings are preserved."""
        import unittest.mock
        with unittest.mock.patch.dict('sys.modules', {'rjsmin': None}):
            # Re-import to hit fallback
            from minify import _strip_block_comments_safe
            js = 'var u = "https://cdn.example.com/lib.js"; /* comment */'
            from minify import minify_js as _mjs
            # Call with rjsmin mocked out
            import importlib, minify as m
            importlib.reload(m)
            result = m.minify_js(js)
            self.assertIn("https://cdn.example.com", result)
            self.assertNotIn("comment", result)
            # Reload again to restore
            importlib.reload(m)


class TestMinifyHTML(unittest.TestCase):
    def test_strips_html_comments(self):
        result = minify_html("<!-- comment --><p>hi</p>")
        self.assertNotIn("comment", result)

    def test_preserves_ie_conditionals(self):
        html = "<!--[if IE]><p>ie</p><![endif]-->"
        result = minify_html(html)
        self.assertIn("[if IE]", result)

    def test_collapses_inter_tag_whitespace(self):
        result = minify_html("<div>   \n   <p>hi</p>   </div>")
        # Whitespace between tags should be collapsed — no runs of spaces
        self.assertNotIn("   ", result)
        # Content must be preserved
        self.assertIn("hi", result)

    def test_minifies_inline_style(self):
        html = "<style>body { /* comment */  color:  red;  }</style>"
        result = minify_html(html)
        self.assertNotIn("comment", result)
        self.assertIn("color:red", result)

    def test_minifies_inline_script(self):
        html = "<script>// comment\nvar x = 1;</script>"
        result = minify_html(html)
        self.assertNotIn("comment", result)
        self.assertIn("var x", result)

    def test_output_is_smaller(self):
        html = "   <html>  \n  <body>   \n<p>  hello  </p>  </body>  </html>  "
        result = minify_html(html)
        self.assertLess(len(result), len(html))

    def test_preserves_script_type_attrs(self):
        html = '<script type="application/json">{"key": "value"}</script>'
        result = minify_html(html)
        self.assertIn('type="application/json"', result)

    def test_multiple_style_blocks(self):
        html = '<style>body { color: red; }</style><style>p { margin: 0; }</style>'
        result = minify_html(html)
        self.assertIn("color:red", result)
        self.assertIn("margin:0", result)

    def test_multiple_script_blocks(self):
        html = '<script>var a = 1;</script><script>var b = 2;</script>'
        result = minify_html(html)
        self.assertIn("var a", result)
        self.assertIn("var b", result)

    def test_external_script_not_mangled(self):
        html = '<script src="app.js"></script>'
        result = minify_html(html)
        self.assertIn('<script src="app.js"></script>', result)

    def test_css_keyframes_preserved(self):
        css_with_keyframes = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }'
        html = f'<style>{css_with_keyframes}</style>'
        result = minify_html(html)
        self.assertIn("@keyframes spin", result)
        self.assertIn("rotate(360deg)", result)

    def test_pre_content_preserved(self):
        html = '<div> <pre>  hello\n  world  </pre> <p>text</p> </div>'
        result = minify_html(html)
        self.assertIn('<pre>  hello\n  world  </pre>', result)

    def test_textarea_content_preserved(self):
        html = '<textarea>  some\n  text  </textarea>'
        result = minify_html(html)
        self.assertIn('<textarea>  some\n  text  </textarea>', result)


class TestBuildIntegration(unittest.TestCase):
    """Integration: run build on real index.html and verify output."""

    def setUp(self):
        self.orig_dist = os.path.join(ROOT, "dist")
        self.tmp_dir = tempfile.mkdtemp()
        # Patch DIST_DIR used by build() via monkeypatching module globals
        import minify as m
        self._orig_dist_dir = m.DIST_DIR
        self._orig_dist = m.DIST
        self._orig_hash = m.HASH_FILE
        m.DIST_DIR = self.tmp_dir
        m.DIST = os.path.join(self.tmp_dir, "index.html")
        m.HASH_FILE = os.path.join(self.tmp_dir, ".src_hash")

    def tearDown(self):
        import minify as m
        m.DIST_DIR = self._orig_dist_dir
        m.DIST = self._orig_dist
        m.HASH_FILE = self._orig_hash
        shutil.rmtree(self.tmp_dir)

    def test_build_creates_dist(self):
        import minify as m
        result = build()
        self.assertEqual(result, 0)
        self.assertTrue(os.path.exists(m.DIST))

    def test_build_output_is_smaller(self):
        import minify as m
        build()
        src_size = os.path.getsize(SRC)
        dist_size = os.path.getsize(m.DIST)
        self.assertLess(dist_size, src_size)

    def test_build_output_has_no_html_comments(self):
        import minify as m
        build()
        with open(m.DIST) as f:
            content = f.read()
        import re
        comments = re.findall(r"<!--(?!\[if).*?-->", content, re.DOTALL)
        self.assertEqual(comments, [], f"Found unexpected HTML comments: {comments[:2]}")

    def test_check_passes_after_build(self):
        result = build()
        self.assertEqual(result, 0)
        result = build(check_only=True)
        self.assertEqual(result, 0)

    def test_check_fails_when_stale(self):
        import minify as m
        build()
        # Overwrite hash to simulate stale
        with open(m.HASH_FILE, "w") as f:
            f.write("stale_hash")
        result = build(check_only=True)
        self.assertEqual(result, 1)

    def test_check_fails_when_missing(self):
        result = build(check_only=True)
        self.assertEqual(result, 1)

    def test_output_contains_key_content(self):
        import minify as m
        build()
        with open(m.DIST) as f:
            content = f.read()
        self.assertIn("Pepper", content)
        self.assertIn("episodes.json", content)


if __name__ == "__main__":
    unittest.main(verbosity=2)
