/**
 * game.js — Progression tracker: level, score, kills, enemy scaling.
 */

export const progression = {
  level: 1,
  score: 0,
  kills: 0,
};

/**
 * Get enemy count for a given level.
 * Starts at 5, adds 2 per level, capped at 20.
 * @param {number} level
 * @returns {number}
 */
export function getEnemyCount(level) {
  return Math.min(3 + level * 2, 20);
}

/**
 * Get available enemy types for a level.
 * Level 1: blob only. Level 2: +spitter. Level 3+: all types.
 * @param {number} level
 * @returns {string[]}
 */
export function getEnemyTypes(level) {
  if (level <= 1) return ['blob'];
  if (level <= 2) return ['blob', 'spitter'];
  return ['blob', 'spitter', 'charger', 'tank'];
}

/**
 * Add to score.
 * @param {number} points
 */
export function addScore(points) {
  progression.score += points;
}

/**
 * Increment kill counter.
 */
export function addKill() {
  progression.kills++;
}

/**
 * Advance to next level.
 */
export function nextLevel() {
  progression.level++;
}

/**
 * Reset progression (for game restart).
 */
export function resetProgression() {
  progression.level = 1;
  progression.score = 0;
  progression.kills = 0;
}
