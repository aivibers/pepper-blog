# ROADMAP_TESTS.md

Lightweight, prioritized test roadmap for Pepper blog morning follow-up.

_Last reviewed: 2026-03-27 (morning maintenance — 71 episodes, 18 missing audio files for eps 052-058 + 060-070, feed.xml valid XML with 71 items matching episodes.json. blogPost fields all correct (dict, not string). Only test failures: missing audio files. No new bugs. Untracked `about/` page present.)_

## P0 (do first)

1. **episodes.json schema validation (unit)** ✅ `scripts/validate_episodes.py`
   - Validate required fields per episode: `id`, `title`, `show`, `emoji`, `date`, `audio`, `tags`, `transcript`, `featured`.
   - Validate types and formats:
     - `id`: 3-digit string (e.g. `008`)
     - `date`: `YYYY-MM-DD`
     - `audio`: site-root path (e.g. `/radio/segments/...`), no `..`, and no external URL unless explicitly allowed
     - `tags`: array of non-empty strings
     - `featured`: boolean
   - Validate optional `blogPost` shape when enabled (`subtitle`, `body`).
   - ✅ blogPost type guard (assert dict, not string) — added 2026-03-22.

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

5. **Regression snapshot for feed metadata** ← next up
   - Lock expected channel metadata (`title`, `description`, `itunes:image`, category).
   - Catch accidental metadata drift from script edits.

6. **blogPost type guard** ✅ done 2026-03-22
   - Added to `validate_episodes.py`: assert `blogPost` is `dict` (not `str`) when present.
   - Prevents the serialized-string-instead-of-object bug found in ep 051.
   - ⚠️ Bug recurred 2026-03-23 — need to investigate root cause (likely the episode creation pipeline serializes blogPost as JSON string).

## P2 (nice to have)

7. **CI wiring**
   - Add a single `test:blog` script (Node or Python) that runs all checks locally and in CI.
   - Fail fast with clear per-episode/per-path error output.

8. **Pre-commit guard (optional)**
   - Run P0 checks before commit when `posts/episodes.json` or `feed.xml` changes.
   - Would have caught the recurring blogPost string bug.

9. **Audio generation pipeline health check**
   - Verify that episode creation workflow generates mp3 before setting audio path.
   - Currently 7 episodes (052-058) have audio paths but no files on disk.
   - Consider: don't set `audio` field until mp3 actually exists, or add a "pending" state.

## Suggested implementation order

1) ~~`scripts/validate_episodes.py` (schema + path checks)~~ ✅ done
2) ~~`scripts/validate_feed.py` (XML + feed assertions)~~ ✅ done
3) ~~`scripts/test_blog.sh` (single entrypoint)~~ ✅ done
4) ~~Add blogPost type guard to validate_episodes.py~~ ✅ done 2026-03-22
5) **Investigate blogPost string bug root cause** (recurred 2026-03-23 on ep 051)
6) Regression snapshot for feed metadata (P1 #5)
7) Audio pipeline: don't set `audio` field until mp3 exists
8) optional GitHub Action / pre-commit hook

## Bugs found & fixed

| Date | Issue | Fix |
|------|-------|-----|
| 2026-03-21 | ep 051 `blogPost` was JSON string, not object — blog post wouldn't render | Parsed string to object in episodes.json |
| 2026-03-23 | ep 051 `blogPost` reverted to JSON string (recurrence) | Re-parsed string to object; root cause likely in episode creation pipeline |
| 2026-03-23 | eps 052-058 have audio paths set but no mp3 files on disk | Flagged — needs TTS generation, not an auto-fix |
| 2026-03-26 | ep 051 `blogPost` reverted to JSON string again (4th occurrence) | Re-parsed string to object; root cause is in episode creation pipeline |
| 2026-03-26 | Missing audio count grew from 7 to 18 (eps 052-058, 060-070) | Flagged — new episodes added without TTS generation |

## Known issues (not auto-fixable)

- **18 missing audio files (052-058, 060-070):** Episodes reference mp3 paths that don't exist on disk. Need TTS generation. Tests will fail on path integrity until resolved.
- **blogPost string serialization:** The ep 051 blogPost bug has recurred 4 times (last fix: 2026-03-26). Currently clean as of 2026-03-27. Root cause is in the episode creation pipeline double-serializing blogPost. Needs pipeline-level fix. Consider pre-commit hook or generation-time assertion.
- **Untracked `about/` page:** New about page exists but not yet committed. Should be reviewed and committed when ready.
