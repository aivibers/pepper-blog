/**
 * pickups.js — Health and ammo pickups that bob up/down and glow.
 */
import * as THREE from 'three';

/**
 * Create a pickup at a position.
 * @param {THREE.Scene} scene
 * @param {'health'|'ammo'} type
 * @param {THREE.Vector3} position
 * @returns {{ mesh: THREE.Group, type: string, collected: boolean, baseY: number }}
 */
export function createPickup(scene, type, position) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.position.y = 0.5;

  if (type === 'health') {
    // Red cross made of two intersecting boxes
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0xff2222,
      emissiveIntensity: 0.6,
    });
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.15), mat);
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), mat);
    group.add(hBar);
    group.add(vBar);
  } else {
    // Ammo: orange box with darker stripe
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff8800,
      emissive: 0xff8800,
      emissiveIntensity: 0.4,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), mat);
    group.add(box);

    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xcc6600,
      emissive: 0xcc6600,
      emissiveIntensity: 0.3,
    });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), stripeMat);
    stripe.position.y = 0.02;
    group.add(stripe);
  }

  // Point light glow
  const glowColor = type === 'health' ? 0xff2222 : 0xff8800;
  const light = new THREE.PointLight(glowColor, 0.5, 4);
  light.position.y = 0.3;
  group.add(light);

  scene.add(group);

  return {
    mesh: group,
    type,
    collected: false,
    baseY: 0.5,
    _light: light,
  };
}

/**
 * Update pickups: sine bob + slow rotation.
 * @param {object[]} pickups
 * @param {number} dt
 */
export function updatePickups(pickups, dt) {
  const time = performance.now() / 1000;
  for (const p of pickups) {
    if (p.collected) continue;
    p.mesh.position.y = p.baseY + Math.sin(time * 2 + p.mesh.position.x) * 0.15;
    p.mesh.rotation.y += dt * 1.5;
  }
}

/**
 * Check pickup collision with player. Apply effects and mark collected.
 * @param {object[]} pickups
 * @param {THREE.Vector3} playerPos
 * @param {object} playerState
 * @returns {object[]} array of collected pickups
 */
export function checkPickupCollision(pickups, playerPos, playerState) {
  const collected = [];
  for (const p of pickups) {
    if (p.collected) continue;
    const dist = playerPos.distanceTo(p.mesh.position);
    if (dist < 1.5) {
      p.collected = true;
      p.mesh.visible = false;

      if (p.type === 'health') {
        playerState.health = Math.min(playerState.maxHealth, playerState.health + 25);
      } else {
        // Ammo: refill both weapon types
        playerState.ammo.paintCannon += 10;
        playerState.ammo.gooLauncher += 3;
      }

      collected.push(p);
    }
  }
  return collected;
}

/**
 * Remove all pickup meshes from scene and dispose.
 * @param {THREE.Scene} scene
 * @param {object[]} pickups
 */
export function cleanupPickups(scene, pickups) {
  for (const p of pickups) {
    scene.remove(p.mesh);
    p.mesh.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
      if (child.isLight) {
        child.dispose();
      }
    });
  }
}
