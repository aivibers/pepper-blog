# Task 02: Character Generator + Scene Builder + Renderer

## READ FIRST
- Read ARCHITECTURE.md for full system design
- Read REFERENCE.md for coding conventions, palette, pixel art patterns
- Read existing code in js/engine.js, js/renderer.js, js/ui.js to understand current state
- Do NOT modify ARCHITECTURE.md, REFERENCE.md, or TASKS/

## Deliverables
1. `js/characters.js` — character factory that generates randomized pixel art people
2. `js/scenes.js` — scene builder that creates layered room environments
3. Update `js/renderer.js` — integrate character and scene drawing into render pipeline
4. Update `tests/tests.js` — add tests for character generation and scene building

## Specifications

### js/characters.js

**createCharacter(rng, slot, overrides)** — factory function
- `rng`: seeded RNG function
- `slot`: { x, y } world position for this character
- `overrides`: partial attribute object (used for culprit to force specific traits)
- Returns: character object with all attributes + bounding box + draw data

Character attributes (randomized from PALETTE unless overridden):
- skinTone: index into PALETTE.skin
- hairColor: from PALETTE.hair
- hairStyle: 'short' | 'long' | 'bald' | 'ponytail'
- hat: null | 'beret' | 'tophat' | 'cap' | 'beanie'
- hatColor: from PALETTE.clothing (only if hat !== null)
- glasses: true | false
- shirtColor: from PALETTE.clothing
- pantsColor: from PALETTE.clothing
- holdingItem: null | 'book' | 'cup' | 'phone' | 'bag' | 'tube' | 'umbrella' | 'flower'
- facialHair: null | 'beard' | 'mustache'
- accessory: null | 'scarf' | 'necklace' | 'badge'

**drawCharacter(ctx, character, scale)** — draws a character at their world position
- Character is ~24px tall (in pixel units), ~12px wide
- Draw order: legs → body → arms → held item → head → hair → hat → glasses → facial hair
- Each part is a few colored rectangles using drawPixelRect
- Characters should be visually distinct and readable at game zoom

**describeCharacter(character)** — returns human-readable description string
- "A person with brown hair wearing a red beret, glasses, and a blue shirt. They're holding a book."

### js/scenes.js

**createScene(type, rng)** — builds a complete scene
- `type`: 'museum' | 'kitchen' | 'library'
- Returns: { layers: [...], characterSlots: [...], name: string }

Each scene type defines:
- **background layer**: floor pattern, walls, ceiling (large rectangles)
- **furniture layer**: type-specific furniture items at fixed positions
- **object layer**: clutter items scattered around furniture (small decorative elements)
- **foreground layer**: anything that draws on top of characters (overhanging shelves, etc.)

Museum scene elements:
- Marble floor (checkerboard pattern, light grey/white)
- Walls with wainscoting (dark lower, lighter upper)
- Painting frames on walls (colored rectangles with gold borders)
- Display cases (glass-topped tables)
- Benches in the center
- Pillars
- Rope barriers
- 18 character slots spread around the room

Kitchen scene elements:
- Tile floor (grid pattern)
- Stainless steel counters
- Stove/oven shapes
- Hanging pots/pans
- Shelving with ingredients (colorful small rectangles)
- Central prep table
- 16 character slots

Library scene elements:
- Wood floor (warm brown)
- Tall bookshelves (with colorful book spines)
- Reading desks with lamps
- Armchairs
- Card catalog
- Globe on a stand
- 18 character slots

**drawScene(ctx, scene, layerName, scale)** — draws one layer of the scene

### Renderer Updates
- render() for SCENE state now: draws background layer → furniture layer → object layer → characters (sorted by y) → foreground layer
- Characters sorted by y-position so lower characters draw on top (depth sorting)

### Tests
- createCharacter with seed produces deterministic character
- createCharacter with overrides applies them correctly
- createScene produces correct number of character slots
- Two characters from same seed + different slots have different positions
- Character bounding boxes don't exceed world bounds

## Validation
Open index.html. Hack gameState to skip to SCENE state with a test case. You should see:
- A detailed room environment
- 15-20 distinct characters scattered around
- Characters are visually distinguishable from each other and the background
