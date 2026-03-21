/**
 * particles.js — Paint splatters (decals), death bursts, muzzle effects.
 * All particles are lightweight meshes with lifetime tracking.
 */
import * as THREE from 'three';

// Shared geometries
const splatGeo = new THREE.PlaneGeometry(0.4, 0.4);
const cubeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);

/**
 * Create a paint splatter decal on a surface.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} position — hit point on surface
 * @param {THREE.Vector3} normal — surface normal
 * @param {number} color — hex color
 * @returns {object} particle object
 */
export function createSplatter(scene, position, normal, color) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.3,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(splatGeo, mat);

  // Random size variation
  const scale = 0.5 + Math.random() * 0.8;
  mesh.scale.set(scale, scale, 1);

  // Position slightly off surface to avoid z-fighting
  mesh.position.copy(position).addScaledVector(normal, 0.02);

  // Orient to face along normal
  const lookTarget = position.clone().add(normal);
  mesh.lookAt(lookTarget);

  // Random rotation around normal
  mesh.rotateZ(Math.random() * Math.PI * 2);

  scene.add(mesh);

  return {
    mesh,
    type: 'splatter',
    lifetime: 30, // splatters last a long time
    age: 0,
    velocity: null,
    alive: true,
  };
}

/**
 * Create a death burst: 10 small cubes flying outward.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} position
 * @param {number} color — hex color
 * @returns {object[]} array of particle objects
 */
export function createDeathBurst(scene, position, color) {
  const particles = [];

  for (let i = 0; i < 10; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 1.0,
    });

    const mesh = new THREE.Mesh(cubeGeo, mat);
    mesh.position.copy(position);

    // Random scale
    const s = 0.5 + Math.random() * 1.5;
    mesh.scale.set(s, s, s);

    // Random outward velocity
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      Math.random() * 6 + 2,
      (Math.random() - 0.5) * 8
    );

    // Random initial rotation
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    scene.add(mesh);

    particles.push({
      mesh,
      type: 'burst',
      lifetime: 1.0 + Math.random() * 0.5,
      age: 0,
      velocity,
      alive: true,
      gravity: -12,
    });
  }

  return particles;
}

/**
 * Update all particles: move, age, fade, remove expired.
 * @param {object[]} particles — mutable array
 * @param {number} dt — delta time
 * @param {THREE.Scene} scene
 */
export function updateParticles(particles, dt, scene) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (!p.alive) {
      // Clean up
      scene.remove(p.mesh);
      p.mesh.material.dispose();
      particles.splice(i, 1);
      continue;
    }

    p.age += dt;

    if (p.age >= p.lifetime) {
      p.alive = false;
      continue;
    }

    // Animate burst particles
    if (p.type === 'burst' && p.velocity) {
      // Apply gravity
      if (p.gravity) {
        p.velocity.y += p.gravity * dt;
      }

      p.mesh.position.addScaledVector(p.velocity, dt);

      // Spin
      p.mesh.rotation.x += dt * 5;
      p.mesh.rotation.z += dt * 3;

      // Fade out in last 30% of life
      const fadeStart = p.lifetime * 0.7;
      if (p.age > fadeStart) {
        const fadeProgress = (p.age - fadeStart) / (p.lifetime - fadeStart);
        p.mesh.material.opacity = 1.0 - fadeProgress;
      }

      // Floor bounce
      if (p.mesh.position.y < 0.05) {
        p.mesh.position.y = 0.05;
        p.velocity.y = Math.abs(p.velocity.y) * 0.3;
        p.velocity.x *= 0.8;
        p.velocity.z *= 0.8;
      }
    }
  }
}
