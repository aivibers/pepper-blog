# Task 04: Title Screen, Death Screen, SFX, Particles, Polish

## READ FIRST
- ARCHITECTURE.md, REFERENCE.md (READ-ONLY)
- ALL existing js/ files

## Deliverables
1. `js/audio.js` — Procedural SFX using Web Audio API
2. Update `js/hud.js` — polished HUD, minimap, damage direction indicator
3. Update `js/particles.js` — muzzle flash, explosion effects, pickup sparkles
4. Update `js/engine.js` — title screen, death screen, pause menu
5. Update `css/game.css` — screen overlays, transitions
6. Update tests

## Audio (Procedural, no files needed)
- Pistol shot: short high-frequency burst
- Cannon blast: low thump with reverb
- Goo launch: wet splat sound
- Enemy hit: squish
- Enemy death: pop + splatter
- Pickup: bright chime
- Player hurt: grunt
- Door unlock: satisfying click + chime
- Background: low drone ambient (oscillator + filter)

## HUD Polish
- Health bar (not just number): red bar with HP text, pulses when low (<30)
- Ammo display: icon + count for current weapon
- Weapon switcher: 3 slots at bottom, current highlighted
- Kill counter
- Level indicator
- Minimap: top-right corner, simple top-down view of rooms (rectangles), player dot, enemy dots
- Damage direction: red vignette flash from hit direction
- "LEVEL CLEAR" message with fade

## Screens
- Title: "PEPPER'S INFERNO" with animated background (rotating scene), "Click to Play"
- Death: "YOU DIED" with score, kills, levels cleared, "Click to Restart"
- Pause (ESC while playing): "PAUSED" overlay, "Click to Resume"

## Particles
- Muzzle flash: bright yellow/orange sprite flash at gun position, 50ms duration
- Explosions: expanding sphere of particles for goo launcher impact
- Pickup collect: upward sparkle burst in pickup color
- Enemy death: 10-15 small cubes flying outward in enemy color + slow down + fade
- Keep particle count capped (pool of 200 max)

## Final Polish
- Weapon bob while walking (subtle sine wave on camera)
- Screen shake on taking damage
- Enemies flash white briefly when hit
- Smooth camera on death (slow tilt down)
- Performance: ensure 60fps, dispose unused objects

Commit: "inferno: pass 04 — audio, HUD polish, particles, title/death screens, final polish"
