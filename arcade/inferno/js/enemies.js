/**
 * enemies.js — Enemy types, spawning, AI movement, and damage handling.
 * Four enemy types: blob, spitter, charger, tank.
 */
import * as THREE from 'three';

// ── Enemy type definitions ──
export const ENEMY_TYPES = {
  blob: {
    hp: 30,
    speed: 3,
    damage: 15,
    color: 0xff69b4,
    size: 0.8,
    geometry: 'box',
    attackRange: 1.5,
    attackRate: 1,    // attacks per second
    ranged: false,
  },
  spitter: {
    hp: 50,
    speed: 2,
    damage: 10,
    color: 0x4488ff,
    size: 0.7,
    geometry: 'sphere',
    attackRange: 15,
    attackRate: 0.5,
    ranged: true,
  },
  charger: {
    hp: 40,
    speed: 10,
    damage: 25,
    color: 0x44ff44,
    size: 0.6,
    geometry: 'cone',
    attackRange: 2.0,
    attackRate: 0.3,
    ranged: false,
    chargeSpeed: 18,
    chargeDistance: 12,
  },
  tank: {
    hp: 150,
    speed: 1.5,
    damage: 20,
    color: 0x9944ff,
    size: 1.2,
    geometry: 'box',
    attackRange: 18,
    attackRate: 0.4,
    ranged: true,
  },
};

// Shared geometries
const _geometries = {
  box: null,
  sphere: null,
  cone: null,
};

function getGeometry(type, size) {
  // Create per-type geometries (size varies per type)
  if (type === 'box') return new THREE.BoxGeometry(size, size, size);
  if (type === 'sphere') return new THREE.SphereGeometry(size / 2, 10, 8);
  if (type === 'cone') return new THREE.ConeGeometry(size / 2, size, 8);
  return new THREE.BoxGeometry(size, size, size);
}

// Small sphere geometry for eyes
const eyeGeo = new THREE.SphereGeometry(0.08, 6, 4);

/**
 * Spawn a single enemy.
 * @param {THREE.Scene} scene
 * @param {string} type — key into ENEMY_TYPES
 * @param {THREE.Vector3} position
 * @returns {object} enemy object
 */
export function spawnEnemy(scene, type, position) {
  const def = ENEMY_TYPES[type];
  if (!def) throw new Error(`Unknown enemy type: ${type}`);

  // Main body mesh
  const geo = getGeometry(def.geometry, def.size);
  const mat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.6,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  mesh.position.y = def.size / 2; // sit on floor
  mesh.castShadow = true;
  scene.add(mesh);

  // Glowing eyes
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xff0000,
    emissiveIntensity: 3.0,
  });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-def.size * 0.2, def.size * 0.15, -def.size * 0.45);
  mesh.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(def.size * 0.2, def.size * 0.15, -def.size * 0.45);
  mesh.add(rightEye);

  const enemy = {
    type,
    mesh,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    damage: def.damage,
    color: def.color,
    size: def.size,
    alive: true,
    lastAttack: 0,
    flashTimer: 0,
    // Charger state
    charging: false,
    chargeDir: null,
    chargeTimer: 0,
    // Original material for flash recovery
    _origColor: def.color,
  };

  mesh.userData.enemy = enemy;
  return enemy;
}

// Reusable vectors
const _toPlayer = new THREE.Vector3();
const _moveDir = new THREE.Vector3();

// Projectile geometry for spitter/tank
const _projGeo = new THREE.SphereGeometry(0.15, 6, 4);

/**
 * Create an enemy projectile (for spitter/tank).
 */
function createEnemyProjectile(scene, origin, direction, damage, color) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 2.0,
  });
  const mesh = new THREE.Mesh(_projGeo, mat);
  mesh.position.copy(origin);
  scene.add(mesh);

  const speed = 8;
  return {
    mesh,
    velocity: direction.clone().multiplyScalar(speed),
    damage,
    alive: true,
    age: 0,
    isEnemyProjectile: true,
    weapon: { color, splash: 0, splashRadius: 0 },
  };
}

/**
 * Update all enemies: AI, movement, attack.
 * @param {object[]} enemies
 * @param {THREE.Vector3} playerPos
 * @param {number} dt
 * @param {THREE.Scene} scene
 * @param {object[]} projectiles — push enemy projectiles here
 * @returns {{ playerDamage: number }} damage to deal to player this frame
 */
export function updateEnemies(enemies, playerPos, dt, scene, projectiles) {
  let playerDamage = 0;
  const now = performance.now() / 1000;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    // ── Flash timer (damage feedback) ──
    if (enemy.flashTimer > 0) {
      enemy.flashTimer -= dt;
      if (enemy.flashTimer <= 0) {
        enemy.mesh.material.color.setHex(enemy._origColor);
        enemy.mesh.material.emissive.setHex(0x000000);
        enemy.mesh.material.emissiveIntensity = 0;
      }
    }

    // Direction to player
    _toPlayer.copy(playerPos).sub(enemy.mesh.position);
    _toPlayer.y = 0; // keep on ground plane
    const distToPlayer = _toPlayer.length();
    _toPlayer.normalize();

    const def = ENEMY_TYPES[enemy.type];

    // ── Charger special behavior ──
    if (enemy.type === 'charger') {
      if (enemy.charging) {
        // Continue charging
        enemy.mesh.position.addScaledVector(enemy.chargeDir, def.chargeSpeed * dt);
        enemy.chargeTimer -= dt;

        // Hit player during charge?
        const chargeDist = enemy.mesh.position.distanceTo(playerPos);
        if (chargeDist < enemy.size + 0.5) {
          playerDamage += enemy.damage;
          enemy.charging = false;
          enemy.lastAttack = now;
        }

        // End charge
        if (enemy.chargeTimer <= 0) {
          enemy.charging = false;
        }
        // Face charge direction
        enemy.mesh.lookAt(
          enemy.mesh.position.x + enemy.chargeDir.x,
          enemy.mesh.position.y,
          enemy.mesh.position.z + enemy.chargeDir.z
        );
        continue;
      }

      // Start charge when in range
      if (distToPlayer < def.chargeDistance && now - enemy.lastAttack > 1 / def.attackRate) {
        enemy.charging = true;
        enemy.chargeDir = _toPlayer.clone();
        enemy.chargeTimer = 0.6; // charge duration
        enemy.lastAttack = now;
        continue;
      }
    }

    // ── Movement toward player ──
    if (distToPlayer > def.attackRange * 0.8) {
      _moveDir.copy(_toPlayer);
      enemy.mesh.position.addScaledVector(_moveDir, enemy.speed * dt);
    }

    // Face player
    enemy.mesh.lookAt(
      playerPos.x,
      enemy.mesh.position.y,
      playerPos.z
    );

    // ── Attack ──
    if (distToPlayer < def.attackRange && now - enemy.lastAttack > 1 / def.attackRate) {
      enemy.lastAttack = now;

      if (def.ranged) {
        // Fire projectile at player
        const projOrigin = enemy.mesh.position.clone();
        projOrigin.y += enemy.size * 0.3;
        const projDir = new THREE.Vector3()
          .copy(playerPos)
          .sub(projOrigin)
          .normalize();
        const proj = createEnemyProjectile(scene, projOrigin, projDir, enemy.damage, enemy.color);
        projectiles.push(proj);
      } else {
        // Melee attack
        if (distToPlayer < def.attackRange) {
          playerDamage += enemy.damage;
        }
      }
    }
  }

  return { playerDamage };
}

/**
 * Damage an enemy. Flash white, return true if killed.
 * @param {object} enemy
 * @param {number} damage
 * @returns {boolean} true if enemy died
 */
export function damageEnemy(enemy, damage) {
  if (!enemy.alive) return false;

  enemy.hp -= damage;
  enemy.flashTimer = 0.1;
  enemy.mesh.material.color.setHex(0xffffff);
  enemy.mesh.material.emissive.setHex(0xffffff);
  enemy.mesh.material.emissiveIntensity = 1.5;

  if (enemy.hp <= 0) {
    enemy.alive = false;
    return true;
  }
  return false;
}

/**
 * Remove a dead enemy from the scene and dispose resources.
 * @param {THREE.Scene} scene
 * @param {object} enemy
 */
export function removeEnemy(scene, enemy) {
  scene.remove(enemy.mesh);
  enemy.mesh.geometry.dispose();
  enemy.mesh.material.dispose();
  // Dispose eye meshes
  for (const child of enemy.mesh.children) {
    child.geometry.dispose();
    child.material.dispose();
  }
}
