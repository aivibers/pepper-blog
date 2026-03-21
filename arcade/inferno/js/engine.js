/**
 * engine.js — Entry point for Pepper's Inferno.
 * Three.js init, game loop, resize handler. Imports and coordinates all modules.
 */
import * as THREE from 'three';
import { createRoom } from './level.js';
import { createPlayer } from './player.js';
import { initHUD, showHUD, updateHUD } from './hud.js';

// ── Game state ──
const gameState = {
  screen: 'title', // title | playing
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

// ── Title screen ──
const titleScreen = document.getElementById('title-screen');

renderer.domElement.addEventListener('click', () => {
  if (gameState.screen === 'title') {
    gameState.screen = 'playing';
    titleScreen.style.display = 'none';
    showHUD();
    player.requestLock();
  } else if (!player.pointerLocked) {
    player.requestLock();
  }
});

// ── Resize handler ──
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Game loop ──
let lastTime = 0;

function gameLoop(time) {
  requestAnimationFrame(gameLoop);

  const dt = Math.min((time - lastTime) / 1000, 0.05); // cap delta to avoid spiral
  lastTime = time;

  if (gameState.screen === 'playing') {
    player.update(dt, level.walls);
    updateHUD(player.state);
  }

  renderer.render(scene, camera);
}

requestAnimationFrame(gameLoop);
