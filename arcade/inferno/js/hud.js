/**
 * hud.js — DOM-based HUD overlay: health bar, ammo, weapon slots, score, level, minimap.
 */
import { WEAPONS } from './weapons.js';

const els = {};
let minimapCtx = null;
const MINIMAP_SIZE = 160;

/**
 * Initialize HUD — grab DOM references, create new elements.
 */
export function initHUD() {
  els.overlay = document.getElementById('hud-overlay');
  els.healthValue = document.getElementById('hud-health-value');
  els.ammoValue = document.getElementById('hud-ammo-value');
  els.weaponName = document.getElementById('hud-weapon-name');

  // ── Health bar ──
  if (!document.getElementById('hud-health-bar-container')) {
    const barContainer = document.createElement('div');
    barContainer.id = 'hud-health-bar-container';
    const bar = document.createElement('div');
    bar.id = 'hud-health-bar';
    barContainer.appendChild(bar);
    els.overlay.appendChild(barContainer);
  }
  els.healthBar = document.getElementById('hud-health-bar');

  // ── Score display ──
  if (!document.getElementById('hud-score')) {
    const scoreDiv = document.createElement('div');
    scoreDiv.id = 'hud-score';
    scoreDiv.innerHTML = '<span class="hud-label">SCORE</span> <span id="hud-score-value">0</span>';
    els.overlay.appendChild(scoreDiv);
  }
  els.scoreValue = document.getElementById('hud-score-value');

  // ── Level display ──
  if (!document.getElementById('hud-level')) {
    const levelDiv = document.createElement('div');
    levelDiv.id = 'hud-level';
    levelDiv.innerHTML = '<span class="hud-label">LEVEL</span> <span id="hud-level-value">1</span>';
    els.overlay.appendChild(levelDiv);
  }
  els.levelValue = document.getElementById('hud-level-value');

  // ── Weapon slots ──
  if (!document.getElementById('hud-weapon-slots')) {
    const slotsDiv = document.createElement('div');
    slotsDiv.id = 'hud-weapon-slots';
    for (let i = 0; i < WEAPONS.length; i++) {
      const slot = document.createElement('div');
      slot.className = 'weapon-slot';
      slot.dataset.index = i;
      slot.textContent = `${i + 1}: ${WEAPONS[i].name}`;
      slotsDiv.appendChild(slot);
    }
    els.overlay.appendChild(slotsDiv);
  }
  els.weaponSlots = document.querySelectorAll('.weapon-slot');

  // ── Minimap ──
  if (!document.getElementById('hud-minimap')) {
    const minimapDiv = document.createElement('div');
    minimapDiv.id = 'hud-minimap';
    const canvas = document.createElement('canvas');
    canvas.width = MINIMAP_SIZE;
    canvas.height = MINIMAP_SIZE;
    minimapDiv.appendChild(canvas);
    els.overlay.appendChild(minimapDiv);
    minimapCtx = canvas.getContext('2d');
  } else {
    const canvas = document.querySelector('#hud-minimap canvas');
    if (canvas) minimapCtx = canvas.getContext('2d');
  }
}

/**
 * Show the HUD overlay.
 */
export function showHUD() {
  if (els.overlay) els.overlay.classList.add('active');
}

/**
 * Hide the HUD overlay.
 */
export function hideHUD() {
  if (els.overlay) els.overlay.classList.remove('active');
}

/**
 * Get health bar color based on health percentage.
 * Green → Yellow → Red as health drops.
 * @param {number} pct — 0 to 1
 * @returns {string} CSS color
 */
function getHealthColor(pct) {
  if (pct > 0.6) {
    // Green to yellow
    const t = (pct - 0.6) / 0.4;
    const r = Math.round(255 * (1 - t));
    const g = 255;
    return `rgb(${r}, ${g}, 68)`;
  } else if (pct > 0.25) {
    // Yellow to red
    const t = (pct - 0.25) / 0.35;
    const g = Math.round(255 * t);
    return `rgb(255, ${g}, 68)`;
  } else {
    // Red
    return 'rgb(255, 50, 50)';
  }
}

/**
 * Draw the minimap showing room outlines, player dot, and enemy dots.
 * @param {object[]} walls — wall meshes from level
 * @param {{ x: number, z: number }} playerPos
 * @param {object[]} enemies
 */
function drawMinimap(walls, playerPos, enemies) {
  if (!minimapCtx) return;

  const ctx = minimapCtx;
  ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

  if (!walls || walls.length === 0) return;

  // Calculate bounds of all walls to determine scale/offset
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

  for (const wall of walls) {
    const p = wall.position;
    // Get wall half-extents from geometry
    const geo = wall.geometry;
    const params = geo.parameters;
    const hw = (params.width || 1) / 2;
    const hd = (params.depth || 1) / 2;

    minX = Math.min(minX, p.x - hw);
    maxX = Math.max(maxX, p.x + hw);
    minZ = Math.min(minZ, p.z - hd);
    maxZ = Math.max(maxZ, p.z + hd);
  }

  // Also include player position in bounds
  minX = Math.min(minX, playerPos.x - 2);
  maxX = Math.max(maxX, playerPos.x + 2);
  minZ = Math.min(minZ, playerPos.z - 2);
  maxZ = Math.max(maxZ, playerPos.z + 2);

  const rangeX = maxX - minX || 1;
  const rangeZ = maxZ - minZ || 1;
  const padding = 10;
  const drawSize = MINIMAP_SIZE - padding * 2;
  const scale = Math.min(drawSize / rangeX, drawSize / rangeZ);
  const offsetX = padding + (drawSize - rangeX * scale) / 2;
  const offsetZ = padding + (drawSize - rangeZ * scale) / 2;

  function toScreenX(worldX) {
    return offsetX + (worldX - minX) * scale;
  }
  function toScreenZ(worldZ) {
    return offsetZ + (worldZ - minZ) * scale;
  }

  // Draw walls as rectangles
  ctx.fillStyle = 'rgba(100, 100, 150, 0.6)';
  ctx.strokeStyle = 'rgba(150, 150, 200, 0.8)';
  ctx.lineWidth = 0.5;

  for (const wall of walls) {
    const p = wall.position;
    const params = wall.geometry.parameters;
    const w = (params.width || 1) * scale;
    const d = (params.depth || 1) * scale;
    const sx = toScreenX(p.x) - w / 2;
    const sz = toScreenZ(p.z) - d / 2;
    ctx.fillRect(sx, sz, w, d);
    ctx.strokeRect(sx, sz, w, d);
  }

  // Draw enemy dots (red)
  if (enemies) {
    ctx.fillStyle = '#ff4444';
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const ex = toScreenX(enemy.mesh.position.x);
      const ez = toScreenZ(enemy.mesh.position.z);
      ctx.beginPath();
      ctx.arc(ex, ez, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw player dot (white, larger)
  const px = toScreenX(playerPos.x);
  const pz = toScreenZ(playerPos.z);

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(px, pz, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

/**
 * Update HUD with current player state + game info.
 * @param {{ health: number, maxHealth: number, weapon: number, weaponNames: string[], ammo: object }} playerState
 * @param {{ score?: number, level?: number, kills?: number, enemies?: object[], walls?: THREE.Mesh[], playerPos?: THREE.Vector3 }} [gameInfo]
 */
export function updateHUD(playerState, gameInfo) {
  if (!els.healthValue) return;

  const hp = Math.ceil(playerState.health);
  els.healthValue.textContent = hp;

  // ── Health bar ──
  if (els.healthBar) {
    const maxHp = playerState.maxHealth || 100;
    const pct = Math.max(0, Math.min(1, playerState.health / maxHp));
    els.healthBar.style.width = (pct * 100) + '%';
    els.healthBar.style.backgroundColor = getHealthColor(pct);
  }

  // ── Weapon + ammo display ──
  const weaponIndex = playerState.weapon;
  const weaponName = playerState.weaponNames[weaponIndex];
  els.weaponName.textContent = weaponName;

  // Color the weapon name to match weapon color
  const weaponColor = '#' + WEAPONS[weaponIndex].color.toString(16).padStart(6, '0');
  els.weaponName.style.color = weaponColor;

  if (weaponIndex === 0) {
    els.ammoValue.textContent = '∞';
  } else if (weaponIndex === 1) {
    els.ammoValue.textContent = playerState.ammo.paintCannon;
  } else if (weaponIndex === 2) {
    els.ammoValue.textContent = playerState.ammo.gooLauncher;
  }

  // ── Weapon slots ──
  if (els.weaponSlots) {
    els.weaponSlots.forEach((slot, i) => {
      if (i === weaponIndex) {
        slot.classList.add('active');
        slot.style.color = weaponColor;
        slot.style.borderColor = weaponColor;
      } else {
        slot.classList.remove('active');
        slot.style.color = '';
        slot.style.borderColor = '';
      }
    });
  }

  // ── Score + Level ──
  if (gameInfo) {
    if (els.scoreValue && gameInfo.score !== undefined) {
      els.scoreValue.textContent = gameInfo.score;
    }
    if (els.levelValue && gameInfo.level !== undefined) {
      els.levelValue.textContent = gameInfo.level;
    }

    // ── Minimap ──
    if (gameInfo.walls && gameInfo.playerPos) {
      drawMinimap(gameInfo.walls, gameInfo.playerPos, gameInfo.enemies || []);
    }
  }
}
