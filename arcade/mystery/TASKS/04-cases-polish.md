# Task 04: Cases 2-3 + Polish

## READ FIRST
- Read ARCHITECTURE.md for full design
- Read REFERENCE.md for conventions
- Read ALL existing js/ files — the game should be fully playable with Case 1 at this point
- Do NOT modify ARCHITECTURE.md, REFERENCE.md, or TASKS/

## Deliverables
1. Update `js/cases.js` — add cases 2 and 3
2. Update `js/scenes.js` — add kitchen and library scene templates
3. Update `js/ui.js` — title screen polish, victory screen, transitions
4. Update `js/engine.js` — case progression, final score, replay
5. Update `tests/tests.js` — validate all cases
6. General polish pass across all files

## Specifications

### Case 2: The Missing Recipe
- Title: "The Missing Recipe"
- Briefing: "Chef Bernard's legendary soufflé recipe has disappeared from the kitchen safe. One of the staff took it. The kitchen is chaos — find the thief before service starts."
- Scene type: 'kitchen', 16 characters
- Culprit: hat='cap' (chef's cap, white), holdingItem='book' (recipe book), accessory='badge' (staff badge), shirtColor (white, chef's whites)
- Clues:
  1. "The recipe was in a small leather-bound book" (holdingItem=book)
  2. "Only staff wear ID badges in the kitchen" (accessory=badge)
  3. "They were wearing a white chef's cap" (hat=cap, hatColor=white)
  4. "Someone mentioned seeing red shoes" (RED HERRING)

### Case 3: The Library Whisper
- Title: "The Library Whisper"
- Briefing: "A rare first edition has been slipped off the shelf and hidden somewhere in the reading room. The librarian noticed it missing during the afternoon check. The culprit is still here, pretending to read."
- Scene type: 'library', 18 characters
- Culprit: glasses=false (unusual in a library), holdingItem='bag' (hiding the book), facialHair='mustache', shirtColor (dark, to blend in)
- Clues:
  1. "The suspect was NOT wearing glasses — unusual for a bookworm" (glasses=false)
  2. "They had a large bag — big enough to hide a book" (holdingItem=bag)
  3. "A distinctive mustache was noticed" (facialHair=mustache)
  4. "They were sitting near the window" (FLAVOR)
  5. "Someone saw a person in green leave the rare books section" (RED HERRING)

### Scene Templates (js/scenes.js)

**Kitchen**:
- Tile floor (light grey checkerboard)
- Stainless steel counters (metallic grey rectangles along walls)
- Large stove/range (dark with orange "burner" dots)
- Hanging rack with pots (circles on hooks from ceiling)
- Central prep island (large table)
- Shelving with colorful ingredient containers
- Sink area
- 16 character slots (around counters, at stations, near door)

**Library**:
- Warm wood floor (brown tones)
- Tall bookshelves along walls (dark frames, colorful book spines in rows)
- Reading tables with small green desk lamps
- Comfortable armchairs (rounded shapes)
- Card catalog (grid of small drawers)
- Large arched windows (light rectangles with mullions)
- 18 character slots (at desks, in armchairs, near shelves, at catalog)

### Polish

**Title Screen**:
- "PEPPER'S MYSTERY" in large pixel-style text (drawn on canvas)
- Magnifying glass icon (simple circle + line)
- "🔍 Click to Start" prompt
- Subtle animated dots or stars in background

**Case Transitions**:
- Brief fade between screens (CSS opacity transition on overlay div)
- Case number indicator: "Case 1 of 3"

**Victory Screen** (after all 3 cases):
- "ALL CASES SOLVED!"
- Total score
- Star rating (based on total stars remaining)
- "Play Again" button (resets everything)

**Scoring**:
- Each case: stars_remaining * 100 points
- Perfect game: 3 cases × 3 stars × 100 = 900 points
- Display total on victory screen

**General Polish**:
- Smooth canvas clear (slight fade rather than hard clear)
- Character highlight glow when selected (colored rectangle outline)
- Clue panel animations (slide in, fade)
- Consistent font sizes across all text rendering
- Mobile touch support (should already work since we use click events)

### Tests
- Case 2 validates: exactly one culprit match
- Case 3 validates: exactly one culprit match
- Case progression: completing case 1 loads case 2
- Victory triggers after case 3 solved
- Score calculation correct
- Replay resets all state

## Validation
Full playthrough:
1. Title → Case 1 (Museum) → Solve → Case 2 (Kitchen) → Solve → Case 3 (Library) → Solve → Victory
2. Fail a case → retry works
3. All three scenes are visually distinct
4. Clue system works correctly for all cases
5. Score tallies properly
6. Mobile layout doesn't break
