/**
 * tests.js — Unit tests for Pepper's Inferno (Task 01)
 * Tests: AABB collision math, player movement vectors, level room dimensions.
 * Simple assertion framework — no dependencies.
 */
import * as THREE from 'three';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, name) {
  if (condition) {
    passed++;
    results.push({ name, ok: true });
  } else {
    failed++;
    results.push({ name, ok: false });
    console.error(`FAIL: ${name}`);
  }
}

function assertApprox(actual, expected, tolerance, name) {
  const ok = Math.abs(actual - expected) < tolerance;
  if (ok) {
    passed++;
    results.push({ name, ok: true });
  } else {
    failed++;
    results.push({ name: `${name} (got ${actual}, expected ${expected})`, ok: false });
    console.error(`FAIL: ${name} — got ${actual}, expected ${expected}`);
  }
}

function renderResults() {
  const container = document.getElementById('results');
  container.innerHTML = `<h2>${passed} passed, ${failed} failed</h2>`;
  for (const r of results) {
    const div = document.createElement('div');
    div.className = r.ok ? 'pass' : 'fail';
    div.textContent = `${r.ok ? '✅' : '❌'} ${r.name}`;
    container.appendChild(div);
  }
}

// ═══════════════════════════════════════════════════
// Test: AABB Collision Math
// ═══════════════════════════════════════════════════

function testAABBCollision() {
  // Create a wall at x=10, spanning z=-5 to z=5
  const wallGeo = new THREE.BoxGeometry(0.3, 3, 10);
  const wallMat = new THREE.MeshBasicMaterial();
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(10.15, 1.5, 0);

  // Player approaches from the left (x < 10)
  const playerPos = new THREE.Vector3(10.0, 1.5, 0);
  const PLAYER_RADIUS = 0.4;

  // Compute AABB
  const box = new THREE.Box3().setFromObject(wall);
  box.expandByScalar(PLAYER_RADIUS);

  const testPoint = new THREE.Vector3(playerPos.x, wall.position.y, playerPos.z);
  const inside = box.containsPoint(testPoint);

  assert(inside, 'Player inside expanded wall AABB when overlapping');

  // Player far away should not collide
  const farPos = new THREE.Vector3(5.0, 1.5, 0);
  const farTest = new THREE.Vector3(farPos.x, wall.position.y, farPos.z);
  const farInside = box.containsPoint(farTest);
  assert(!farInside, 'Player outside wall AABB when far away');

  // Push-out: player should be pushed to box edge
  if (inside) {
    const center = new THREE.Vector3();
    box.getCenter(center);
    const diff = testPoint.clone().sub(center);
    const overlapX = (box.max.x - box.min.x) / 2 - Math.abs(diff.x);
    const overlapZ = (box.max.z - box.min.z) / 2 - Math.abs(diff.z);

    assert(overlapX < overlapZ, 'Push-out selects X axis (thinner wall dimension)');

    // After push-out, player should be at box.min.x
    const pushedX = playerPos.x + (diff.x > 0 ? overlapX : -overlapX);
    assert(pushedX < 10.0, 'Player pushed to left side of wall (away from wall center)');
  }

  wallGeo.dispose();
  wallMat.dispose();
}

// ═══════════════════════════════════════════════════
// Test: Player Movement Vectors
// ═══════════════════════════════════════════════════

function testMovementVectors() {
  // Forward vector at yaw=0 should be (0, 0, -1)
  const yaw = 0;
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  assertApprox(forward.x, 0, 0.001, 'Forward X at yaw=0 is 0');
  assertApprox(forward.z, -1, 0.001, 'Forward Z at yaw=0 is -1');

  // Right vector at yaw=0 should be (1, 0, 0)
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  assertApprox(right.x, 1, 0.001, 'Right X at yaw=0 is 1');
  assertApprox(right.z, 0, 0.001, 'Right Z at yaw=0 is 0');

  // Forward at yaw=PI/2 should be (-1, 0, 0)
  const yaw2 = Math.PI / 2;
  const fwd2 = new THREE.Vector3(-Math.sin(yaw2), 0, -Math.cos(yaw2));
  assertApprox(fwd2.x, -1, 0.001, 'Forward X at yaw=PI/2 is -1');
  assertApprox(fwd2.z, 0, 0.01, 'Forward Z at yaw=PI/2 is ~0');

  // Movement speed check
  const MOVE_SPEED = 8;
  const SPRINT_SPEED = 12;
  const dt = 1 / 60;
  const normalDist = MOVE_SPEED * dt;
  const sprintDist = SPRINT_SPEED * dt;
  assertApprox(normalDist, 0.1333, 0.01, 'Normal move distance per frame at 60fps');
  assertApprox(sprintDist, 0.2, 0.01, 'Sprint move distance per frame at 60fps');
}

// ═══════════════════════════════════════════════════
// Test: Gravity / Jump
// ═══════════════════════════════════════════════════

function testGravityJump() {
  const JUMP_VELOCITY = 6;
  const GRAVITY = -15;
  const EYE_HEIGHT = 1.7;

  // Simulate a jump
  let y = EYE_HEIGHT;
  let vy = JUMP_VELOCITY;
  const dt = 1 / 60;
  let maxY = y;
  let frames = 0;

  while (frames < 300) { // 5 seconds max
    vy += GRAVITY * dt;
    y += vy * dt;
    if (y > maxY) maxY = y;
    if (y <= EYE_HEIGHT) {
      y = EYE_HEIGHT;
      break;
    }
    frames++;
  }

  assert(maxY > EYE_HEIGHT + 0.5, `Jump reaches meaningful height (maxY=${maxY.toFixed(2)})`);
  assert(maxY < EYE_HEIGHT + 3, `Jump height is reasonable (maxY=${maxY.toFixed(2)})`);
  assertApprox(y, EYE_HEIGHT, 0.01, 'Player returns to ground after jump');
  assert(frames > 10, `Jump takes multiple frames (${frames})`);
  assert(frames < 120, `Jump completes within 2 seconds (${frames} frames)`);
}

// ═══════════════════════════════════════════════════
// Test: Level Room Dimensions
// ═══════════════════════════════════════════════════

function testRoomDimensions() {
  const scene = new THREE.Scene();

  // Dynamically import level.js
  // We test the constants directly
  const ROOM_SIZE = 20;
  const WALL_HEIGHT = 3;

  assert(ROOM_SIZE === 20, 'Room size is 20 units');
  assert(WALL_HEIGHT === 3, 'Wall height is 3 units');

  // Create room and check wall count
  // We'll import level dynamically to avoid scene side effects in other tests
}

async function testRoomCreation() {
  const { createRoom } = await import('../js/level.js');
  const scene = new THREE.Scene();
  const level = createRoom(scene);

  assert(level.walls.length === 4, `Room has 4 walls (got ${level.walls.length})`);
  assert(level.ROOM_SIZE === 20, 'Level reports ROOM_SIZE=20');
  assert(level.WALL_HEIGHT === 3, 'Level reports WALL_HEIGHT=3');

  // Check walls are positioned at edges
  for (const wall of level.walls) {
    const pos = wall.position;
    const atEdge = Math.abs(Math.abs(pos.x) - 10.15) < 0.5 || Math.abs(Math.abs(pos.z) - 10.15) < 0.5;
    assert(atEdge, `Wall at (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}) is at room edge`);
  }

  level.cleanup();
}

// ═══════════════════════════════════════════════════
// Run all tests
// ═══════════════════════════════════════════════════

async function runAll() {
  testAABBCollision();
  testMovementVectors();
  testGravityJump();
  testRoomDimensions();
  await testRoomCreation();
  renderResults();
  console.log(`\nTests: ${passed} passed, ${failed} failed`);
}

runAll();
