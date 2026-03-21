# Pepper's Dungeon — Architecture Document
# PLANNER output. Executors read this, never modify it.

## Overview
A top-down roguelike dungeon crawler. Procedurally generated rooms, simple combat, item pickups,
escalating difficulty. Pure HTML5 Canvas, same stack as Mystery game. Retro pixel art aesthetic.
Think original Zelda meets Binding of Isaac (simplified).

## Tech Stack
- HTML5 Canvas (2D context)
- Vanilla JavaScript (ES6+, no modules needed)
- CSS for HUD overlay
- No build step, no npm, no external deps

## Visual Style
- Top-down view, tile-based (16x16 pixel tiles at 3x scale = 48px rendered)
- Dark dungeon palette: stone grays, torch oranges, blood reds, magic purples
- Player is a small knight/warrior sprite (pixel art, drawn procedurally)
- Enemies are monsters: slimes, skeletons, bats, boss creatures
- Rooms connected by doors on cardinal walls
- Fog of war: unexplored rooms dimmed on minimap

## File Structure
```
arcade/dungeon/
├── ARCHITECTURE.md
├── REFERENCE.md
├── TASKS/
├── index.html
├── css/game.css
├── js/
│   ├── engine.js    — game loop, state machine, input handling
│   ├── dungeon.js   — procedural dungeon generator (rooms + corridors)
│   ├── player.js    — player: movement, health, attack, inventory
│   ├── enemies.js   — enemy types, AI, spawning, combat
│   ├── items.js     — pickups: health potions, weapons, keys, gold
│   ├── renderer.js  — tile renderer, sprite drawing, camera, effects
│   ├── combat.js    — attack system, damage calc, knockback
│   └── hud.js       — health bar, minimap, inventory, floor counter
└── tests/
    ├── test.html
    └── tests.js
```

## Game Design

### Core Loop
1. Player starts in a room on floor 1
2. Explore rooms, fight enemies, collect items
3. Find the key, unlock the stairs
4. Descend to next floor (harder enemies, bigger dungeon)
5. Survive as long as possible, score = enemies killed + floors cleared + gold

### Dungeon Generation
- Each floor: 5-9 rooms in a grid layout (3x3 max)
- Rooms connected by doors (N/S/E/W walls)
- Room types: normal (enemies), treasure (items), key room (floor key), stairs (exit)
- One key room per floor, one stairs room (locked until key collected)
- Rooms are 12x10 tiles interior (plus 1-tile walls)
- Tile size: 16x16 world units, rendered at 3x scale

### Player
- Top-down 8-directional movement (WASD or arrows)
- Attack: Space or click (swing sword in facing direction)
- 5 hearts (10 HP), display as heart icons
- Sword damage: 2 base, upgradeable
- Movement speed: 3 tiles/sec
- Brief invincibility after taking damage (1 sec, blink)
- Inventory: current weapon, key count, gold count, potions

### Combat
- Melee: player swings sword, hitbox in front for 200ms
- Enemy contact damage: varies by type
- Knockback on hit (both player and enemy)
- Enemies drop gold (always) and sometimes potions

### Enemies (4 types)
1. **Slime** — slow, bounces toward player, 3 HP, 1 damage, green blob
2. **Bat** — fast, erratic movement, 2 HP, 1 damage, purple flyer
3. **Skeleton** — medium speed, charges when in line of sight, 5 HP, 2 damage, white bones
4. **Boss** (floor 3+) — large, slow, high HP (15), 3 damage, fires projectiles, red demon

### Items
- **Health Potion** — restore 2 hearts, red bottle, use immediately on pickup
- **Gold Coin** — +10 score, yellow circle
- **Floor Key** — unlocks stairs, silver key shape, one per floor
- **Sword Upgrade** — +1 damage, appears every 2 floors, blue sword
- **Shield** — reduces damage by 1 for the floor, appears rarely

### Rooms
- **Normal Room**: 2-5 enemies, doors lock until all enemies dead
- **Treasure Room**: no enemies, 2-3 item pickups, always has a potion
- **Key Room**: 1-2 tough enemies guarding the key
- **Stairs Room**: locked door with keyhole, descend to next floor

### Camera
- Camera follows player, centered
- Room transitions: smooth scroll when entering a new room
- Screen size fits one room at a time (no scrolling within room)

## Coordinate System
- Tile coords: (col, row) where 0,0 is top-left of room
- Room interior: 12 wide x 10 tall tiles
- World coords: tileX * 16, tileY * 16
- Screen coords: worldX * scale + cameraOffsetX

## Build Phases
1. **01-engine**: Game shell, tile renderer, player movement, basic room drawing, input
2. **02-dungeon**: Procedural dungeon generator, room transitions, minimap, doors
3. **03-combat**: Enemies, combat system, items/pickups, enemy AI, drops
4. **04-polish**: HUD, floor progression, stairs, boss, title/death screens, sound, effects
