# Task 01: Game Engine + Shell

## READ FIRST
- Read ARCHITECTURE.md for full system design
- Read REFERENCE.md for coding conventions and patterns
- Do NOT modify those files

## Deliverables
1. `index.html` — game shell with canvas, UI layout, script loading
2. `css/game.css` — dark theme UI, responsive layout, clue panel, HUD
3. `js/engine.js` — state machine, game loop, init, setState, canvas resize
4. `js/renderer.js` — coordinate transforms (worldToScreen, screenToWorld), basic render pipeline that clears canvas and calls layer draw functions
5. `js/ui.js` — HUD rendering (stars, case number), clue panel, suspect info panel, status bar messages, title screen, briefing screen
6. `tests/test.html` + `tests/tests.js` — unit tests for: coordinate transforms, hitTest, state transitions, seeded RNG

## Specifications

### index.html
- DOCTYPE html, lang="en"
- Meta viewport for responsive
- Title: "Pepper's Mystery 🔍"
- Link game.css
- Canvas element with id="game-canvas"
- UI overlay div for clue panel (right side)
- HUD bar (top)
- Status bar (bottom)
- Load scripts in order per REFERENCE.md
- Dark background matching blog (#0d1117)

### css/game.css
- Layout per ARCHITECTURE.md UI diagram
- Canvas takes ~70% width, clue panel takes ~30%
- Mobile: stack vertically (canvas on top, clues below)
- Dark theme: #0d1117 bg, #e6edf3 text, #f0883e accent
- Clue items styled as list with bullet indicators
- Panel has subtle border (#30363d) and slight transparency
- Stars in HUD as ★ (filled) and ☆ (empty), gold color

### js/engine.js
- Implements STATES enum and gameState from REFERENCE.md
- setState(patch) function that merges and triggers render
- init() function: sets up canvas, adds click listener, calls setState for TITLE
- Canvas click handler: transforms screen→world, delegates to current screen handler
- Canvas resize handler: maintains 16:10 aspect ratio
- Exports/exposes: gameState, setState, STATES, init, WORLD_W, WORLD_H

### js/renderer.js
- worldToScreen() and screenToWorld() from REFERENCE.md
- mulberry32() seeded RNG from REFERENCE.md
- PIXEL_SIZE constant
- drawPixelRect() helper
- render(state) function that: clears canvas, delegates to screen-specific render function
- hitTest(worldX, worldY, entities) from REFERENCE.md

### js/ui.js
- renderTitle(ctx, state) — "PEPPER'S MYSTERY" title screen with "Click to Start"
- renderBriefing(ctx, state) — case title, briefing text, "Click to Begin"
- renderHUD(state) — updates HUD DOM elements (stars, case number)
- renderCluePanel(state) — updates clue list in DOM
- renderSuspectInfo(state) — shows selected character info, "Accuse" button
- renderStatusBar(message) — updates status text
- renderSolved(ctx, state) — "Case Solved!" with score
- renderFailed(ctx, state) — "Case Failed" with retry option

### tests/
- Test worldToScreen and screenToWorld are inverse operations
- Test hitTest returns correct entity and null on miss
- Test mulberry32 produces deterministic sequence
- Test setState merges correctly
- Test state transitions are valid (can't go from TITLE to SOLVED directly)
- All tests run in browser, results shown on page

## Stub Functions
Create stub functions for systems not yet built:
- `renderScene(ctx, state)` in renderer.js — just draws "Scene goes here" text
- `generateCharacters(caseData, rng)` in a stub at bottom of engine.js — returns empty array
- `generateScene(caseData, rng)` in a stub — returns null

These will be replaced in Task 02.

## Validation
After building, open index.html in a browser. You should see:
1. Title screen with "PEPPER'S MYSTERY" text
2. Click → briefing screen (will show placeholder since no cases yet)
3. Canvas maintains 16:10 ratio on resize
4. Tests page shows all tests passing
