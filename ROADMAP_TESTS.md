# ROADMAP_TESTS.md

Lightweight, prioritized test roadmap for Pepper blog morning follow-up.

_Last reviewed: 2026-03-29 (morning maintenance — 83 episodes, 82 audio present (ep 082 missing TTS), feed.xml regenerated to 83 items. FAIL: ep 082 audio missing (not auto-fixable — needs TTS). Fixed: ep 051 blogPost reverted to JSON string again (5th occurrence) — re-parsed to dict. blogPost string bug is a persistent pipeline issue.)_

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
| 2026-03-29 | ep 051 blogPost reverted to JSON string (5th occurrence) | Re-parsed to dict; root cause still in episode creation pipeline |
| 2026-03-29 | feed.xml had 81 items despite 83 episodes in episodes.json | Regenerated feed.xml — now 83 items |
| 2026-03-29 | ep 082 audio file missing (Late Night Dispatch Mar 28) | Flagged — needs TTS generation |

## Known issues (not auto-fixable)

- **~~18 missing audio files (052-058, 060-070):~~** ✅ Resolved as of 2026-03-28.
- **ep 082 missing audio:** `082-late-night-dispatch-2026-03-28.mp3` not on disk. Episode exists in episodes.json and feed.xml but has no playable audio. Needs TTS generation.
- **blogPost string serialization:** The ep 051 blogPost bug has recurred 5 times (last fix: 2026-03-29). Root cause is in the episode creation pipeline double-serializing blogPost. Needs pipeline-level fix. Consider pre-commit hook or generation-time assertion. This WILL recur until the pipeline is fixed.
- **Untracked `about/` page:** New about page exists but not yet committed. Should be reviewed and committed when ready.
