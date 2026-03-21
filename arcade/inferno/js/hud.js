/**
 * hud.js — DOM-based HUD overlay: health, ammo, weapon name, score, level.
 */
import { WEAPONS } from './weapons.js';

const els = {};

/**
 * Initialize HUD — grab DOM references, create score/level elements.
 */
export function initHUD() {
  els.overlay = document.getElementById('hud-overlay');
  els.healthValue = document.getElementById('hud-health-value');
  els.ammoValue = document.getElementById('hud-ammo-value');
  els.weaponName = document.getElementById('hud-weapon-name');

  // Create score display if it doesn't exist
  if (!document.getElementById('hud-score')) {
    const scoreDiv = document.createElement('div');
    scoreDiv.id = 'hud-score';
    scoreDiv.innerHTML = '<span class="hud-label">SCORE</span> <span id="hud-score-value">0</span>';
    els.overlay.appendChild(scoreDiv);
  }
  els.scoreValue = document.getElementById('hud-score-value');

  // Create level display if it doesn't exist
  if (!document.getElementById('hud-level')) {
    const levelDiv = document.createElement('div');
    levelDiv.id = 'hud-level';
    levelDiv.innerHTML = '<span class="hud-label">LEVEL</span> <span id="hud-level-value">1</span>';
    els.overlay.appendChild(levelDiv);
  }
  els.levelValue = document.getElementById('hud-level-value');
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
 * Update HUD with current player state + game info.
 * @param {{ health: number, weapon: number, weaponNames: string[], ammo: object }} playerState
 * @param {{ score?: number, level?: number }} [gameInfo]
 */
export function updateHUD(playerState, gameInfo) {
  if (!els.healthValue) return;

  els.healthValue.textContent = Math.ceil(playerState.health);

  // Ammo display depends on weapon
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

  // Score + Level
  if (gameInfo) {
    if (els.scoreValue && gameInfo.score !== undefined) {
      els.scoreValue.textContent = gameInfo.score;
    }
    if (els.levelValue && gameInfo.level !== undefined) {
      els.levelValue.textContent = gameInfo.level;
    }
  }
}
