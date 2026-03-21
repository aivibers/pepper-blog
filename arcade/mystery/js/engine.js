/* engine.js — state machine, init, click handling, canvas resize */

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

/* ---- Stub generators (replaced in Task 02) ---- */
function generateCharacters(caseData, rng) {
  return [];
}
function generateScene(caseData, rng) {
  return null;
}

/* ---- Click handling ---- */

function handleCanvasClick(e) {
  const canvas = e.target;
  const rect = canvas.getBoundingClientRect();
  const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
  const world = screenToWorld(sx, sy, canvas);

  switch (gameState.screen) {
    case STATES.TITLE:
      setState({ screen: STATES.BRIEFING });
      break;

    case STATES.BRIEFING:
      setState({ screen: STATES.SCENE, selectedCharacter: null });
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

    case STATES.SOLVED:
      // Advance to next case or victory
      setState({ screen: STATES.BRIEFING, caseIndex: gameState.caseIndex + 1, stars: 3 });
      break;

    case STATES.FAILED:
      // Retry same case
      setState({ screen: STATES.BRIEFING, stars: 3 });
      break;

    case STATES.VICTORY:
      setState({ screen: STATES.TITLE, caseIndex: 0, score: 0, stars: 3 });
      break;
  }
}

/** Accuse the currently selected suspect */
function handleAccuse() {
  if (!gameState.selectedCharacter || !gameState.currentCase) return;

  const c = gameState.selectedCharacter;
  const caseData = gameState.currentCase;
  const realClues = caseData.clues.filter(cl => cl.type !== 'redHerring');
  const match = realClues.every(cl => {
    const attrs = c.attributes || {};
    return attrs[cl.attribute] === cl.value;
  });

  if (match) {
    const newScore = gameState.score + gameState.stars * 100;
    setState({ screen: STATES.SOLVED, score: newScore });
    renderStatusBar('You found the culprit!');
  } else {
    const newStars = gameState.stars - 1;
    if (newStars <= 0) {
      setState({ screen: STATES.FAILED, stars: 0 });
      renderStatusBar('Out of stars — case failed!');
    } else {
      setState({ stars: newStars, screen: STATES.SCENE, selectedCharacter: null });
      renderSuspectInfo(gameState);
      renderStatusBar(`Wrong suspect! ${newStars} star${newStars > 1 ? 's' : ''} remaining.`);
    }
  }
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
