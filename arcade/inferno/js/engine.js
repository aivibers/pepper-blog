/**
 * engine.js — Entry point for Pepper's Inferno.
 * Three.js init, game loop, resize handler. Imports and coordinates all modules.
 */
import * as THREE from 'three';
import { createRoom } from './level.js';
import { createPlayer } from './player.js';
import { initHUD, showHUD, updateHUD } from './hud.js';
import { WEAPONS, fireWeapon } from './weapons.js';
import { spawnEnemy, updateEnemies, damageEnemy, removeEnemy } from './enemies.js';
import { createSplatter, createDeathBurst, updateParticles } from './particles.js';

// ── Game state ──
const gameState = {
  screen: 'title', // title | playing
  enemies: [],
  projectiles: [],
  particles: [],
  damageFlash: 0,
};

// ── Three.js setup ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0a2e);
scene.fog = new THREE.Fog(0x1a0a2e, 20, 50);

const camera = new THREE.PerspectiveCamera(
  90,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.getElementById('game-container').appendChild(renderer.domElement);

// ── Level ──
const level = createRoom(scene);

// ── Player ──
const player = createPlayer(camera, renderer.domElement);

// ── HUD ──
initHUD();

// ── Damage flash overlay ──
const damageOverlay = document.createElement('div');
damageOverlay.style.cssText = `
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(255, 0, 0, 0); pointer-events: none; z-index: 999;
  transition: background 0.05s;
`;
document.body.appendChild(damageOverlay);

// ── Title screen ──
const titleScreen = document.getElementById('title-screen');

renderer.domElement.addEventListener('click', () => {
  if (gameState.screen === 'title') {
    gameState.screen = 'playing';
    titleScreen.style.display = 'none';
    showHUD();
    player.requestLock();
    spawnTestEnemies();
  } else if (!player.pointerLocked) {
    player.requestLock();
  }
});

// ── Mouse click → fire weapon ──
let mouseDown = false;
document.addEventListener('mousedown', (e) => {
  if (e.button === 0 && gameState.screen === 'playing' && player.pointerLocked) {
    mouseDown = true;
    tryFire();
  }
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseDown = false;
});

// ── Weapon switching: 1/2/3 keys ──
document.addEventListener('keydown', (e) => {
  if (gameState.screen !== 'playing') return;
  if (e.key === '1') player.state.weapon = 0;
  if (e.key === '2') player.state.weapon = 1;
  if (e.key === '3') player.state.weapon = 2;
});

// ── Weapon switching: scroll wheel ──
document.addEventListener('wheel', (e) => {
  if (gameState.screen !== 'playing' || !player.pointerLocked) return;
  const dir = e.deltaY > 0 ? 1 : -1;
  player.state.weapon = (player.state.weapon + dir + WEAPONS.length) % WEAPONS.length;
});

/**
 * Try to fire the current weapon.
 */
function tryFire() {
  if (gameState.screen !== 'playing' || !player.pointerLocked) return;

  fireWeapon(
    scene,
    camera,
    player.state,
    gameState.enemies,
    gameState.projectiles,
    level.walls,
    onWeaponHit
  );
}

/**
 * Callback when a weapon hit is registered (hitscan).
 * @param {object|null} enemy — enemy hit, or null for wall hit
 * @param {number} damage
 * @param {THREE.Vector3} point — hit point
 * @param {THREE.Vector3} normal — surface normal
 */
function onWeaponHit(enemy, damage, point, normal) {
  const weapon = WEAPONS[player.state.weapon];

  if (enemy) {
    // Damage the enemy
    const killed = damageEnemy(enemy, damage);
    // Splatter at hit point
    gameState.particles.push(createSplatter(scene, point, normal, enemy.color));

    if (killed) {
      onEnemyDeath(enemy);
    }
  } else {
    // Wall hit — paint splatter
    gameState.particles.push(createSplatter(scene, point, normal, weapon.color));
  }
}

/**
 * Handle enemy death: burst + splatters + cleanup.
 */
function onEnemyDeath(enemy) {
  const pos = enemy.mesh.position.clone();

  // Death burst particles
  const burstParticles = createDeathBurst(scene, pos, enemy.color);
  gameState.particles.push(...burstParticles);

  // Floor splatter
  const floorNormal = new THREE.Vector3(0, 1, 0);
  gameState.particles.push(createSplatter(scene, pos.clone().setY(0.01), floorNormal, enemy.color));

  // Remove mesh from scene
  removeEnemy(scene, enemy);
}

/**
 * Spawn test enemies for initial combat testing.
 */
function spawnTestEnemies() {
  const positions = [
    new THREE.Vector3(-5, 0, -5),
    new THREE.Vector3(5, 0, -7),
    new THREE.Vector3(0, 0, -8),
  ];

  for (const pos of positions) {
    const enemy = spawnEnemy(scene, 'blob', pos);
    gameState.enemies.push(enemy);
  }
}

// ── Resize handler ──
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Gravity constant for projectile arcing ──
const PROJECTILE_GRAVITY = -9.8;

// ── Game loop ──
let lastTime = 0;

function gameLoop(time) {
  requestAnimationFrame(gameLoop);

  const dt = Math.min((time - lastTime) / 1000, 0.05); // cap delta to avoid spiral
  lastTime = time;

  if (gameState.screen === 'playing') {
    // ── Player update ──
    player.update(dt, level.walls);

    // ── Auto-fire if mouse held (for pistol rapid fire) ──
    if (mouseDown) tryFire();

    // ── Update enemies ──
    const enemyResult = updateEnemies(
      gameState.enemies,
      player.position,
      dt,
      scene,
      gameState.projectiles
    );

    // ── Player takes damage from enemies ──
    if (enemyResult.playerDamage > 0) {
      player.state.health -= enemyResult.playerDamage;
      gameState.damageFlash = 0.3;
    }

    // ── Damage flash ──
    if (gameState.damageFlash > 0) {
      gameState.damageFlash -= dt;
      const alpha = Math.max(0, gameState.damageFlash / 0.3) * 0.4;
      damageOverlay.style.background = `rgba(255, 0, 0, ${alpha})`;
    } else {
      damageOverlay.style.background = 'rgba(255, 0, 0, 0)';
    }

    // ── Update projectiles ──
    updateProjectiles(dt);

    // ── Update particles ──
    updateParticles(gameState.particles, dt, scene);

    // ── Auto-heal (1hp/sec) ──
    if (player.state.health > 0 && player.state.health < 100) {
      player.state.health = Math.min(100, player.state.health + dt);
    }

    // ── Update HUD ──
    updateHUD(player.state);
  }

  renderer.render(scene, camera);
}

/**
 * Update all active projectiles: move, collide walls, collide enemies/player.
 */
function updateProjectiles(dt) {
  for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
    const proj = gameState.projectiles[i];
    if (!proj.alive) {
      scene.remove(proj.mesh);
      proj.mesh.material.dispose();
      gameState.projectiles.splice(i, 1);
      continue;
    }

    proj.age += dt;

    // Max lifetime
    if (proj.age > 5) {
      proj.alive = false;
      continue;
    }

    // Apply gravity for arcing projectiles (goo launcher)
    if (proj.weapon.gravity || (proj.isEnemyProjectile === false && proj.weapon === WEAPONS[2])) {
      // Only apply gravity to goo launcher projectiles
    }
    if (!proj.isEnemyProjectile && proj.weapon.gravity) {
      proj.velocity.y += PROJECTILE_GRAVITY * dt;
    }

    // Move projectile
    proj.mesh.position.addScaledVector(proj.velocity, dt);
    const projPos = proj.mesh.position;

    if (proj.isEnemyProjectile) {
      // ── Enemy projectile: check player hit ──
      const distToPlayer = projPos.distanceTo(player.position);
      if (distToPlayer < 0.6) {
        player.state.health -= proj.damage;
        gameState.damageFlash = 0.3;
        proj.alive = false;

        // Splatter
        const normal = new THREE.Vector3(0, 1, 0);
        gameState.particles.push(createSplatter(scene, projPos.clone(), normal, proj.weapon.color));
        continue;
      }
    } else {
      // ── Player projectile: check enemy hit ──
      for (const enemy of gameState.enemies) {
        if (!enemy.alive) continue;
        const dist = projPos.distanceTo(enemy.mesh.position);
        if (dist < enemy.size * 0.7) {
          // Direct hit
          const killed = damageEnemy(enemy, proj.weapon.damage);
          const hitNormal = projPos.clone().sub(enemy.mesh.position).normalize();
          gameState.particles.push(createSplatter(scene, projPos.clone(), hitNormal, proj.weapon.color));

          if (killed) {
            onEnemyDeath(enemy);
          }

          // Splash damage (goo launcher)
          if (proj.weapon.splash > 0) {
            for (const other of gameState.enemies) {
              if (!other.alive || other === enemy) continue;
              const splashDist = projPos.distanceTo(other.mesh.position);
              if (splashDist < proj.weapon.splashRadius) {
                const splashKill = damageEnemy(other, proj.weapon.splash);
                if (splashKill) onEnemyDeath(other);
              }
            }
          }

          proj.alive = false;
          continue;
        }
      }
    }

    // ── Wall collision (AABB check against each wall) ──
    if (proj.alive) {
      for (const wall of level.walls) {
        const box = new THREE.Box3().setFromObject(wall);
        if (box.containsPoint(projPos)) {
          proj.alive = false;
          // Wall splatter
          const normal = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getCenter(center);
          normal.copy(projPos).sub(center).normalize();
          gameState.particles.push(createSplatter(scene, projPos.clone(), normal, proj.weapon.color));

          // Splash damage for goo on wall impact
          if (!proj.isEnemyProjectile && proj.weapon.splash > 0) {
            for (const enemy of gameState.enemies) {
              if (!enemy.alive) continue;
              const splashDist = projPos.distanceTo(enemy.mesh.position);
              if (splashDist < proj.weapon.splashRadius) {
                const killed = damageEnemy(enemy, proj.weapon.splash);
                if (killed) onEnemyDeath(enemy);
              }
            }
          }
          break;
        }
      }
    }

    // ── Floor collision ──
    if (proj.alive && projPos.y < 0.05) {
      proj.alive = false;
      const normal = new THREE.Vector3(0, 1, 0);
      gameState.particles.push(createSplatter(scene, projPos.clone().setY(0.01), normal, proj.weapon.color));

      // Splash damage for goo on floor impact
      if (!proj.isEnemyProjectile && proj.weapon.splash > 0) {
        for (const enemy of gameState.enemies) {
          if (!enemy.alive) continue;
          const splashDist = projPos.distanceTo(enemy.mesh.position);
          if (splashDist < proj.weapon.splashRadius) {
            const killed = damageEnemy(enemy, proj.weapon.splash);
            if (killed) onEnemyDeath(enemy);
          }
        }
      }
    }
  }
}

requestAnimationFrame(gameLoop);
