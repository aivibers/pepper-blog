# Task 02: Weapons, Enemies, Projectiles, Hit Detection

## READ FIRST
- ARCHITECTURE.md, REFERENCE.md (READ-ONLY)
- ALL existing js/ files

## Deliverables
1. `js/weapons.js` — 3 weapon types, switching, firing, projectile creation
2. `js/enemies.js` — 4 enemy types with AI, spawning, health, death effects
3. `js/particles.js` — Paint splatter decals on walls/floor, death burst particles
4. Update `js/engine.js` — integrate combat loop, collision detection between projectiles/enemies/player
5. Update `js/hud.js` — weapon indicator, damage flash
6. Update `tests/tests.js` — weapon damage calc, enemy HP, collision math

## Weapon Specs
- Splat Pistol: 10 damage, 5 shots/sec, hitscan (raycaster), infinite ammo, yellow pellet trail
- Paint Cannon: 8 pellets x 8 damage (64 max), 1 shot/sec, spread cone 15°, 20 ammo start
- Goo Launcher: 50 direct + 30 splash (2 unit radius), 0.5 shots/sec, arcing projectile, 5 ammo start

## Enemy Specs
- Blob: 30 HP, speed 3, melee 15 damage, pink cube 0.8 units
- Spitter: 50 HP, speed 2, ranged 10 damage (blue orb, speed 8), blue sphere 0.7 units
- Charger: 40 HP, speed 10 (charging), contact 25 damage, green cone 0.6 units
- Tank: 150 HP, speed 1.5, explosive 20+10splash, purple cube 1.2 units

## Enemy AI (simple state machine per enemy)
- IDLE: wait, look at player
- CHASE: move toward player
- ATTACK: in range → attack (melee or fire projectile)
- DEAD: play death burst, spawn paint decal, remove after animation

## Paint Splatters
- On enemy death: spawn 3-5 colored circles on nearby walls/floor (raycasted decals)
- On projectile hit wall: small paint dot in projectile color
- Use Three.js DecalGeometry or simple planes aligned to surface normal

Commit: "inferno: pass 02 — weapons, enemies, AI, projectiles, paint splatters"
