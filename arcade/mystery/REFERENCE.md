# Pepper's Mystery — Reference Document
# Coding conventions and Canvas API patterns for executor agents.
# Read this before writing any code.

## JavaScript Conventions
- ES6+ (const/let, arrow functions, template literals, destructuring)
- No classes. Use plain objects + factory functions.
- No `this` keyword. Pass state explicitly.
- All state lives in a single `gameState` object, mutated only through `setState(patch)`
- Functions are pure where possible. Drawing functions take (ctx, worldX, worldY, ...)
- Use JSDoc comments for any function with non-obvious params

## Canvas Patterns

### Coordinate System
```javascript
// World coords: 0-1600 x 0-1000 (fixed aspect 16:10)
// Screen coords: actual canvas pixels
// Always store positions in world coords. Convert at draw time.

const WORLD_W = 1600;
const WORLD_H = 1000;

function worldToScreen(wx, wy, canvas) {
  const scale = Math.min(canvas.width / WORLD_W, canvas.height / WORLD_H);
  const offsetX = (canvas.width - WORLD_W * scale) / 2;
  const offsetY = (canvas.height - WORLD_H * scale) / 2;
  return { x: wx * scale + offsetX, y: wy * scale + offsetY, scale };
}

function screenToWorld(sx, sy, canvas) {
  const scale = Math.min(canvas.width / WORLD_W, canvas.height / WORLD_H);
  const offsetX = (canvas.width - WORLD_W * scale) / 2;
  const offsetY = (canvas.height - WORLD_H * scale) / 2;
  return { x: (sx - offsetX) / scale, y: (sy - offsetY) / scale };
}
```

### Drawing a Pixel Art Rectangle
```javascript
// "Pixel art" means snapping to a grid. Use PIXEL_SIZE as the grid unit.
const PIXEL_SIZE = 4; // 4 world units per "pixel"

function drawPixelRect(ctx, wx, wy, widthPx, heightPx, color, scale) {
  ctx.fillStyle = color;
  const { x, y } = worldToScreen(wx, wy, ctx.canvas);
  ctx.fillRect(
    Math.round(x),
    Math.round(y),
    Math.round(widthPx * PIXEL_SIZE * scale),
    Math.round(heightPx * PIXEL_SIZE * scale)
  );
}
```

### Click Detection Pattern
```javascript
// Characters store their bounding box in world coords
// { id, x, y, width, height, attributes }

function hitTest(worldX, worldY, entities) {
  // Iterate back-to-front (last drawn = on top = checked first)
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    if (worldX >= e.x && worldX <= e.x + e.width &&
        worldY >= e.y && worldY <= e.y + e.height) {
      return e;
    }
  }
  return null;
}
```

### Seeded Random Number Generator
```javascript
// Deterministic RNG for reproducible scene generation
function mulberry32(seed) {
  let h = seed | 0;
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Usage:
// const rng = mulberry32(42);
// const x = rng(); // always the same sequence for seed 42
```

## Color Palette
```javascript
const PALETTE = {
  // Background / environment
  bg:        '#0d1117',  // blog dark bg
  wall:      '#161b22',  // slightly lighter
  floor:     '#1a1f25',  // floor tone
  accent:    '#f0883e',  // blog orange accent
  
  // UI
  text:      '#e6edf3',  // primary text
  textDim:   '#8b949e',  // secondary text
  panel:     '#161b22',  // panel bg
  panelBorder: '#30363d',
  
  // Characters - skin tones
  skin: ['#FDBCB4', '#E8A87C', '#D08B5B', '#AE7E52', '#82583A', '#5C3D2E'],
  
  // Characters - clothing
  clothing: ['#f0883e', '#f85149', '#7ee787', '#79c0ff', '#d2a8ff', '#ffa657',
             '#8b949e', '#e6edf3', '#484f58', '#da3633'],
  
  // Characters - hair
  hair: ['#1a1a1a', '#4a3728', '#8B4513', '#DAA520', '#D2691E', '#A0522D',
         '#F4A460', '#808080', '#FFFFFF'],
  
  // Scene objects
  wood:      '#8B6914',
  metal:     '#71797E',
  glass:     '#ADD8E6',
  gold:      '#FFD700',
  red:       '#f85149',
  green:     '#7ee787',
  blue:      '#79c0ff',
};
```

## State Machine Pattern
```javascript
// Central state management
const STATES = {
  TITLE: 'title',
  BRIEFING: 'briefing',
  SCENE: 'scene',
  INSPECT: 'inspect',
  SOLVED: 'solved',
  FAILED: 'failed',
  VICTORY: 'victory',
};

// gameState is the single source of truth
let gameState = {
  screen: STATES.TITLE,
  caseIndex: 0,
  stars: 3,
  score: 0,
  currentCase: null,
  scene: null,         // generated scene data
  characters: [],      // generated characters with attributes
  selectedCharacter: null,
  cluesRevealed: [],
};

function setState(patch) {
  Object.assign(gameState, patch);
  render(gameState);    // re-render on every state change
}
```

## Testing Patterns
```javascript
// Simple assertion-based tests, no framework needed
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
  } else {
    testsFailed++;
    console.error('FAIL:', message);
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message}: expected ${expected}, got ${actual}`);
}

// Test case validation
function testCaseHasExactlyOneCulprit(caseData, characters) {
  const matches = characters.filter(c => 
    caseData.clues
      .filter(cl => cl.type !== 'redHerring')
      .every(cl => c.attributes[cl.attribute] === cl.value)
  );
  assertEqual(matches.length, 1, `Case "${caseData.id}" should have exactly 1 culprit`);
}
```

## File Loading Order (in index.html)
```html
<script src="js/engine.js"></script>
<script src="js/renderer.js"></script>
<script src="js/characters.js"></script>
<script src="js/scenes.js"></script>
<script src="js/cases.js"></script>
<script src="js/ui.js"></script>
<!-- engine.js calls init() which starts the game -->
```

## Important: What NOT to Do
- Don't use requestAnimationFrame for a continuous game loop. This is a point-and-click game. Render on state change only.
- Don't add mouse move listeners for hover effects in v1. Click only.
- Don't over-animate. This is a puzzle game, not an action game.
- Don't use external fonts. System fonts only.
- Don't create files outside the arcade/mystery/ directory.
- Don't modify ARCHITECTURE.md or REFERENCE.md.
