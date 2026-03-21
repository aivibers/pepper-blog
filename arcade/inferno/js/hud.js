/**
 * hud.js — DOM-based HUD overlay: health, ammo, weapon name.
 */
import { WEAPONS } from './weapons.js';

const els = {};

/**
 * Initialize HUD — grab DOM references.
 */
export function initHUD() {
  els.overlay = document.getElementById('hud-overlay');
  els.healthValue = document.getElementById('hud-health-value');
  els.ammoValue = document.getElementById('hud-ammo-value');
  els.weaponName = document.getElementById('hud-weapon-name');
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
 * Update HUD with current player state.
 * @param {{ health: number, weapon: number, weaponNames: string[], ammo: object }} playerState
 */
export function updateHUD(playerState) {
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
    // Pistol — infinite ammo
    els.ammoValue.textContent = '∞';
  } else if (weaponIndex === 1) {
    els.ammoValue.textContent = playerState.ammo.paintCannon;
  } else if (weaponIndex === 2) {
    els.ammoValue.textContent = playerState.ammo.gooLauncher;
  }
}
