/**
 * level.js — Room generator for Pepper's Inferno.
 * Single-room createRoom() for backward compat, plus multi-room generateLevel().
 */
import * as THREE from 'three';

const WALL_HEIGHT = 3;
const WALL_THICKNESS = 0.3;
const CORRIDOR_WIDTH = 3;
const CORRIDOR_LENGTH = 4;

// Color palettes per level (cycle through)
const LEVEL_PALETTES = [
  { floor: 0x2a1a3e, wall: 0x3d2a5c, ceiling: 0x1a0a2e }, // purple dungeon
  { floor: 0x1a2e1a, wall: 0x2a5c2a, ceiling: 0x0a1e0a }, // green sewers
  { floor: 0x2e1a1a, wall: 0x5c2a2a, ceiling: 0x1e0a0a }, // red hellscape
  { floor: 0x1a1a2e, wall: 0x2a2a5c, ceiling: 0x0a0a1e }, // blue catacombs
  { floor: 0x2e2e1a, wall: 0x5c5c2a, ceiling: 0x1e1e0a }, // gold temple
];

// Shared geometries (reuse for performance in legacy createRoom)
const _legacyFloorGeo = new THREE.BoxGeometry(20, 0.1, 20);
const _legacyCeilingGeo = new THREE.BoxGeometry(20, 0.1, 20);

/**
 * Create a single box room (legacy API — kept for backward compat).
 * @param {THREE.Scene} scene
 * @returns {{ walls: THREE.Mesh[], cleanup: () => void }}
 */
export function createRoom(scene) {
  const ROOM_SIZE = 20;
  const meshes = [];
  const walls = [];

  const COLORS = { floor: 0x2a1a3e, wall: 0x3d2a5c, ceiling: 0x1a0a2e };

  // Floor
  const floorMat = new THREE.MeshStandardMaterial({ color: COLORS.floor });
  const floor = new THREE.Mesh(_legacyFloorGeo, floorMat);
  floor.position.set(0, -0.05, 0);
  floor.receiveShadow = true;
  scene.add(floor);
  meshes.push(floor);

  // Ceiling
  const ceilMat = new THREE.MeshStandardMaterial({ color: COLORS.ceiling });
  const ceiling = new THREE.Mesh(_legacyCeilingGeo, ceilMat);
  ceiling.position.set(0, WALL_HEIGHT + 0.05, 0);
  scene.add(ceiling);
  meshes.push(ceiling);

  // Walls
  const halfRoom = ROOM_SIZE / 2;
  const halfWall = WALL_HEIGHT / 2;
  const halfThick = WALL_THICKNESS / 2;

  const wallDefs = [
    { size: [ROOM_SIZE + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS], pos: [0, halfWall, -(halfRoom + halfThick)] },
    { size: [ROOM_SIZE + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS], pos: [0, halfWall, halfRoom + halfThick] },
    { size: [WALL_THICKNESS, WALL_HEIGHT, ROOM_SIZE], pos: [-(halfRoom + halfThick), halfWall, 0] },
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

  // Lighting
  const pointLight = new THREE.PointLight(0xffeedd, 1.2, 30);
  pointLight.position.set(0, WALL_HEIGHT - 0.3, 0);
  pointLight.castShadow = true;
  scene.add(pointLight);

  const ambientLight = new THREE.AmbientLight(0x332244, 0.5);
  scene.add(ambientLight);

  function cleanup() {
    for (const m of meshes) {
      scene.remove(m);
      if (m.geometry !== _legacyFloorGeo && m.geometry !== _legacyCeilingGeo) {
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

// ── Multi-room level generation ──────────────────────────────────────────────

/**
 * Generate a multi-room level with corridors, spawn/pickup points, and a door.
 * @param {THREE.Scene} scene
 * @param {number} levelNum — 1-based level number
 * @returns {{ walls: THREE.Mesh[], door: THREE.Mesh, spawnPoints: THREE.Vector3[], pickupPoints: THREE.Vector3[], playerStart: THREE.Vector3, cleanup: () => void }}
 */
export function generateLevel(scene, levelNum) {
  const palette = LEVEL_PALETTES[(levelNum - 1) % LEVEL_PALETTES.length];
  const roomCount = Math.min(3 + Math.floor(levelNum / 2), 7);

  const allMeshes = [];
  const allWalls = [];
  const allLights = [];
  const spawnPoints = [];
  const pickupPoints = [];

  // Generate room sizes (random 8-16)
  const rooms = [];
  for (let i = 0; i < roomCount; i++) {
    rooms.push({
      sizeX: 8 + Math.random() * 8,
      sizeZ: 8 + Math.random() * 8,
      centerX: 0,
      centerZ: 0,
    });
  }

  // Layout rooms in a chain along +X axis
  let currentX = 0;
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    room.centerX = currentX + room.sizeX / 2;
    room.centerZ = 0;
    currentX += room.sizeX + CORRIDOR_LENGTH;
  }

  // Player starts in first room center
  const playerStart = new THREE.Vector3(rooms[0].centerX, 1.7, rooms[0].centerZ);

  // Build each room
  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri];
    const cx = room.centerX;
    const cz = room.centerZ;
    const sx = room.sizeX;
    const sz = room.sizeZ;
    const hx = sx / 2;
    const hz = sz / 2;

    // Floor
    const floorGeo = new THREE.BoxGeometry(sx, 0.1, sz);
    const floorMat = new THREE.MeshStandardMaterial({ color: palette.floor });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(cx, -0.05, cz);
    floor.receiveShadow = true;
    scene.add(floor);
    allMeshes.push(floor);

    // Ceiling
    const ceilGeo = new THREE.BoxGeometry(sx, 0.1, sz);
    const ceilMat = new THREE.MeshStandardMaterial({ color: palette.ceiling });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.position.set(cx, WALL_HEIGHT + 0.05, cz);
    scene.add(ceil);
    allMeshes.push(ceil);

    // Determine which sides have corridor openings
    const hasLeftCorridor = ri > 0;
    const hasRightCorridor = ri < rooms.length - 1;
    const halfWall = WALL_HEIGHT / 2;
    const halfThick = WALL_THICKNESS / 2;
    const corridorHalf = CORRIDOR_WIDTH / 2;

    // North wall (negative Z)
    addWall(cx, halfWall, cz - (hz + halfThick), sx + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS);

    // South wall (positive Z)
    addWall(cx, halfWall, cz + (hz + halfThick), sx + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS);

    // West wall (negative X) — with corridor gap if needed
    if (hasLeftCorridor) {
      // Top segment (above corridor)
      const segLen = (sz - CORRIDOR_WIDTH) / 2;
      if (segLen > 0.1) {
        addWall(cx - (hx + halfThick), halfWall, cz - hz + segLen / 2, WALL_THICKNESS, WALL_HEIGHT, segLen);
        addWall(cx - (hx + halfThick), halfWall, cz + hz - segLen / 2, WALL_THICKNESS, WALL_HEIGHT, segLen);
      }
    } else {
      addWall(cx - (hx + halfThick), halfWall, cz, WALL_THICKNESS, WALL_HEIGHT, sz);
    }

    // East wall (positive X) — with corridor gap if needed
    if (hasRightCorridor) {
      const segLen = (sz - CORRIDOR_WIDTH) / 2;
      if (segLen > 0.1) {
        addWall(cx + (hx + halfThick), halfWall, cz - hz + segLen / 2, WALL_THICKNESS, WALL_HEIGHT, segLen);
        addWall(cx + (hx + halfThick), halfWall, cz + hz - segLen / 2, WALL_THICKNESS, WALL_HEIGHT, segLen);
      }
    } else {
      addWall(cx + (hx + halfThick), halfWall, cz, WALL_THICKNESS, WALL_HEIGHT, sz);
    }

    // Room lighting
    const light = new THREE.PointLight(0xffeedd, 1.0, Math.max(sx, sz) * 1.5);
    light.position.set(cx, WALL_HEIGHT - 0.3, cz);
    light.castShadow = true;
    scene.add(light);
    allLights.push(light);

    // Spawn points (2 per room except first room)
    if (ri > 0) {
      spawnPoints.push(
        new THREE.Vector3(cx - hx * 0.4, 0, cz - hz * 0.4),
        new THREE.Vector3(cx + hx * 0.4, 0, cz + hz * 0.4),
      );
    }

    // Pickup point in each room (center offset)
    pickupPoints.push(
      new THREE.Vector3(cx + (Math.random() - 0.5) * hx, 0, cz + (Math.random() - 0.5) * hz),
    );
  }

  // Build corridors between adjacent rooms
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = rooms[i];
    const b = rooms[i + 1];
    const startX = a.centerX + a.sizeX / 2;
    const endX = b.centerX - b.sizeX / 2;
    const corridorCenterX = (startX + endX) / 2;
    const corridorLen = endX - startX;
    const corridorCenterZ = 0; // corridors run along Z=0

    // Floor
    const cFloorGeo = new THREE.BoxGeometry(corridorLen, 0.1, CORRIDOR_WIDTH);
    const cFloorMat = new THREE.MeshStandardMaterial({ color: palette.floor });
    const cFloor = new THREE.Mesh(cFloorGeo, cFloorMat);
    cFloor.position.set(corridorCenterX, -0.05, corridorCenterZ);
    cFloor.receiveShadow = true;
    scene.add(cFloor);
    allMeshes.push(cFloor);

    // Ceiling
    const cCeilGeo = new THREE.BoxGeometry(corridorLen, 0.1, CORRIDOR_WIDTH);
    const cCeilMat = new THREE.MeshStandardMaterial({ color: palette.ceiling });
    const cCeil = new THREE.Mesh(cCeilGeo, cCeilMat);
    cCeil.position.set(corridorCenterX, WALL_HEIGHT + 0.05, corridorCenterZ);
    scene.add(cCeil);
    allMeshes.push(cCeil);

    // Corridor walls (north and south sides)
    const halfCorr = CORRIDOR_WIDTH / 2;
    addWall(corridorCenterX, WALL_HEIGHT / 2, corridorCenterZ - (halfCorr + WALL_THICKNESS / 2), corridorLen, WALL_HEIGHT, WALL_THICKNESS);
    addWall(corridorCenterX, WALL_HEIGHT / 2, corridorCenterZ + (halfCorr + WALL_THICKNESS / 2), corridorLen, WALL_HEIGHT, WALL_THICKNESS);

    // Corridor light
    const cLight = new THREE.PointLight(0xffeedd, 0.6, 8);
    cLight.position.set(corridorCenterX, WALL_HEIGHT - 0.3, corridorCenterZ);
    scene.add(cLight);
    allLights.push(cLight);
  }

  // Ambient light for the whole level
  const ambientLight = new THREE.AmbientLight(0x332244, 0.4);
  scene.add(ambientLight);
  allLights.push(ambientLight);

  // Door in last room (golden = locked)
  const lastRoom = rooms[rooms.length - 1];
  const doorGeo = new THREE.BoxGeometry(2, WALL_HEIGHT - 0.2, 0.2);
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0xdaa520,
    emissive: 0xdaa520,
    emissiveIntensity: 0.4,
    metalness: 0.6,
    roughness: 0.3,
  });
  const door = new THREE.Mesh(doorGeo, doorMat);
  // Place door against far east wall of last room
  door.position.set(
    lastRoom.centerX + lastRoom.sizeX * 0.3,
    WALL_HEIGHT / 2 - 0.1,
    lastRoom.centerZ,
  );
  scene.add(door);
  allMeshes.push(door);

  // Helper to add a wall and track it
  function addWall(x, y, z, w, h, d) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color: palette.wall });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    allMeshes.push(mesh);
    allWalls.push(mesh);
  }

  function cleanup() {
    for (const m of allMeshes) {
      scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    for (const l of allLights) {
      scene.remove(l);
      if (l.dispose) l.dispose();
    }
  }

  return {
    walls: allWalls,
    door,
    spawnPoints,
    pickupPoints,
    playerStart,
    cleanup,
    WALL_HEIGHT,
  };
}
