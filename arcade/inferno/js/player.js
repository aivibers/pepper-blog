/**
 * player.js — FPS player: pointer-lock mouse look, WASD movement, jump, gravity, wall collision.
 */
import * as THREE from 'three';

const MOVE_SPEED = 8;
const SPRINT_SPEED = 12;
const JUMP_VELOCITY = 6;
const GRAVITY = -15;
const PLAYER_RADIUS = 0.4;
const EYE_HEIGHT = 1.7;
const MOUSE_SENSITIVITY = 0.002;

/**
 * Create the player controller.
 * @param {THREE.PerspectiveCamera} camera
 * @param {HTMLElement} domElement — the renderer canvas
 * @returns player object with update(), state, and helpers
 */
export function createPlayer(camera, domElement) {
  let yaw = 0;
  let pitch = 0;
  let velocityY = 0;
  let grounded = false;

  const position = new THREE.Vector3(0, EYE_HEIGHT, 0);
  camera.position.copy(position);

  // ── Input state ──
  const keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
  let pointerLocked = false;

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = true;
    if (k === ' ' || k === 'space') keys.space = true;
    if (k === 'shift') keys.shift = true;
  }

  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = false;
    if (k === ' ' || k === 'space') keys.space = false;
    if (k === 'shift') keys.shift = false;
  }

  function onMouseMove(e) {
    if (!pointerLocked) return;
    yaw -= e.movementX * MOUSE_SENSITIVITY;
    pitch -= e.movementY * MOUSE_SENSITIVITY;
    pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
  }

  function onPointerLockChange() {
    pointerLocked = document.pointerLockElement === domElement;
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  /**
   * Request pointer lock (called from engine on click).
   */
  function requestLock() {
    domElement.requestPointerLock();
  }

  /**
   * AABB wall collision — push player out of walls.
   * @param {THREE.Vector3} pos — player position (mutated)
   * @param {THREE.Mesh[]} walls
   */
  function collideWalls(pos, walls) {
    for (const wall of walls) {
      // Compute world AABB
      const box = new THREE.Box3().setFromObject(wall);
      // Expand by player radius
      box.expandByScalar(PLAYER_RADIUS);

      // Check if player XZ is inside expanded box (ignore Y for wall collision)
      const testPoint = new THREE.Vector3(pos.x, wall.position.y, pos.z);
      if (box.containsPoint(testPoint)) {
        const center = new THREE.Vector3();
        box.getCenter(center);
        const diff = testPoint.clone().sub(center);

        // Push out along the shortest axis
        const overlapX = (box.max.x - box.min.x) / 2 - Math.abs(diff.x);
        const overlapZ = (box.max.z - box.min.z) / 2 - Math.abs(diff.z);

        if (overlapX < overlapZ) {
          pos.x += diff.x > 0 ? overlapX : -overlapX;
        } else {
          pos.z += diff.z > 0 ? overlapZ : -overlapZ;
        }
      }
    }
  }

  /**
   * Update player each frame.
   * @param {number} dt — delta time in seconds
   * @param {THREE.Mesh[]} walls — wall meshes for collision
   */
  function update(dt, walls) {
    if (!pointerLocked) return;

    // ── Camera rotation ──
    camera.rotation.set(pitch, yaw, 0, 'YXZ');

    // ── Movement direction (relative to camera yaw) ──
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    const moveDir = new THREE.Vector3(0, 0, 0);
    if (keys.w) moveDir.add(forward);
    if (keys.s) moveDir.sub(forward);
    if (keys.a) moveDir.sub(right);
    if (keys.d) moveDir.add(right);

    if (moveDir.lengthSq() > 0) moveDir.normalize();

    const speed = keys.shift ? SPRINT_SPEED : MOVE_SPEED;
    position.x += moveDir.x * speed * dt;
    position.z += moveDir.z * speed * dt;

    // ── Gravity + Jump ──
    if (keys.space && grounded) {
      velocityY = JUMP_VELOCITY;
      grounded = false;
    }

    velocityY += GRAVITY * dt;
    position.y += velocityY * dt;

    // Ground check
    if (position.y <= EYE_HEIGHT) {
      position.y = EYE_HEIGHT;
      velocityY = 0;
      grounded = true;
    }

    // ── Wall collision ──
    collideWalls(position, walls);

    // ── Apply to camera ──
    camera.position.copy(position);
  }

  // Player state (shared with HUD and other systems)
  const state = {
    health: 100,
    maxHealth: 200,
    ammo: { paintCannon: 20, gooLauncher: 5 },
    weapon: 0, // 0=pistol, 1=cannon, 2=launcher
    weaponNames: ['SPLAT PISTOL', 'PAINT CANNON', 'GOO LAUNCHER'],
  };

  function cleanup() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
  }

  return {
    update,
    requestLock,
    state,
    position,
    get pointerLocked() { return pointerLocked; },
    collideWalls,
    cleanup,
    // Expose for testing
    _constants: { MOVE_SPEED, SPRINT_SPEED, JUMP_VELOCITY, GRAVITY, PLAYER_RADIUS, EYE_HEIGHT },
  };
}
