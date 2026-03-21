/* engine.js — state machine, init, click handling, canvas resize, case loading */

const STATES = {
  TITLE:    'title',
  BRIEFING: 'briefing',
  SCENE:    'scene',
  INSPECT:  'inspect',
  SOLVED:   'solved',
  FAILED:   'failed',
  VICTORY:  'victory',
};

/** Valid state transitions */
const VALID_TRANSITIONS = {
  [STATES.TITLE]:    [STATES.BRIEFING],
  [STATES.BRIEFING]: [STATES.SCENE],
  [STATES.SCENE]:    [STATES.INSPECT, STATES.SOLVED, STATES.FAILED],
  [STATES.INSPECT]:  [STATES.SCENE, STATES.SOLVED, STATES.FAILED],
  [STATES.SOLVED]:   [STATES.BRIEFING, STATES.VICTORY],
  [STATES.FAILED]:   [STATES.BRIEFING],
  [STATES.VICTORY]:  [STATES.TITLE],
};

/** Single source of truth */
let gameState = {
  screen: STATES.TITLE,
  caseIndex: 0,
  stars: 3,
  score: 0,
  currentCase: null,
  scene: null,
  characters: [],
  selectedCharacter: null,
  cluesRevealed: [],
};

/**
 * Merge a patch into gameState and re-render.
 * If patch includes `screen`, validates the transition.
 * @param {object} patch
 */
function setState(patch) {
  if (patch.screen && patch.screen !== gameState.screen) {
    const allowed = VALID_TRANSITIONS[gameState.screen];
    if (allowed && !allowed.includes(patch.screen)) {
      console.warn(
        `Invalid transition: ${gameState.screen} → ${patch.screen}`
      );
      return;
    }
  }
  Object.assign(gameState, patch);
  render(gameState);
}

/* ---- Case loading & character generation ---- */

/**
 * Load a case by index, generate scene and characters.
 * Ensures exactly one character matches all non-red-herring/non-flavor clues.
 * @param {number} index
 */
function loadCase(index) {
  if (typeof CASES === 'undefined' || index >= CASES.length) {
    return null;
  }

  const caseData = CASES[index];
  const seed = index * 1000 + 42;
  const rng = mulberry32(seed);

  // Generate scene
  const scene = createScene(caseData.scene.type, rng);

  // Generate characters
  const slots = scene.characterSlots.slice(0, caseData.scene.characterSlots);
  const characters = [];

  // Pick a random slot for the culprit
  const culpritSlotIndex = Math.floor(rng() * slots.length);

  // Get non-red-herring, non-flavor clues for collision checks
  const realClues = caseData.clues.filter(
    cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
  );

  for (let i = 0; i < slots.length; i++) {
    if (i === culpritSlotIndex) {
      // Create culprit with forced attributes
      const culprit = createCharacter(rng, slots[i], caseData.culprit);
      characters.push(culprit);
    } else {
      // Create random character, ensure no accidental collision with ALL real clues
      let attempts = 0;
      let ch;
      do {
        ch = createCharacter(rng, slots[i]);
        attempts++;
        const matchesAll = realClues.every(
          cl => ch.attributes[cl.attribute] === cl.value
        );
        if (!matchesAll) break;
        // Collision: regenerate (use next rng values)
      } while (attempts < 20);
      characters.push(ch);
    }
  }

  return { caseData, scene, characters };
}

/* ---- Click handling ---- */

function handleCanvasClick(e) {
  const canvas = e.target;
  const rect = canvas.getBoundingClientRect();
  const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
  const world = screenToWorld(sx, sy, canvas);

  switch (gameState.screen) {
    case STATES.TITLE: {
      // Load first case and go to briefing
      const loaded = loadCase(0);
      if (loaded) {
        setState({
          screen: STATES.BRIEFING,
          caseIndex: 0,
          currentCase: loaded.caseData,
          scene: loaded.scene,
          characters: loaded.characters,
          stars: 3,
          score: 0,
        });
      } else {
        setState({ screen: STATES.BRIEFING });
      }
      break;
    }

    case STATES.BRIEFING:
      setState({ screen: STATES.SCENE, selectedCharacter: null });
      renderStatusBar('Click on suspects to inspect them');
      break;

    case STATES.SCENE: {
      const hit = hitTest(world.x, world.y, gameState.characters);
      if (hit) {
        setState({ screen: STATES.INSPECT, selectedCharacter: hit });
        renderSuspectInfo(gameState);
        renderStatusBar('Inspect this suspect — Accuse if they match the clues!');
      } else {
        renderStatusBar('Nothing there… keep looking.');
      }
      break;
    }

    case STATES.INSPECT:
      // Click on canvas while inspecting → back to scene
      setState({ screen: STATES.SCENE, selectedCharacter: null });
      renderSuspectInfo(gameState);
      renderStatusBar('Click on suspects to inspect them');
      break;

    case STATES.SOLVED: {
      // Advance to next case or victory
      const nextIndex = gameState.caseIndex + 1;
      if (typeof CASES !== 'undefined' && nextIndex < CASES.length) {
        const loaded = loadCase(nextIndex);
        if (loaded) {
          setState({
            screen: STATES.BRIEFING,
            caseIndex: nextIndex,
            currentCase: loaded.caseData,
            scene: loaded.scene,
            characters: loaded.characters,
            stars: 3,
          });
        } else {
          setState({ screen: STATES.VICTORY });
        }
      } else {
        setState({ screen: STATES.VICTORY });
      }
      break;
    }

    case STATES.FAILED: {
      // Retry same case — reload with same seed, keep cumulative score
      const loaded = loadCase(gameState.caseIndex);
      if (loaded) {
        setState({
          screen: STATES.BRIEFING,
          currentCase: loaded.caseData,
          scene: loaded.scene,
          characters: loaded.characters,
          stars: 3,
        });
      } else {
        setState({ screen: STATES.BRIEFING, stars: 3 });
      }
      break;
    }

    case STATES.VICTORY:
      // Full reset — replay from beginning
      setState({
        screen: STATES.TITLE,
        caseIndex: 0,
        score: 0,
        stars: 3,
        currentCase: null,
        scene: null,
        characters: [],
        selectedCharacter: null,
        cluesRevealed: [],
      });
      break;
  }
}

/**
 * Check if a character matches all real (non-red-herring, non-flavor) clues.
 * @param {object} character
 * @param {object} caseData
 * @returns {boolean}
 */
function checkAccusation(character, caseData) {
  const realClues = caseData.clues.filter(
    cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
  );
  const attrs = character.attributes || {};
  return realClues.every(cl => attrs[cl.attribute] === cl.value);
}

/** Accuse the currently selected suspect */
function handleAccuse() {
  if (!gameState.selectedCharacter || !gameState.currentCase) return;

  const match = checkAccusation(gameState.selectedCharacter, gameState.currentCase);

  if (match) {
    const newScore = gameState.score + gameState.stars * 100;
    setState({ screen: STATES.SOLVED, score: newScore });
    renderStatusBar('🎉 You found the culprit!');
  } else {
    const newStars = gameState.stars - 1;
    if (newStars <= 0) {
      setState({ screen: STATES.FAILED, stars: 0 });
      renderStatusBar('Out of stars — case failed!');
    } else {
      // Show which clues matched and which didn't
      const realClues = gameState.currentCase.clues.filter(
        cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
      );
      const attrs = gameState.selectedCharacter.attributes || {};
      const matched = realClues.filter(cl => attrs[cl.attribute] === cl.value).length;
      setState({ stars: newStars, screen: STATES.SCENE, selectedCharacter: null });
      renderSuspectInfo(gameState);
      renderStatusBar(
        `Wrong suspect! Only ${matched}/${realClues.length} clues matched. ${newStars} star${newStars > 1 ? 's' : ''} remaining.`
      );
    }
  }
}

/**
 * Calculate the total score for a given number of stars on the current case.
 * Each case: stars_remaining × 100
 * @param {number} stars
 * @returns {number}
 */
function calculateCaseScore(stars) {
  return stars * 100;
}

/* ---- Canvas resize ---- */

function resizeCanvas() {
  const canvas = document.getElementById('game-canvas');
  const wrap = document.getElementById('canvas-wrap');
  if (!canvas || !wrap) return;

  const wrapW = wrap.clientWidth;
  const wrapH = wrap.clientHeight;

  // Maintain 16:10 aspect ratio
  const aspect = 16 / 10;
  let w, h;
  if (wrapW / wrapH > aspect) {
    h = wrapH;
    w = h * aspect;
  } else {
    w = wrapW;
    h = w / aspect;
  }

  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  canvas.style.width = Math.round(w) + 'px';
  canvas.style.height = Math.round(h) + 'px';

  render(gameState);
}

/* ---- Init ---- */

function init() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('game-canvas not found');
    return;
  }

  canvas.addEventListener('click', handleCanvasClick);
  window.addEventListener('resize', resizeCanvas);

  resizeCanvas();
  setState({ screen: STATES.TITLE });
}

// Auto-start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
