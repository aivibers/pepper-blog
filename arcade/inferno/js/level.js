/**
 * level.js — Room generator for Pepper's Inferno
 * Creates box rooms with floor, walls, ceiling using Three.js geometry.
 * Returns wall meshes for collision detection.
 */
import * as THREE from 'three';

const COLORS = {
  floor: 0x2a1a3e,
  wall: 0x3d2a5c,
  ceiling: 0x1a0a2e,
};

const ROOM_SIZE = 20;
const WALL_HEIGHT = 3;
const WALL_THICKNESS = 0.3;

// Shared geometries (reuse for performance)
const floorGeo = new THREE.BoxGeometry(ROOM_SIZE, 0.1, ROOM_SIZE);
const ceilingGeo = new THREE.BoxGeometry(ROOM_SIZE, 0.1, ROOM_SIZE);

/**
 * Create a single box room.
 * @param {THREE.Scene} scene
 * @returns {{ walls: THREE.Mesh[], cleanup: () => void }}
 */
export function createRoom(scene) {
  const meshes = [];
  const walls = [];

  // ── Floor ──
  const floorMat = new THREE.MeshStandardMaterial({ color: COLORS.floor });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, -0.05, 0);
  floor.receiveShadow = true;
  scene.add(floor);
  meshes.push(floor);

  // ── Ceiling (optional — open sky is fine, but we include it) ──
  const ceilMat = new THREE.MeshStandardMaterial({ color: COLORS.ceiling });
  const ceiling = new THREE.Mesh(ceilingGeo, ceilMat);
  ceiling.position.set(0, WALL_HEIGHT + 0.05, 0);
  scene.add(ceiling);
  meshes.push(ceiling);

  // ── Walls ──
  // Each wall is a thin box positioned at the room edge.
  // Wall definitions: [width, height, depth, x, y, z]
  const halfRoom = ROOM_SIZE / 2;
  const halfWall = WALL_HEIGHT / 2;
  const halfThick = WALL_THICKNESS / 2;

  const wallDefs = [
    // North wall (negative Z)
    { size: [ROOM_SIZE + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS], pos: [0, halfWall, -(halfRoom + halfThick)] },
    // South wall (positive Z)
    { size: [ROOM_SIZE + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS], pos: [0, halfWall, halfRoom + halfThick] },
    // West wall (negative X)
    { size: [WALL_THICKNESS, WALL_HEIGHT, ROOM_SIZE], pos: [-(halfRoom + halfThick), halfWall, 0] },
    // East wall (positive X)
    { size: [WALL_THICKNESS, WALL_HEIGHT, ROOM_SIZE], pos: [halfRoom + halfThick, halfWall, 0] },
  ];

  const wallMat = new THREE.MeshStandardMaterial({ color: COLORS.wall });

  for (const def of wallDefs) {
    const geo = new THREE.BoxGeometry(def.size[0], def.size[1], def.size[2]);
    const wall = new THREE.Mesh(geo, wallMat);
    wall.position.set(def.pos[0], def.pos[1], def.pos[2]);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    meshes.push(wall);
    walls.push(wall);
  }

  // ── Lighting ──
  const pointLight = new THREE.PointLight(0xffeedd, 1.2, 30);
  pointLight.position.set(0, WALL_HEIGHT - 0.3, 0);
  pointLight.castShadow = true;
  scene.add(pointLight);

  const ambientLight = new THREE.AmbientLight(0x332244, 0.5);
  scene.add(ambientLight);

  function cleanup() {
    for (const m of meshes) {
      scene.remove(m);
      if (m.geometry !== floorGeo && m.geometry !== ceilingGeo) {
        m.geometry.dispose();
      }
      m.material.dispose();
    }
    scene.remove(pointLight);
    scene.remove(ambientLight);
    pointLight.dispose();
    ambientLight.dispose();
  }

  return { walls, cleanup, ROOM_SIZE, WALL_HEIGHT };
}
