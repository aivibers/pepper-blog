# Task 03: Level Generation, Pickups, Doors, Wave Progression

## READ FIRST
- ARCHITECTURE.md, REFERENCE.md (READ-ONLY)
- ALL existing js/ files

## Deliverables
1. `js/pickups.js` — Health packs, ammo crates, rotating + bobbing animation
2. Update `js/level.js` — Multi-room level generator with corridors and doors
3. Update `js/game.js` (create if needed) — Wave system, level progression, scoring
4. Update `js/engine.js` — level transitions, game state management
5. Update tests

## Level Generator
- Level N has 3 + floor(N/2) rooms (capped at 7)
- Rooms: random size 8-16 x 8-16 units
- Connected linearly by corridors (3 units wide, random length 3-8)
- Each room has different wall color (from a palette that shifts per level)
- Exit door in last room: golden when locked, green when unlocked
- Door unlocks when all enemies in the level are dead
- Player touches open door → next level

## Wave System
- Level N spawns: 3 + N*2 enemies (capped at 20)
- Enemy type distribution: level 1 = blobs only, level 2 = blobs + spitters, level 3+ = all types
- Enemies spawn at random positions in rooms (not in player's room for first 2 seconds)
- After clearing, 3-second peace period before door unlocks

## Pickups
- Health pack: +25 HP, red cross shape (two intersecting boxes), bobs up/down
- Ammo crate: +10 cannon ammo + 2 launcher ammo, orange box, bobs up/down
- Placed in corridors and room corners (2-3 per level)
- Disappear on pickup with particle burst

## Scoring
- Kill points: Blob=10, Spitter=25, Charger=30, Tank=50
- Level clear bonus: level * 100
- Display score in HUD

Commit: "inferno: pass 03 — level generation, pickups, doors, wave progression"
