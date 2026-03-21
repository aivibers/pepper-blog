# ROADMAP_TESTS.md

Lightweight, prioritized test roadmap for Pepper blog morning follow-up.

_Last reviewed: 2026-03-21 (pre-morning maintenance pass — 51 episodes, all audio paths intact, feed.xml valid XML with 51 items, all tests passing. Fixed ep 051 blogPost type bug.)_

## P0 (do first)

1. **episodes.json schema validation (unit)** ✅ `scripts/validate_episodes.py`
   - Validate required fields per episode: `id`, `title`, `show`, `emoji`, `date`, `audio`, `tags`, `transcript`.
   - Validate types and formats:
     - `id`: 3-digit string (e.g. `008`)
     - `date`: `YYYY-MM-DD`
     - `audio`: site-root path (e.g. `/radio/segments/...`), no `..`, and no external URL unless explicitly allowed
     - `tags`: array of non-empty strings
   - Validate optional `blogPost` shape when enabled (`subtitle`, `body`).
   - **TODO:** Add type assertion that `blogPost` is dict, not string (caught ep 051 bug 2026-03-21).

2. **RSS generation validity (integration)** ✅ `scripts/validate_feed.py`
   - Generate `feed.xml` from `posts/episodes.json`.
   - Parse with XML parser (no warnings/errors).
   - Assert item count equals episode count (or documented filter behavior).
   - Assert each item has `title`, `guid`, `pubDate`, `description`, and `enclosure` when audio exists.

3. **Path integrity checks (integration)** ✅ covered by validate_episodes + validate_feed
   - For every episode with `audio`, assert file exists at `radio/segments/...`.
   - Assert no broken relative paths in local references from `episodes.json` and blog body markdown links.
   - Assert no malformed feed URLs (e.g. accidental double slashes in enclosure path after domain).
   - Add anchor integrity check for `/#ep-<id>` links in `feed.xml` against actual episode IDs.

## P1 (high value, next)

4. **HTML link smoke checks** ✅ `scripts/validate_ui.py`
   - Parse `index.html` and verify key local links resolve:
     - `posts/episodes.json`
     - `feed.xml`
     - `radio/`
     - `pepper-avatar.png`
   - Validate RSS `<link rel="alternate" ... href="/feed.xml">` remains present.

5. **Regression snapshot for feed metadata**
   - Lock expected channel metadata (`title`, `description`, `itunes:image`, category).
   - Catch accidental metadata drift from script edits.

6. **blogPost type guard**
   - Add to `validate_episodes.py`: assert `blogPost` is `dict` (not `str`) when present.
   - Prevents the serialized-string-instead-of-object bug found in ep 051.

## P2 (nice to have)

7. **CI wiring**
   - Add a single `test:blog` script (Node or Python) that runs all checks locally and in CI.
   - Fail fast with clear per-episode/per-path error output.

8. **Pre-commit guard (optional)**
   - Run P0 checks before commit when `posts/episodes.json` or `feed.xml` changes.

## Suggested implementation order

1) ~~`scripts/validate_episodes.py` (schema + path checks)~~ ✅ done
2) ~~`scripts/validate_feed.py` (XML + feed assertions)~~ ✅ done
3) ~~`scripts/test_blog.sh` (single entrypoint)~~ ✅ done
4) Add blogPost type guard to validate_episodes.py (next)
5) optional GitHub Action / pre-commit hook

## Bugs found & fixed

| Date | Issue | Fix |
|------|-------|-----|
| 2026-03-21 | ep 051 `blogPost` was JSON string, not object — blog post wouldn't render | Parsed string to object in episodes.json |
