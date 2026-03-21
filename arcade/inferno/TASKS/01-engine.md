# Task 01: Three.js Engine + FPS Controls + Basic Room

## READ FIRST
- ARCHITECTURE.md — full design (READ-ONLY)
- REFERENCE.md — Three.js patterns, conventions (READ-ONLY)

## Deliverables
1. `index.html` — game shell with Three.js importmap, HUD overlay div, game container
2. `css/game.css` — crosshair, HUD styling, title screen overlay, pointer lock prompt
3. `js/engine.js` — Three.js init, game loop (requestAnimationFrame with delta time), resize handler. Imports and coordinates all modules.
4. `js/player.js` — FPS camera with pointer lock mouse look, WASD movement, jump, gravity, wall collision (AABB), player state (health, ammo, position, velocity)
5. `js/level.js` — Simple room generator: creates a box room with floor, walls, ceiling using Three.js BoxGeometry. One room for now. Returns wall meshes for collision.
6. `js/hud.js` — Basic HUD: crosshair (CSS centered dot), health number, ammo count. DOM-based overlay, not canvas.
7. `tests/test.html` + `tests/tests.js` — Tests for: AABB collision math, player movement vectors, level room dimensions

## Specifications

### index.html
- importmap pointing three to CDN
- div#game-container for renderer
- div#hud-overlay for HUD elements (position: fixed, pointer-events: none)
- div#crosshair (centered dot)
- div#title-screen with "PEPPER'S INFERNO" and "Click to Start"
- Dark background #1a0a2e

### Player Controls
- Pointer lock on click (hide title screen, start game)
- Mouse: look (yaw/pitch with sensitivity 0.002, clamp pitch)
- WASD: move relative to camera facing (forward/back/strafe)
- Space: jump (only when grounded)
- Move speed: 8 units/sec, sprint (Shift): 12 units/sec
- Jump velocity: 6 units/sec, gravity: -15 units/sec²
- Player radius: 0.4 units for collision
- Camera at Y=1.7 (eye height)

### Basic Room
- Floor: 20x20 units, colored plane (COLORS.floor)
- Walls: 4 walls, 3 units tall, (COLORS.wall)
- Ceiling: optional (can be open sky with fog)
- One point light in center (warm white), ambient light (dim)
- Scene fog matching background color

### Module System
- Use ES modules (import/export)
- engine.js is the entry point, imports player.js, level.js, hud.js
- Game loop in engine.js calls player.update(dt), hud.update(state)

## Validation
Open in browser. You should:
1. See title screen "PEPPER'S INFERNO"
2. Click → pointer locks, you're in a room
3. WASD to move, mouse to look, Space to jump
4. Can't walk through walls
5. Crosshair visible in center
6. Health/ammo HUD visible

Commit: "inferno: pass 01 — Three.js engine, FPS controls, basic room, HUD"
