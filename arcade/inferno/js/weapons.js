/**
 * weapons.js — Weapon definitions, projectile creation, and firing logic.
 * Three weapon types: hitscan pistol, spread cannon, arcing launcher.
 */
import * as THREE from 'three';

// ── Weapon definitions ──
export const WEAPONS = [
  {
    name: 'SPLAT PISTOL',
    damage: 10,
    fireRate: 5,        // shots per second
    spread: 0,
    ammoKey: null,      // infinite ammo
    color: 0xffff00,    // yellow
    projectileSpeed: 0, // hitscan
    pellets: 1,
    splash: 0,
    splashRadius: 0,
    gravity: false,
  },
  {
    name: 'PAINT CANNON',
    damage: 8,
    fireRate: 1,
    spread: 15,         // degrees spread cone
    ammoKey: 'paintCannon',
    color: 0xff4444,    // red
    projectileSpeed: 0, // hitscan (instant pellets)
    pellets: 8,
    splash: 0,
    splashRadius: 0,
    gravity: false,
  },
  {
    name: 'GOO LAUNCHER',
    damage: 50,
    fireRate: 0.5,
    spread: 0,
    ammoKey: 'gooLauncher',
    color: 0x44ffaa,    // teal
    projectileSpeed: 15,
    pellets: 1,
    splash: 30,
    splashRadius: 2,
    gravity: true,      // arcing projectile
  },
];

// Shared geometry for projectiles
const projectileGeo = new THREE.SphereGeometry(0.12, 8, 6);

/**
 * Create a projectile mesh and add to scene.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} origin
 * @param {THREE.Vector3} direction — normalized
 * @param {object} weapon — from WEAPONS array
 * @returns {{ mesh, velocity, weapon, alive, age }}
 */
export function createProjectile(scene, origin, direction, weapon) {
  const mat = new THREE.MeshStandardMaterial({
    color: weapon.color,
    emissive: weapon.color,
    emissiveIntensity: 2.0,
  });
  const mesh = new THREE.Mesh(projectileGeo, mat);
  mesh.position.copy(origin);
  scene.add(mesh);

  const velocity = direction.clone().multiplyScalar(weapon.projectileSpeed);

  return {
    mesh,
    velocity,
    weapon,
    alive: true,
    age: 0,
    isEnemyProjectile: false,
  };
}

// ── Raycaster for hitscan ──
const _ray = new THREE.Raycaster();
const _dir = new THREE.Vector3();
const _origin = new THREE.Vector3();

// Cooldown tracking per weapon index
const lastFireTime = [0, 0, 0];

/**
 * Fire the current weapon.
 * Handles hitscan (pistol/cannon) and projectile (launcher).
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {object} playerState — player.state
 * @param {object[]} enemies — active enemy objects
 * @param {object[]} projectiles — active projectile array (push into)
 * @param {THREE.Mesh[]} walls — wall meshes for raycasting
 * @param {function} onHit — callback(enemy, damage, hitPoint, hitNormal) for hit effects
 * @returns {boolean} true if weapon fired
 */
export function fireWeapon(scene, camera, playerState, enemies, projectiles, walls, onHit) {
  const now = performance.now() / 1000;
  const weaponIndex = playerState.weapon;
  const weapon = WEAPONS[weaponIndex];

  // Cooldown check
  const cooldown = 1 / weapon.fireRate;
  if (now - lastFireTime[weaponIndex] < cooldown) return false;

  // Ammo check
  if (weapon.ammoKey) {
    if (playerState.ammo[weapon.ammoKey] <= 0) return false;
    playerState.ammo[weapon.ammoKey]--;
  }

  lastFireTime[weaponIndex] = now;

  // Get camera forward direction
  camera.getWorldDirection(_dir);

  if (weapon.projectileSpeed > 0) {
    // ── Projectile weapon (Goo Launcher) ──
    _origin.copy(camera.position);
    const proj = createProjectile(scene, _origin, _dir, weapon);
    projectiles.push(proj);
    return true;
  }

  // ── Hitscan weapons (Pistol / Cannon) ──
  const pelletCount = weapon.pellets;
  const spreadRad = (weapon.spread * Math.PI) / 180;

  // Gather enemy meshes for raycasting
  const enemyMeshes = enemies.filter(e => e.alive).map(e => e.mesh);

  // Combine walls + enemy meshes for intersection
  const targets = [...walls, ...enemyMeshes];

  for (let i = 0; i < pelletCount; i++) {
    // Apply spread
    const dir = _dir.clone();
    if (spreadRad > 0) {
      // Random spread within cone
      const angle = Math.random() * spreadRad;
      const rotation = Math.random() * Math.PI * 2;

      // Create perpendicular axes
      const up = Math.abs(dir.y) < 0.99
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0);
      const right = new THREE.Vector3().crossVectors(dir, up).normalize();
      const actualUp = new THREE.Vector3().crossVectors(right, dir).normalize();

      // Deflect direction within spread cone
      dir.addScaledVector(right, Math.sin(angle) * Math.cos(rotation));
      dir.addScaledVector(actualUp, Math.sin(angle) * Math.sin(rotation));
      dir.normalize();
    }

    _ray.set(camera.position, dir);
    _ray.far = 100;
    const hits = _ray.intersectObjects(targets, false);

    if (hits.length > 0) {
      const hit = hits[0];
      const hitObject = hit.object;

      // Check if we hit an enemy
      const enemy = enemies.find(e => e.alive && e.mesh === hitObject);
      if (enemy && onHit) {
        onHit(enemy, weapon.damage, hit.point, hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0));
      } else if (onHit) {
        // Hit a wall — just create a splatter
        const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);
        // Transform normal from object space to world space
        normal.transformDirection(hitObject.matrixWorld);
        onHit(null, 0, hit.point, normal);
      }
    }
  }

  return true;
}
