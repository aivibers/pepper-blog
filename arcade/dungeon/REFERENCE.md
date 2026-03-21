# Pepper's Dungeon — Reference Document

## Tile System
```javascript
const TILE_SIZE = 16;     // world units per tile
const SCALE = 3;          // render scale
const ROOM_W = 12;        // interior tiles wide
const ROOM_H = 10;        // interior tiles tall
const RENDER_TILE = TILE_SIZE * SCALE; // 48px per tile on screen

// Room with walls: 14 x 12 tiles total (1-tile border)
const FULL_ROOM_W = ROOM_W + 2;  // 14
const FULL_ROOM_H = ROOM_H + 2;  // 12

// Canvas size to fit one room
const CANVAS_W = FULL_ROOM_W * RENDER_TILE;  // 672px
const CANVAS_H = FULL_ROOM_H * RENDER_TILE;  // 576px
```

## Color Palette
```javascript
const PALETTE = {
  // Dungeon
  floor1: '#2a1f3d',    // dark purple stone
  floor2: '#332847',    // slightly lighter
  wall: '#1a1225',      // very dark
  wallTop: '#3d2f54',   // wall face
  door: '#8B6914',      // wood brown
  doorLocked: '#555555', // gray locked
  stairs: '#ffd700',    // gold
  
  // Player
  playerBody: '#4488ff', // blue tunic
  playerSkin: '#FDBCB4', // skin
  playerSword: '#c0c0c0', // silver
  
  // Enemies
  slime: '#44ff44',      // green
  bat: '#9944ff',        // purple
  skeleton: '#e6e6e6',   // bone white
  boss: '#ff4444',       // demon red
  
  // Items
  potion: '#ff4444',     // red
  gold: '#ffd700',       // gold
  key: '#c0c0c0',        // silver
  swordUpgrade: '#4488ff', // blue
  shield: '#888888',     // gray
  
  // UI
  bg: '#0d1117',
  text: '#e6edf3',
  hud: '#161b22',
  heartFull: '#ff4444',
  heartEmpty: '#333333',
  minimapRoom: '#3d2f54',
  minimapCurrent: '#ffd700',
  minimapUnvisited: '#1a1225',
};
```

## Drawing Helpers
```javascript
function drawTile(ctx, tileX, tileY, color) {
  ctx.fillStyle = color;
  ctx.fillRect(tileX * RENDER_TILE, tileY * RENDER_TILE, RENDER_TILE, RENDER_TILE);
}

function drawSprite(ctx, worldX, worldY, drawFn) {
  const sx = worldX * SCALE;
  const sy = worldY * SCALE;
  drawFn(ctx, sx, sy, SCALE);
}

// Pixel art helper: draw a single "pixel" at scale
function px(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, s, s);
}
```

## State Machine
```javascript
const STATES = { TITLE: 0, PLAYING: 1, ROOM_TRANSITION: 2, PAUSED: 3, DEAD: 4, VICTORY: 5 };

const gameState = {
  screen: STATES.TITLE,
  floor: 1,
  score: 0,
  dungeon: null,      // generated dungeon data
  currentRoom: null,   // {row, col} in dungeon grid
  player: null,
  enemies: [],
  items: [],
  projectiles: [],
};
```

## Input Handling
```javascript
const keys = {};
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

function getMovement() {
  let dx = 0, dy = 0;
  if (keys['w'] || keys['W'] || keys['ArrowUp']) dy = -1;
  if (keys['s'] || keys['S'] || keys['ArrowDown']) dy = 1;
  if (keys['a'] || keys['A'] || keys['ArrowLeft']) dx = -1;
  if (keys['d'] || keys['D'] || keys['ArrowRight']) dx = 1;
  // Normalize diagonal
  if (dx && dy) { dx *= 0.707; dy *= 0.707; }
  return { dx, dy };
}
```

## JavaScript Conventions
- Same as mystery game: const/let, factory functions, explicit state
- Render on requestAnimationFrame (this IS a real-time game, unlike mystery)
- Delta time for all movement
- Canvas cleared and redrawn each frame
- No ES modules (script tags in order, like mystery game)

## Testing
```javascript
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); testsFailed++; } else { testsPassed++; } }
function assertEqual(a, b, msg) { assert(a === b, `${msg}: expected ${b}, got ${a}`); }
```

## Important
- This is a REAL-TIME game — use requestAnimationFrame, not render-on-state-change
- Player and enemies move continuously, not tile-snapped (smooth sub-tile movement)
- Collision is AABB (axis-aligned bounding box), not tile-based
- Room transitions are the only time movement pauses
- Don't use ES modules — plain script tags like the mystery game
