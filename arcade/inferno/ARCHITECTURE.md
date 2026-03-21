# Pepper's Inferno — Architecture Document
# PLANNER output. Executors read this, never modify it.

## Overview
A Doom-style first-person shooter in the browser. Vibrant, colorful, but still bloody/violent.
Think Doom meets Splatoon: bright neon enemies, paint-splatter blood, satisfying gunplay.
Built with Three.js for 3D rendering. Runs entirely in-browser, no server needed.

## Tech Stack
- **Three.js** (r170+) via CDN — 3D rendering, raycasting, scene management
- Vanilla JavaScript (ES6+)
- HTML5 + CSS for HUD overlay
- Web Audio API for SFX
- No build step, no npm, loads from CDN

## Visual Style
- Retro FPS feel: fast movement, no reloading, circle-strafing
- Bright, saturated colors: neon pink enemies, electric blue projectiles, toxic green health pickups
- Paint-splatter gore: enemies burst into colorful paint splatters on walls/floor (decals)
- Low-poly blocky environments (think Minecraft meets Doom)
- Simple geometric enemies: cubes, spheres, pyramids with glowing eyes
- Post-processing: slight bloom on projectiles and pickups

## File Structure
```
arcade/inferno/
├── ARCHITECTURE.md
├── REFERENCE.md
├── TASKS/
│   ├── 01-engine.md     — Three.js setup, FPS controls, level loading
│   ├── 02-combat.md     — Weapons, enemies, projectiles, hit detection
│   ├── 03-levels.md     — Level generation, pickups, doors, progression
│   └── 04-polish.md     — HUD, sounds, particles, title screen, polish
├── index.html           — game shell, Three.js CDN, HUD overlay
├── css/
│   └── game.css         — HUD styling, menus, crosshair
├── js/
│   ├── engine.js        — Three.js init, game loop, FPS controls, physics
│   ├── level.js         — Level generator: rooms, corridors, walls, floors
│   ├── player.js        — Player: movement, health, ammo, camera
│   ├── weapons.js       — Weapon system: shooting, projectiles, effects
│   ├── enemies.js       — Enemy types, AI, spawning, death effects
│   ├── pickups.js       — Health, ammo, keys, power-ups
│   ├── particles.js     — Paint splatter, explosions, muzzle flash
│   ├── audio.js         — Procedural SFX (Web Audio API)
│   ├── hud.js           — HUD: health bar, ammo, minimap, messages
│   └── game.js          — Game state, wave system, scoring, progression
├── assets/              — (empty, all geometry is procedural)
└── tests/
    ├── test.html
    └── tests.js
```

## Game Design

### Core Loop
1. Player spawns in a room
2. Enemies spawn in waves
3. Kill all enemies to unlock the exit door
4. Collect pickups (health, ammo) between waves
5. Enter door → next level (harder, more enemies, new enemy types)
6. Survive as long as possible, score = kills + levels cleared

### Player
- First-person camera with mouse look (pointer lock)
- WASD movement, fast and responsive (Doom speed, not CoD speed)
- Space to jump (low gravity, floaty)
- Health: starts at 100, max 200 with overheal
- No fall damage
- Auto-heal 1hp/sec when above 0

### Weapons (3 types, switch with 1-2-3 or scroll)
1. **Splat Pistol** — fast, accurate, low damage. Infinite ammo. Fires neon pellets.
2. **Paint Cannon** — shotgun spread, high damage close range. Uses ammo. Fires paint blobs.
3. **Goo Launcher** — explosive projectile, splash damage, area paint. Uses ammo. Fires arcing goo balls.

### Enemies (4 types)
1. **Blob** — slow, melee, low HP. Pink cube that hops toward you. Bursts into pink paint on death.
2. **Spitter** — medium range, fires projectiles. Blue sphere with red eye. Fires slow blue orbs.
3. **Charger** — fast, charges at player. Green pyramid. Leaves green paint trail. High damage on contact.
4. **Tank** — slow, tanky, fires explosive shots. Large purple cube. Takes many hits.

### Level Generation
- Rooms are rectangular with varying sizes (10-20 units)
- Connected by corridors (2-3 units wide)
- Walls are colorful blocks (different color per level)
- Floor has grid pattern
- Each level: 3-5 rooms connected linearly
- Exit door in last room (glowing, locked until all enemies dead)
- Pickups placed in corridors and room corners

### Collision System
- Player collides with walls (simple AABB)
- Projectiles collide with walls (disappear + decal) and enemies (damage + splatter)
- Enemy projectiles collide with player (damage) and walls

### Coordinate System
- Three.js default: Y-up, units roughly = meters
- Player height: 1.7 units (camera at eye level)
- Room walls: 3 units tall
- Grid-based level layout for collision simplicity

## Build Phases
1. **01-engine**: Three.js setup, pointer lock FPS controls, basic room, movement + collision
2. **02-combat**: Weapon system, projectiles, enemy spawning + AI + death, hit detection
3. **03-levels**: Level generator, multiple rooms, doors, pickups, wave progression
4. **04-polish**: HUD, title screen, death screen, SFX, particles, paint splatters, bloom, scoring
