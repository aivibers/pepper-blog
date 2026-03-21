# Task 03: First Playable Case — The Museum Heist

## READ FIRST
- Read ARCHITECTURE.md for case data format and game flow
- Read REFERENCE.md for conventions
- Read ALL existing js/ files to understand current implementation
- Do NOT modify ARCHITECTURE.md, REFERENCE.md, or TASKS/

## Deliverables
1. `js/cases.js` — case definitions array with Museum Heist as first case
2. Update `js/engine.js` — wire up case loading, scene generation with characters, accusation logic
3. Update `js/ui.js` — clue panel interaction, accusation flow, win/lose screens
4. Update `tests/tests.js` — case validation tests

## Specifications

### js/cases.js
Array of case objects. For now, just case 1:

**Case 1: The Museum Heist**
- Title: "The Museum Heist"
- Briefing: "A priceless painting has vanished from the East Wing of the Grand Gallery. Security cameras caught nothing. The thief is still among the visitors. Find them before they slip away."
- Scene type: 'museum', 18 characters
- Culprit attributes: hat='beret', hatColor='#8B0000' (dark red), glasses=true, holdingItem='tube'
- Clues:
  1. "Witnesses say the thief wore a dark red beret" (hat check)
  2. "Security noticed someone with glasses near the painting" (glasses check)
  3. "A cylindrical object was seen being carried out" (holdingItem check)
  4. "A guard recalls seeing a blue coat in the area" (RED HERRING — multiple characters may have blue shirts)
  5. "The suspect was last seen near the east wall" (FLAVOR — no attribute check, just narrows search area)

### Engine Updates (js/engine.js)

**loadCase(index)**:
- Get case from cases array
- Create seeded RNG from case seed (use case index * 1000 + 42)
- Generate scene using createScene(case.scene.type, rng)
- Generate characters using character slots from scene:
  - Pick one random slot for the culprit, create with culprit overrides
  - Fill remaining slots with random characters
  - Ensure no other character accidentally matches ALL non-red-herring clues (regenerate if collision)
- Store in gameState: currentCase, scene, characters

**handleSceneClick(worldX, worldY)**:
- hitTest against characters
- If hit: setState({ selectedCharacter: character, screen: STATES.INSPECT })
- If miss: brief "Nothing here..." status message

**handleAccusation(character)**:
- Check character against all non-red-herring, non-flavor clues
- If all match: case solved! setState({ screen: STATES.SOLVED, score: score + stars * 100 })
- If not all match: lose a star. If stars === 0: setState({ screen: STATES.FAILED })
- Show feedback: which clues matched and which didn't

### UI Updates (js/ui.js)

**Clue Panel** (during SCENE/INSPECT states):
- List all clues with bullet indicators
- Unchecked clues: ◇ dimmed
- When inspecting a suspect, highlight clues that match: ◆ bright green
- Clues that don't match: ◆ dim red
- Red herring clues always show as ◇ (never confirmed)

**Suspect Info Panel** (during INSPECT state):
- Show character description (from describeCharacter)
- Show visual highlight around selected character on canvas
- "Accuse" button (orange, prominent)
- "Back" button (dismiss, return to SCENE)

**Accusation Feedback**:
- Correct: celebration text, star count, "Next Case →" button
- Wrong: shake animation on clue panel, star removal animation, auto-return to SCENE after 2s

**Case Flow**:
- Title → click → Briefing (case 1) → click → Scene active
- Solve → next case briefing (or victory if last case)
- Fail → "Try Again?" → reload same case with same seed

### Tests
- Case 1 data validates: exactly one character matches all real clues
- Accusation logic: correct character returns true
- Accusation logic: random character with 2/3 matching clues returns false
- Star decrements on wrong accusation
- Game over triggers at 0 stars

## Validation
Open index.html. Full flow should work:
1. Title screen → click
2. "The Museum Heist" briefing → click
3. Museum scene with ~18 characters visible
4. Click characters to inspect them
5. See clue matching in real-time
6. Accuse the right one → Case Solved
7. Accuse wrong one → lose a star
