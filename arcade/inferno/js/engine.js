/**
 * engine.js — Entry point for Pepper's Inferno.
 * Three.js init, game loop, resize handler. Imports and coordinates all modules.
 */
import * as THREE from 'three';
import { generateLevel } from './level.js';
import { createPlayer } from './player.js';
import { initHUD, showHUD, hideHUD, updateHUD } from './hud.js';
import { WEAPONS, fireWeapon } from './weapons.js';
import { spawnEnemy, updateEnemies, damageEnemy, removeEnemy } from './enemies.js';
import { createSplatter, createDeathBurst, updateParticles } from './particles.js';
import { createPickup, updatePickups, checkPickupCollision, cleanupPickups } from './pickups.js';
import { progression, getEnemyCount, getEnemyTypes, addScore, addKill, nextLevel, resetProgression } from './game.js';
import { playSound } from './audio.js';

// ── Game state ──
const gameState = {
  screen: 'title', // title | playing | dead
  enemies: [],
  projectiles: [],
  particles: [],
  pickups: [],
  damageFlash: 0,
  doorUnlocked: false,
};

// ── Screen shake state ──
const shake = {
  active: false,
  timer: 0,
  intensity: 0,
};

// ── Weapon bob state ──
const weaponBob = {
  time: 0,
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

// ── Level (generated on start) ──
let level = null;

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

// ── Level transition overlay ──
const levelOverlay = document.createElement('div');
levelOverlay.id = 'level-transition-overlay';
levelOverlay.style.cssText = `
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0); pointer-events: none; z-index: 998;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Courier New', monospace; font-size: 3rem; font-weight: bold;
  color: #44ffaa; text-shadow: 0 0 20px rgba(68,255,170,0.8);
  opacity: 0; transition: opacity 0.3s;
`;
document.body.appendChild(levelOverlay);

// ── Level flash overlay (white flash on level transition) ──
const levelFlash = document.createElement('div');
levelFlash.className = 'level-flash';
document.body.appendChild(levelFlash);

// ── Death screen overlay ──
const deathScreen = document.createElement('div');
deathScreen.id = 'death-screen';
deathScreen.innerHTML = `
  <div class="death-title">YOU DIED</div>
  <div class="death-stats">
    <div class="death-stat">SCORE: <span id="death-score">0</span></div>
    <div class="death-stat">KILLS: <span id="death-kills">0</span></div>
    <div class="death-stat">LEVEL: <span id="death-level">1</span></div>
  </div>
  <div class="death-prompt">Click to Restart</div>
`;
document.body.appendChild(deathScreen);

// ── Title screen ──
const titleScreen = document.getElementById('title-screen');

document.addEventListener('click', () => {
  if (gameState.screen === 'title') {
    gameState.screen = 'playing';
    titleScreen.style.display = 'none';
    showHUD();
    player.requestLock();
    startLevel(progression.level);
  } else if (gameState.screen === 'dead') {
    // Restart game
    deathScreen.classList.remove('active');
    resetProgression();
    player.state.health = 100;
    player.state.ammo.paintCannon = 20;
    player.state.ammo.gooLauncher = 5;
    player.state.weapon = 0;
    gameState.screen = 'playing';
    showHUD();
    player.requestLock();
    startLevel(1);
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
 * Start or restart a level: generate geometry, spawn enemies, place pickups.
 * @param {number} levelNum
 */
function startLevel(levelNum) {
  // Cleanup previous level
  if (level) {
    level.cleanup();
  }
  // Clean up old enemies
  for (const enemy of gameState.enemies) {
    if (enemy.alive) removeEnemy(scene, enemy);
  }
  gameState.enemies = [];

  // Clean up old projectiles
  for (const proj of gameState.projectiles) {
    scene.remove(proj.mesh);
    proj.mesh.material.dispose();
  }
  gameState.projectiles = [];

  // Clean up old pickups
  cleanupPickups(scene, gameState.pickups);
  gameState.pickups = [];

  // Reset door state
  gameState.doorUnlocked = false;

  // Generate new level
  level = generateLevel(scene, levelNum);

  // Move player to start position
  player.position.copy(level.playerStart);
  camera.position.copy(level.playerStart);

  // Spawn enemies
  const enemyCount = getEnemyCount(levelNum);
  const availableTypes = getEnemyTypes(levelNum);

  for (let i = 0; i < enemyCount; i++) {
    // Distribute enemies across spawn points
    const spawnIdx = i % Math.max(level.spawnPoints.length, 1);
    const basePos = level.spawnPoints.length > 0
      ? level.spawnPoints[spawnIdx].clone()
      : new THREE.Vector3(5, 0, -5);

    // Jitter position so they don't stack
    basePos.x += (Math.random() - 0.5) * 3;
    basePos.z += (Math.random() - 0.5) * 3;

    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const enemy = spawnEnemy(scene, type, basePos);
    gameState.enemies.push(enemy);
  }

  // Place pickups
  for (let i = 0; i < level.pickupPoints.length; i++) {
    const pos = level.pickupPoints[i];
    const type = i % 2 === 0 ? 'health' : 'ammo';
    const pickup = createPickup(scene, type, pos);
    gameState.pickups.push(pickup);
  }
}

/**
 * Transition to the next level with a brief flash.
 */
function advanceLevel() {
  nextLevel();

  // Trigger white level flash
  levelFlash.classList.add('active');
  setTimeout(() => levelFlash.classList.remove('active'), 400);

  // Show level transition text
  levelOverlay.textContent = `LEVEL ${progression.level}`;
  levelOverlay.style.opacity = '1';
  levelOverlay.style.background = 'rgba(0, 0, 0, 0.6)';

  setTimeout(() => {
    startLevel(progression.level);
    setTimeout(() => {
      levelOverlay.style.opacity = '0';
      levelOverlay.style.background = 'rgba(0, 0, 0, 0)';
    }, 800);
  }, 600);
}

/**
 * Show the death screen.
 */
function showDeathScreen() {
  gameState.screen = 'dead';
  hideHUD();
  document.exitPointerLock();

  document.getElementById('death-score').textContent = progression.score;
  document.getElementById('death-kills').textContent = progression.kills;
  document.getElementById('death-level').textContent = progression.level;

  deathScreen.classList.add('active');
}

/**
 * Trigger screen shake.
 * @param {number} intensity — max pixel offset
 * @param {number} duration — seconds
 */
function triggerShake(intensity, duration) {
  shake.active = true;
  shake.timer = duration;
  shake.intensity = intensity;
}

/**
 * Try to fire the current weapon.
 */
function tryFire() {
  if (gameState.screen !== 'playing' || !player.pointerLocked || !level) return;

  const fired = fireWeapon(
    scene,
    camera,
    player.state,
    gameState.enemies,
    gameState.projectiles,
    level.walls,
    onWeaponHit
  );

  if (fired) {
    // Play weapon fire sound
    const weaponIndex = player.state.weapon;
    const soundMap = ['pistol', 'cannon', 'launcher'];
    playSound(soundMap[weaponIndex]);
  }
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
    const killed = damageEnemy(enemy, damage);
    gameState.particles.push(createSplatter(scene, point, normal, enemy.color));

    playSound('enemyHit');

    if (killed) {
      onEnemyDeath(enemy);
    }
  } else {
    gameState.particles.push(createSplatter(scene, point, normal, weapon.color));
  }
}

/**
 * Handle enemy death: burst + splatters + score + cleanup.
 */
function onEnemyDeath(enemy) {
  const pos = enemy.mesh.position.clone();

  playSound('enemyDeath');

  // Death burst particles
  const burstParticles = createDeathBurst(scene, pos, enemy.color);
  gameState.particles.push(...burstParticles);

  // Floor splatter
  const floorNormal = new THREE.Vector3(0, 1, 0);
  gameState.particles.push(createSplatter(scene, pos.clone().setY(0.01), floorNormal, enemy.color));

  // Score + kill tracking
  const scoreMap = { blob: 100, spitter: 200, charger: 300, tank: 500 };
  addScore(scoreMap[enemy.type] || 100);
  addKill();

  // Remove mesh from scene
  removeEnemy(scene, enemy);
}

// ── Resize handler ──
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Gravity constant for projectile arcing ──
const PROJECTILE_GRAVITY = -9.8;

// Track previous health for damage detection
let prevHealth = 100;

// ── Game loop ──
let lastTime = 0;

function gameLoop(time) {
  requestAnimationFrame(gameLoop);

  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (gameState.screen === 'playing' && level) {
    // ── Player update ──
    player.update(dt, level.walls);

    // ── Auto-fire if mouse held ──
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
      playSound('playerHurt');
      triggerShake(0.15, 0.2);
    }

    // ── Check for death ──
    if (player.state.health <= 0) {
      player.state.health = 0;
      showDeathScreen();
    }

    // ── Damage flash ──
    if (gameState.damageFlash > 0) {
      gameState.damageFlash -= dt;
      const alpha = Math.max(0, gameState.damageFlash / 0.3) * 0.4;
      damageOverlay.style.background = `rgba(255, 0, 0, ${alpha})`;
    } else {
      damageOverlay.style.background = 'rgba(255, 0, 0, 0)';
    }

    // ── Screen shake ──
    if (shake.active) {
      shake.timer -= dt;
      if (shake.timer <= 0) {
        shake.active = false;
      }
    }

    // ── Update projectiles ──
    updateProjectiles(dt);

    // ── Update particles ──
    updateParticles(gameState.particles, dt, scene);

    // ── Update pickups ──
    updatePickups(gameState.pickups, dt);
    const collected = checkPickupCollision(gameState.pickups, player.position, player.state);
    if (collected.length > 0) {
      playSound('pickup');
    }

    // ── Check if all enemies dead → unlock door ──
    const allDead = gameState.enemies.every(e => !e.alive);
    if (allDead && !gameState.doorUnlocked && level.door) {
      gameState.doorUnlocked = true;
      playSound('doorUnlock');
      // Change door from golden to green (unlocked)
      level.door.material.color.setHex(0x44ff44);
      level.door.material.emissive.setHex(0x44ff44);
      level.door.material.emissiveIntensity = 0.8;
    }

    // ── Check player near door → next level ──
    if (gameState.doorUnlocked && level.door) {
      const doorDist = player.position.distanceTo(level.door.position);
      if (doorDist < 2.0) {
        gameState.doorUnlocked = false; // prevent re-trigger
        advanceLevel();
      }
    }

    // ── Auto-heal (1hp/sec) ──
    if (player.state.health > 0 && player.state.health < 100) {
      player.state.health = Math.min(100, player.state.health + dt);
    }

    // ── Weapon bob (sine wave on camera Y while moving) ──
    weaponBob.time += dt * 10;
    const bobAmplitude = 0.03;
    const bobOffset = Math.sin(weaponBob.time) * bobAmplitude;

    // Apply camera position from player (already set by player.update)
    // Then add bob + shake offsets
    let cameraOffsetY = bobOffset;
    let cameraOffsetX = 0;

    // ── Screen shake offset ──
    if (shake.active) {
      const decay = shake.timer / 0.2; // 0.2s duration
      cameraOffsetX = (Math.random() - 0.5) * shake.intensity * decay;
      cameraOffsetY += (Math.random() - 0.5) * shake.intensity * decay;
    }

    camera.position.x += cameraOffsetX;
    camera.position.y += cameraOffsetY;

    // Track health for damage detection in projectiles
    prevHealth = player.state.health;

    // ── Update HUD ──
    updateHUD(player.state, {
      score: progression.score,
      level: progression.level,
      kills: progression.kills,
      enemies: gameState.enemies,
      walls: level ? level.walls : [],
      playerPos: player.position,
    });
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
        playSound('playerHurt');
        triggerShake(0.15, 0.2);
        proj.alive = false;

        const normal = new THREE.Vector3(0, 1, 0);
        gameState.particles.push(createSplatter(scene, projPos.clone(), normal, proj.weapon.color));

        // Check death from projectile
        if (player.state.health <= 0) {
          player.state.health = 0;
          showDeathScreen();
        }
        continue;
      }
    } else {
      // ── Player projectile: check enemy hit ──
      for (const enemy of gameState.enemies) {
        if (!enemy.alive) continue;
        const dist = projPos.distanceTo(enemy.mesh.position);
        if (dist < enemy.size * 0.7) {
          const killed = damageEnemy(enemy, proj.weapon.damage);
          const hitNormal = projPos.clone().sub(enemy.mesh.position).normalize();
          gameState.particles.push(createSplatter(scene, projPos.clone(), hitNormal, proj.weapon.color));

          playSound('enemyHit');

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
    if (proj.alive && level) {
      for (const wall of level.walls) {
        const box = new THREE.Box3().setFromObject(wall);
        if (box.containsPoint(projPos)) {
          proj.alive = false;
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
