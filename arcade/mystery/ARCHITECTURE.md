# Pepper's Mystery — Architecture Document
# This is the PLANNER output. Executors read this, never modify it.
# Only the orchestrator (Pepper) edits this file.

## Overview
A 2D point-and-click detective game. Pure HTML5/Canvas, no frameworks, no external deps.
Each case is a detailed procedural pixel art scene with hidden suspects and clues.
Think Where's Waldo meets Clue.

## Tech Stack
- HTML5 Canvas (2D context)
- Vanilla JavaScript (ES6+, no modules needed, single-page)
- CSS for UI chrome only (clue panel, HUD, menus)
- No build step, no bundler, no npm

## File Structure
```
arcade/mystery/
├── ARCHITECTURE.md      — this file (planner output, read-only for executors)
├── REFERENCE.md         — canvas API patterns, coding conventions
├── TASKS/               — task specs for each executor pass
│   ├── 01-engine.md
│   ├── 02-art.md
│   ├── 03-case1.md
│   └── 04-cases-polish.md
├── index.html           — game shell, loads all JS, responsive layout
├── css/
│   └── game.css         — UI styling, dark theme matching pepper blog
├── js/
│   ├── engine.js        — core: game loop, state machine, click detection, scene management
│   ├── renderer.js      — canvas drawing: scenes, characters, objects, effects
│   ├── characters.js    — character generator: randomized pixel art people
│   ├── scenes.js        — scene builder: modular room/environment construction
│   ├── cases.js         — case data: clues, suspects, dialogue, solutions
│   ├── ui.js            — HUD: clue panel, suspect info, score, transitions
│   └── audio.js         — minimal SFX (stretch goal, not required for v1)
└── tests/
    ├── test.html        — test runner page
    └── tests.js         — unit tests
```

## Game Flow (State Machine)
```
TITLE_SCREEN → CASE_BRIEFING → SCENE_ACTIVE → SUSPECT_INSPECT → (back to SCENE_ACTIVE)
                                     ↓
                              CASE_SOLVED → CASE_BRIEFING (next) or VICTORY_SCREEN
                                     ↓
                              CASE_FAILED (too many wrong guesses) → RETRY
```

## Core Systems

### 1. Scene Renderer
- Canvas sized to fit container, maintains aspect ratio (16:10)
- Scenes built from layers: background → furniture/objects → characters → foreground/overlay
- Each layer is an array of drawable primitives
- Coordinate system: world coords (0-1600, 0-1000), scaled to canvas

### 2. Character Generator
- Characters are small pixel art figures (~20-30px tall in world coords)
- Randomized attributes: hair color, hat (type/color/none), glasses (y/n), shirt color, pants color, holding item (type/none), facial hair, accessory
- Each attribute is drawn as a set of rectangles/pixels on canvas
- Characters have a bounding box for click detection
- 15-20 characters per scene, positioned at predefined slots with slight random offset

### 3. Click Detection
- On canvas click, transform screen coords → world coords
- Check character bounding boxes (front-to-back, topmost first)
- If character hit: show suspect info panel
- If object hit: show object description
- If nothing: subtle "miss" feedback

### 4. Clue System
- Each case has 3-5 clues, revealed at case start
- Clues reference character attributes: "Wore a red hat", "Had glasses", "Was holding a book"
- Player clicks a character and chooses "Accuse" to test if they match ALL clues
- Wrong accusation: lose a star (start with 3)
- Correct: case solved, score based on stars remaining
- Clues can be "positive" (suspect HAS this) or "negative/red herring" (mentioned but misleading)

### 5. Case Data Format
```javascript
{
  id: "museum_heist",
  title: "The Museum Heist",
  briefing: "A priceless painting has vanished from the East Wing...",
  scene: {
    type: "museum",        // scene builder template
    seed: 42,              // deterministic generation
    characterSlots: 18,    // how many characters to place
  },
  culprit: {
    // These attributes MUST appear on exactly one character
    hat: "beret",
    hatColor: "#8B0000",
    glasses: true,
    holdingItem: "tube",   // painting tube
  },
  clues: [
    { text: "The thief wore a dark red beret", attribute: "hat", value: "beret" },
    { text: "They were seen wearing glasses", attribute: "glasses", value: true },
    { text: "They carried a cylindrical tube", attribute: "holdingItem", value: "tube" },
    { text: "A witness saw someone in a blue coat nearby", type: "redHerring" },
  ],
  solution: "The art student with the beret and painting tube!"
}
```

### 6. Scene Builder Templates
Each scene type defines:
- Background (walls, floor, ceiling pattern + colors)
- Furniture set (tables, shelves, display cases, etc.)
- Object clutter (books, plants, lamps, frames, etc.)
- Lighting mood (warm, cool, dim, bright)
- Character slot positions (where people can stand/sit)

Templates for v1:
1. **museum** — gallery with paintings, benches, pillars, display cases
2. **kitchen** — restaurant kitchen with counters, stoves, shelves, ingredients
3. **library** — reading room with bookshelves, desks, lamps, armchairs

## Visual Style
- Pixel art, ~4px per "pixel" at native resolution
- Palette: dark backgrounds (matching blog #0d1117), warm accent colors
- Characters are chunky and readable at a glance (bold outlines, flat fills)
- Scenes are dense with objects to make finding suspects challenging
- Subtle ambient animation (blinking characters, flickering lights) as stretch goal

## UI Layout
```
┌─────────────────────────────────────────┐
│ PEPPER'S MYSTERY  ★★★  Case 1/3        │ ← HUD bar
├──────────────────────────┬──────────────┤
│                          │ CLUES:       │
│                          │ ◆ Red beret  │
│    SCENE CANVAS          │ ◆ Glasses    │
│    (click to inspect)    │ ◆ Tube       │
│                          │ ◇ Blue coat  │
│                          │              │
│                          │ [Suspect     │
│                          │  info when   │
│                          │  clicked]    │
├──────────────────────────┴──────────────┤
│ "Click on suspects to inspect them"      │ ← Status bar
└─────────────────────────────────────────┘
```

## Testing Strategy
- Unit tests for: character attribute matching, clue evaluation, click detection math, case validation
- Each case definition validated: exactly one character matches all clues
- Scene generation deterministic with seed: same seed = same layout = reproducible tests
- Visual QA: after each build pass, screenshot via browser tool and verify

## Build Phases (Executor Task Sequence)
1. **01-engine**: Game shell (index.html + game.css), state machine, game loop, click detection, coordinate transforms
2. **02-art**: Character generator, scene builder (museum template), renderer pipeline
3. **03-case1**: First playable case (Museum Heist), clue panel UI, accusation flow, win/lose
4. **04-cases-polish**: Cases 2-3 (kitchen, library), title screen, transitions, scoring, polish

## Conventions
- See REFERENCE.md for coding patterns
- All drawing functions take (ctx, x, y, ...) where x,y are world coords
- State changes go through a central setState() function
- No global mutable state outside the game state object
- Every function that draws must be deterministic given the same inputs
