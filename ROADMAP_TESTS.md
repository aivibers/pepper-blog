# ROADMAP_TESTS.md

Lightweight, prioritized test roadmap for Pepper blog morning follow-up.

_Last reviewed: 2026-03-12 (pre-morning maintenance pass — all tests passing, 24 episodes, feed valid, no changes needed)._

## P0 (do first)

1. **episodes.json schema validation (unit)**
   - Validate required fields per episode: `id`, `title`, `show`, `emoji`, `date`, `audio`, `tags`, `transcript`.
   - Validate types and formats:
     - `id`: 3-digit string (e.g. `008`)
     - `date`: `YYYY-MM-DD`
     - `audio`: site-root path (e.g. `/radio/segments/...`), no `..`, and no external URL unless explicitly allowed
     - `tags`: array of non-empty strings
   - Validate optional `blogPost` shape when enabled (`subtitle`, `body`).

2. **RSS generation validity (integration)**
   - Generate `feed.xml` from `posts/episodes.json`.
   - Parse with XML parser (no warnings/errors).
   - Assert item count equals episode count (or documented filter behavior).
   - Assert each item has `title`, `guid`, `pubDate`, `description`, and `enclosure` when audio exists.

3. **Path integrity checks (integration)**
   - For every episode with `audio`, assert file exists at `radio/segments/...`.
   - Assert no broken relative paths in local references from `episodes.json` and blog body markdown links.
   - Assert no malformed feed URLs (e.g. accidental double slashes in enclosure path after domain).
   - Add anchor integrity check for `/#ep-<id>` links in `feed.xml` against actual episode IDs.

## P1 (high value, next)

4. **HTML link smoke checks**
   - Parse `index.html` and verify key local links resolve:
     - `posts/episodes.json`
     - `feed.xml`
     - `radio/`
     - `pepper-avatar.png`
   - Validate RSS `<link rel="alternate" ... href="/feed.xml">` remains present.

5. **Regression snapshot for feed metadata**
   - Lock expected channel metadata (`title`, `description`, `itunes:image`, category).
   - Catch accidental metadata drift from script edits.

## P2 (nice to have)

6. **CI wiring**
   - Add a single `test:blog` script (Node or Python) that runs all checks locally and in CI.
   - Fail fast with clear per-episode/per-path error output.

7. **Pre-commit guard (optional)**
   - Run P0 checks before commit when `posts/episodes.json` or `feed.xml` changes.

## Suggested implementation order

1) `scripts/validate_episodes.py` (schema + path checks)
2) `scripts/validate_feed.py` (XML + feed assertions)
3) `scripts/test_blog.sh` (single entrypoint)
4) optional GitHub Action / pre-commit hook
