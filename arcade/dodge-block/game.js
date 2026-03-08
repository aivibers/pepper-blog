const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const bestWrapEl = document.getElementById('bestWrap');
const milestoneWrapEl = document.getElementById('milestoneWrap');
const livesWrapEl = document.getElementById('livesWrap');
const livesEl = document.getElementById('lives');
const restartBtn = document.getElementById('restart');
const soundToggleBtn = document.getElementById('soundToggle');
const soundTestBtn = document.getElementById('soundTest');
const chaosBadgeEl = document.getElementById('chaosBadge');
const modeToggleBtn = document.getElementById('modeToggle');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

const logic = window.GameLogic;
const soundLogic = window.SoundLogic;

const W = canvas.width;
const H = canvas.height;
const PLAYER_W = 52;
const PLAYER_H = 14;
const PLAYER_Y = H - 34;

// Seed-based debug mode: append ?seed=12345 to URL for reproducible spawns.
const debugSeed = logic.parseSeedFromSearch(window.location.search);
let seededRng = debugSeed !== null ? logic.seedableRandom(debugSeed) : null;

const state = {
  running: true,
  paused: false,
  pauseReason: null,
  left: false,
  right: false,
  playerX: W / 2 - PLAYER_W / 2,
  baseSpeed: 5,
  hazards: [],
  hazardTimer: 0,
  spawnEvery: 32,
  score: 0,
  best: Number(localStorage.getItem('dodgeBest') || 0),
  soundOn: localStorage.getItem('dodgeSoundOn') !== '0',
  audioUnlocked: false,
  mode: localStorage.getItem('dodgeMode') || (localStorage.getItem('dodgeLivesMode') === '1' ? 'lives' : 'classic'),
  lives: 1,
  hasFlashedNewBest: false,
  newBestFlashTimer: null,
  milestoneFlashTimer: null,
  hitFlashTimer: null,
  spawnCount: 0,
  lastSpawnX: null,
};

bestEl.textContent = state.best;

function isLivesMode() {
  return state.mode === 'lives';
}

function isChaosMode() {
  return state.mode === 'chaos';
}

state.lives = isLivesMode() ? 3 : 1;

let audioCtx;

function syncSoundToggle() {
  if (!soundToggleBtn) return;
  soundToggleBtn.textContent = state.soundOn ? '🔊 Sound: On' : '🔇 Sound: Off';
  soundToggleBtn.setAttribute('aria-pressed', String(!state.soundOn));
}

function syncModeToggle() {
  if (!modeToggleBtn) return;
  if (state.mode === 'lives') modeToggleBtn.textContent = 'Mode: 3 Lives';
  else if (state.mode === 'chaos') modeToggleBtn.textContent = 'Mode: Chaos';
  else modeToggleBtn.textContent = 'Mode: Classic';
  modeToggleBtn.setAttribute('aria-pressed', String(state.mode !== 'classic'));
}

function syncLivesHud() {
  if (!livesWrapEl || !livesEl) return;
  livesWrapEl.style.display = isLivesMode() ? 'inline' : 'none';
  livesEl.textContent = String(state.lives);
}

function syncChaosBadge() {
  if (!chaosBadgeEl) return;
  chaosBadgeEl.classList.toggle('show', isChaosMode() && state.running && !state.paused);
}

function syncAudioUnlockedFromContext() {
  state.audioUnlocked = Boolean(audioCtx && audioCtx.state === 'running');
}

function unlockAudio() {
  try {
    audioCtx = audioCtx || new AudioContext();

    // Keep unlock state in sync even if browser audio state changes later.
    if (!audioCtx.__dodgeBlockStateSyncBound) {
      audioCtx.addEventListener('statechange', syncAudioUnlockedFromContext);
      audioCtx.__dodgeBlockStateSyncBound = true;
    }

    if (soundLogic.shouldResumeAudioContext(audioCtx.state)) {
      void audioCtx.resume().then(syncAudioUnlockedFromContext).catch(() => {});
    }

    syncAudioUnlockedFromContext();
  } catch {
    // Ignore audio errors (autoplay/user gesture restrictions, etc).
  }
}

function playBeep({ frequency, duration = 0.06, type = 'square', volume = 0.03 }) {
  if (!soundLogic.canPlayBeep(state.soundOn, state.audioUnlocked)) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // Ignore audio errors (autoplay/user gesture restrictions, etc).
  }
}

function runSoundSelfTest() {
  unlockAudio();
  for (const tone of soundLogic.selfTestTonePlan()) {
    setTimeout(() => playBeep(tone), tone.atMs);
  }
}

function currentLevel() {
  return logic.levelFromScore(state.score);
}

function syncLevel() {
  if (levelEl) levelEl.textContent = String(currentLevel());
}

function currentDifficulty() {
  return logic.difficultyFromScore(state.score);
}

function triggerNewBestFlash() {
  if (!bestWrapEl || state.hasFlashedNewBest) return;
  state.hasFlashedNewBest = true;
  bestWrapEl.classList.add('new-best');
  if (state.newBestFlashTimer) clearTimeout(state.newBestFlashTimer);
  state.newBestFlashTimer = setTimeout(() => {
    bestWrapEl.classList.remove('new-best');
    state.newBestFlashTimer = null;
  }, 1200);
}

function triggerMilestoneFlash() {
  if (!milestoneWrapEl) return;
  milestoneWrapEl.classList.add('show');
  if (state.milestoneFlashTimer) clearTimeout(state.milestoneFlashTimer);
  state.milestoneFlashTimer = setTimeout(() => {
    milestoneWrapEl.classList.remove('show');
    state.milestoneFlashTimer = null;
  }, 1200);
}

function triggerHitFlash() {
  canvas.classList.remove('hit-flash');
  // Restart animation reliably on repeated collisions/restarts.
  void canvas.offsetWidth;
  canvas.classList.add('hit-flash');

  if (state.hitFlashTimer) clearTimeout(state.hitFlashTimer);
  state.hitFlashTimer = setTimeout(() => {
    canvas.classList.remove('hit-flash');
    state.hitFlashTimer = null;
  }, 420);
}

function rng() {
  return seededRng ? seededRng() : Math.random();
}

function spawnHazard() {
  const size = 16 + rng() * 20;
  const difficulty = currentDifficulty();
  state.spawnCount += 1;
  const zigZag = logic.isZigZagSpawn(
    state.spawnCount,
    isChaosMode() ? logic.chaosZigZagEvery() : 5,
  );
  const baseVx = 0.75 + difficulty * 0.06;
  const spawnX = logic.chooseHazardSpawnX({
    random01: rng,
    width: W,
    size,
    playerX: state.playerX,
    playerWidth: PLAYER_W,
    chaosMode: isChaosMode(),
    lastSpawnX: state.lastSpawnX,
  });
  state.lastSpawnX = spawnX;

  state.hazards.push({
    x: spawnX,
    y: -size,
    size,
    vy: 2 + rng() * 2.7 + difficulty * 0.18,
    vx: zigZag ? (rng() < 0.5 ? -baseVx : baseVx) : 0,
  });
}

function overlaps(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function update() {
  if (!state.running || state.paused) return;

  const difficulty = currentDifficulty();
  const moveSpeed = logic.playerSpeedFromDifficulty(state.baseSpeed, difficulty);

  if (state.left) state.playerX -= moveSpeed;
  if (state.right) state.playerX += moveSpeed;
  state.playerX = logic.clampPlayerX(state.playerX, W, PLAYER_W);

  let spawnEvery = logic.spawnEveryFromDifficulty(state.spawnEvery, difficulty);
  if (isChaosMode()) spawnEvery = logic.chaosSpawnEveryFromSpawnEvery(spawnEvery);
  syncLevel();

  state.hazardTimer += 1;
  if (state.hazardTimer >= spawnEvery) {
    state.hazardTimer = 0;
    spawnHazard();
  }

  const player = { x: state.playerX, y: PLAYER_Y, w: PLAYER_W, h: PLAYER_H };

  state.hazards = state.hazards.filter((h) => {
    h.y += h.vy;
    if (h.vx) {
      h.x += h.vx;
      if (h.x <= 0 || h.x >= W - h.size) {
        h.x = logic.clampPlayerX(h.x, W, h.size);
        h.vx *= -1;
      }
    }

    if (overlaps({ x: h.x, y: h.y, w: h.size, h: h.size }, player)) {
      triggerHitFlash();

      if (isLivesMode() && state.lives > 1) {
        state.lives -= 1;
        syncLivesHud();
        playBeep({ frequency: 220, duration: 0.09, type: 'sawtooth', volume: 0.04 });
        return false;
      }

      state.running = false;
      playBeep({ frequency: 160, duration: 0.18, type: 'sawtooth', volume: 0.05 });
      return false;
    }

    if (h.y > H + h.size) {
      state.score += 1;
      playBeep({ frequency: 520 + Math.min(280, state.score * 8), duration: 0.04, type: 'triangle' });
      scoreEl.textContent = state.score;
      if (logic.isScoreMilestone(state.score)) {
        triggerMilestoneFlash();
      }
      if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem('dodgeBest', String(state.best));
        bestEl.textContent = state.best;
        triggerNewBestFlash();
      }
      return false;
    }

    return true;
  });
}

function pauseMessage() {
  if (!state.paused) return '';
  if (state.pauseReason === 'hidden') {
    return document.hidden
      ? 'Auto-paused (tab hidden). Return here and press P to resume'
      : 'Auto-paused while tab was hidden. Press P to resume';
  }
  return 'Press P to resume';
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#60a5fa';
  ctx.fillRect(state.playerX, PLAYER_Y, PLAYER_W, PLAYER_H);

  ctx.fillStyle = '#f97316';
  for (const h of state.hazards) {
    ctx.fillRect(h.x, h.y, h.size, h.size);
  }

  if (!state.running || state.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 34px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(state.paused ? 'Paused' : 'Game Over', W / 2, H / 2 - 6);
    ctx.font = '16px system-ui';
    ctx.fillText(
      state.paused
        ? pauseMessage()
        : 'Press Restart, R, Enter, or Space to try again',
      W / 2,
      H / 2 + 24,
    );
    ctx.font = '11px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(240,136,62,0.45)';
    ctx.fillText('🌶️ pepper\'s arcade', W / 2, H / 2 + 52);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function restart() {
  state.running = true;
  state.paused = false;
  state.pauseReason = null;
  state.left = false;
  state.right = false;
  state.playerX = W / 2 - PLAYER_W / 2;
  state.hazards = [];
  state.hazardTimer = 0;
  state.spawnCount = 0;
  state.lastSpawnX = null;
  if (debugSeed !== null) seededRng = logic.seedableRandom(debugSeed);
  state.score = 0;
  state.lives = isLivesMode() ? 3 : 1;
  state.hasFlashedNewBest = false;
  if (state.newBestFlashTimer) {
    clearTimeout(state.newBestFlashTimer);
    state.newBestFlashTimer = null;
  }
  if (state.milestoneFlashTimer) {
    clearTimeout(state.milestoneFlashTimer);
    state.milestoneFlashTimer = null;
  }
  if (state.hitFlashTimer) {
    clearTimeout(state.hitFlashTimer);
    state.hitFlashTimer = null;
  }
  if (bestWrapEl) bestWrapEl.classList.remove('new-best');
  if (milestoneWrapEl) milestoneWrapEl.classList.remove('show');
  canvas.classList.remove('hit-flash');
  scoreEl.textContent = '0';
  syncLevel();
  syncLivesHud();
  syncChaosBadge();

  // Render immediately so pause-overlay text can't linger for a frame
  // after quick restart from an auto-hidden pause state.
  draw();
}

window.addEventListener('keydown', (e) => {
  unlockAudio();
  const key = e.key.toLowerCase();

  // Prevent page scrolling while using keyboard controls.
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault();
  }

  if ((key === 'p' || key === 'escape') && state.running) {
    state.paused = !state.paused;
    state.pauseReason = state.paused ? 'manual' : null;
    state.left = false;
    state.right = false;
    syncChaosBadge();
    return;
  }

  if (state.paused) return;

  if (e.key === 'ArrowLeft' || key === 'a') state.left = true;
  if (e.key === 'ArrowRight' || key === 'd') state.right = true;

  // Small UX polish: quick keyboard restart after game over.
  if (!state.running && (key === 'r' || e.key === 'Enter' || e.key === ' ')) {
    restart();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') state.left = false;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') state.right = false;
});

// Prevent "stuck movement" if focus changes while a key is held.
function resetHeldMovement() {
  state.left = false;
  state.right = false;
  if (leftBtn) {
    leftBtn.classList.remove('is-pressed');
    leftBtn.setAttribute('aria-pressed', 'false');
  }
  if (rightBtn) {
    rightBtn.classList.remove('is-pressed');
    rightBtn.setAttribute('aria-pressed', 'false');
  }
}

window.addEventListener('blur', resetHeldMovement);
window.addEventListener('focus', resetHeldMovement);

// Fairness polish: auto-pause if the tab becomes hidden.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.running && !state.paused) {
    state.paused = true;
    state.pauseReason = 'hidden';
    resetHeldMovement();
    syncChaosBadge();
    return;
  }

  // Extra safety for interrupted mobile pointer lifecycle on app switching.
  resetHeldMovement();
});

function bindGlobalAudioUnlock() {
  const unlockOnce = () => {
    unlockAudio();
    if (state.audioUnlocked) {
      window.removeEventListener('pointerdown', unlockOnce, true);
      window.removeEventListener('keydown', unlockOnce, true);
      window.removeEventListener('touchstart', unlockOnce, true);
    }
  };

  window.addEventListener('pointerdown', unlockOnce, true);
  window.addEventListener('keydown', unlockOnce, true);
  window.addEventListener('touchstart', unlockOnce, true);
}

function bindHoldControl(button, key) {
  if (!button) return;

  const setPressed = (pressed) => {
    if (key === 'left') state.left = pressed;
    if (key === 'right') state.right = pressed;
    button.classList.toggle('is-pressed', pressed);
    button.setAttribute('aria-pressed', String(pressed));
  };

  button.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    unlockAudio();
    setPressed(true);
  });

  const release = () => setPressed(false);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
  button.addEventListener('lostpointercapture', release);
}

bindHoldControl(leftBtn, 'left');
bindHoldControl(rightBtn, 'right');
bindGlobalAudioUnlock();

if (soundToggleBtn) {
  soundToggleBtn.addEventListener('click', () => {
    unlockAudio();
    state.soundOn = !state.soundOn;
    localStorage.setItem('dodgeSoundOn', state.soundOn ? '1' : '0');
    syncSoundToggle();
    // Subtle click feedback when turning sound on.
    if (state.soundOn) playBeep({ frequency: 640, duration: 0.05, type: 'triangle' });
  });
}

if (soundTestBtn) {
  soundTestBtn.addEventListener('click', runSoundSelfTest);
}

if (modeToggleBtn) {
  modeToggleBtn.addEventListener('click', () => {
    unlockAudio();
    state.mode = logic.nextMode(state.mode);
    localStorage.setItem('dodgeMode', state.mode);
    localStorage.setItem('dodgeLivesMode', isLivesMode() ? '1' : '0'); // legacy compatibility
    syncModeToggle();
    syncChaosBadge();
    restart();
  });
}

syncSoundToggle();
syncModeToggle();
syncLivesHud();
syncChaosBadge();
restartBtn.addEventListener('click', () => {
  unlockAudio();
  restart();
});

// Touch-drag on canvas: map finger X to player position
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const relX = touch.clientX - rect.left;
  const scaleX = W / rect.width;
  state.playerX = logic.clampPlayerX(relX * scaleX - PLAYER_W / 2, W, PLAYER_W);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const relX = touch.clientX - rect.left;
  const scaleX = W / rect.width;
  state.playerX = logic.clampPlayerX(relX * scaleX - PLAYER_W / 2, W, PLAYER_W);
}, { passive: false });

loop();
