# Pepper's Inferno — Reference Document

## Three.js Patterns

### Scene Setup
```javascript
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0a2e); // dark purple sky
scene.fog = new THREE.Fog(0x1a0a2e, 20, 50); // atmospheric fog

const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.7, 0); // eye height

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.getElementById('game-container').appendChild(renderer.domElement);
```

### FPS Controls (Pointer Lock)
```javascript
// Request pointer lock on click
renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

// Mouse look
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  const sensitivity = 0.002;
  yaw -= e.movementX * sensitivity;
  pitch -= e.movementY * sensitivity;
  pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, pitch));
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
});
```

### AABB Collision
```javascript
function checkWallCollision(position, walls, radius) {
  for (const wall of walls) {
    const box = new THREE.Box3().setFromObject(wall);
    box.expandByScalar(radius);
    if (box.containsPoint(position)) {
      // Push player out of wall
      const center = new THREE.Vector3();
      box.getCenter(center);
      const diff = position.clone().sub(center);
      if (Math.abs(diff.x) > Math.abs(diff.z)) {
        position.x = diff.x > 0 ? box.max.x : box.min.x;
      } else {
        position.z = diff.z > 0 ? box.max.z : box.min.z;
      }
    }
  }
}
```

### Raycasting for Hit Detection
```javascript
const raycaster = new THREE.Raycaster();
raycaster.set(camera.position, camera.getWorldDirection(new THREE.Vector3()));
const hits = raycaster.intersectObjects(enemyMeshes);
if (hits.length > 0) {
  const enemy = hits[0].object.userData.enemy;
  enemy.takeDamage(weapon.damage);
}
```

## Color Palette
```javascript
const COLORS = {
  // Environment
  floor: 0x2a1a3e,      // dark purple
  wall: 0x3d2a5c,       // medium purple
  ceiling: 0x1a0a2e,    // deep purple
  door: 0xffd700,       // gold (locked)
  doorOpen: 0x00ff88,   // green (unlocked)
  
  // Player
  crosshair: 0xffffff,
  muzzleFlash: 0xffaa00,
  
  // Enemies
  blob: 0xff69b4,       // hot pink
  spitter: 0x4488ff,    // electric blue
  charger: 0x44ff44,    // neon green
  tank: 0x9944ff,       // purple
  
  // Projectiles
  pellet: 0xffff00,     // yellow
  paintBlob: 0xff4444,  // red
  goo: 0x44ffaa,        // teal
  
  // Pickups
  health: 0xff4444,     // red cross
  ammo: 0xffaa00,       // orange
  
  // Splatter/gore
  splatPink: 0xff69b4,
  splatBlue: 0x4488ff,
  splatGreen: 0x44ff44,
  splatPurple: 0x9944ff,
};
```

## Game State
```javascript
const gameState = {
  screen: 'title',  // title | playing | paused | dead | victory
  level: 1,
  score: 0,
  kills: 0,
  player: {
    health: 100,
    maxHealth: 200,
    ammo: { paintCannon: 20, gooLauncher: 5 },
    weapon: 0,  // 0=pistol, 1=cannon, 2=launcher
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
  },
  enemies: [],
  projectiles: [],
  pickups: [],
  levelData: null,
  waveCleared: false,
};
```

## JavaScript Conventions
- Same as mystery game: const/let, no classes, factory functions, explicit state
- All Three.js objects tracked for cleanup (dispose geometry + material on scene change)
- Delta time for all movement/animation (frame-rate independent)
- Input state object updated by event listeners, read by game loop

## Performance Budget
- Target 60fps on mid-range hardware
- Max ~100 active objects in scene
- Reuse geometries (one cube geometry for all walls, one for all enemies of same type)
- Object pooling for projectiles and particles
- Dispose removed objects to prevent memory leaks

## File Loading Order (in index.html)
```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"
  }
}
</script>
<script type="module" src="js/engine.js"></script>
<!-- engine.js imports everything else -->
```

## Important: What NOT to Do
- Don't use OrbitControls or any Three.js addon controls — custom FPS controls only
- Don't load external model files — all geometry is procedural (boxes, spheres, cones)
- Don't use post-processing passes in v1 — keep it simple, add bloom in polish pass
- Don't create new geometries per frame — reuse shared geometry instances
- Don't forget to dispose() when removing objects from scene
