(function initGameLogic(root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
    return;
  }

  root.GameLogic = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function gameLogicFactory() {
  function difficultyFromScore(score) {
    // Slightly gentler early ramp, then normal pace.
    if (score < 18) return Math.min(8, Math.floor(score / 6));
    return Math.min(8, 3 + Math.floor((score - 18) / 5));
  }

  function levelFromScore(score) {
    return difficultyFromScore(score) + 1;
  }

  function spawnEveryFromDifficulty(baseSpawnEvery, difficulty) {
    return Math.max(16, baseSpawnEvery - difficulty * 2);
  }

  function clampPlayerX(x, width, playerWidth) {
    return Math.max(0, Math.min(width - playerWidth, x));
  }

  function playerSpeedFromDifficulty(baseSpeed, difficulty) {
    return Math.min(baseSpeed + difficulty * 0.25, baseSpeed + 2);
  }

  function isScoreMilestone(score, every = 10) {
    return score > 0 && score % every === 0;
  }

  function isZigZagSpawn(spawnCount, every = 5) {
    return spawnCount > 0 && spawnCount % every === 0;
  }

  function chaosSpawnEveryFromSpawnEvery(spawnEvery) {
    return Math.max(12, spawnEvery - 4);
  }

  function chaosZigZagEvery() {
    return 3;
  }

  function nextMode(current) {
    if (current === 'classic') return 'lives';
    if (current === 'lives') return 'chaos';
    return 'classic';
  }

  function chooseHazardSpawnX({ random01, width, size, playerX, playerWidth, chaosMode = false, lastSpawnX = null }) {
    const maxX = Math.max(0, width - size);
    const rawX = clampPlayerX(random01() * maxX, width, size);
    if (!chaosMode || lastSpawnX === null) return rawX;

    const playerCenter = playerX + playerWidth / 2;
    const spawnCenter = rawX + size / 2;
    const nearPlayerLane = Math.abs(spawnCenter - playerCenter) < Math.max(48, size * 1.2);
    const nearPreviousSpawn = Math.abs(rawX - lastSpawnX) < Math.max(44, size * 1.1);

    if (!nearPlayerLane || !nearPreviousSpawn) return rawX;

    // Chaos fairness: if two near-player spawns cluster, push this one away.
    const leftSafeX = clampPlayerX(playerX - size - 36, width, size);
    const rightSafeX = clampPlayerX(playerX + playerWidth + 36, width, size);
    return spawnCenter < playerCenter ? rightSafeX : leftSafeX;
  }

  /**
   * Simple seed-based PRNG (mulberry32).
   * Returns a function that produces deterministic 0–1 floats.
   * Useful for reproducible spawn sequences during balancing sessions.
   */
  function seedableRandom(seed) {
    let t = (seed >>> 0) + 0x6D2B79F5;
    return function random01() {
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Parse a seed from a URL query string (?seed=12345).
   * Returns the numeric seed or null if not present/invalid.
   */
  function parseSeedFromSearch(search) {
    if (!search) return null;
    const match = search.match(/[?&]seed=(\d+)/);
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : null;
  }

  return {
    difficultyFromScore,
    levelFromScore,
    spawnEveryFromDifficulty,
    clampPlayerX,
    playerSpeedFromDifficulty,
    isScoreMilestone,
    isZigZagSpawn,
    chaosSpawnEveryFromSpawnEvery,
    chaosZigZagEvery,
    chooseHazardSpawnX,
    nextMode,
    seedableRandom,
    parseSeedFromSearch,
  };
});
