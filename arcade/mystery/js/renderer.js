/* renderer.js — coordinate transforms, draw helpers, render pipeline */

const WORLD_W = 1600;
const WORLD_H = 1000;
const PIXEL_SIZE = 4;

const PALETTE = {
  bg:          '#0d1117',
  wall:        '#161b22',
  floor:       '#1a1f25',
  accent:      '#f0883e',
  text:        '#e6edf3',
  textDim:     '#8b949e',
  panel:       '#161b22',
  panelBorder: '#30363d',
  skin:     ['#FDBCB4','#E8A87C','#D08B5B','#AE7E52','#82583A','#5C3D2E'],
  clothing: ['#f0883e','#f85149','#7ee787','#79c0ff','#d2a8ff','#ffa657',
             '#8b949e','#e6edf3','#484f58','#da3633'],
  hair:     ['#1a1a1a','#4a3728','#8B4513','#DAA520','#D2691E','#A0522D',
             '#F4A460','#808080','#FFFFFF'],
  wood:  '#8B6914',
  metal: '#71797E',
  glass: '#ADD8E6',
  gold:  '#FFD700',
  red:   '#f85149',
  green: '#7ee787',
  blue:  '#79c0ff',
};

/** Convert world coords → screen coords */
function worldToScreen(wx, wy, canvas) {
  const scale = Math.min(canvas.width / WORLD_W, canvas.height / WORLD_H);
  const offsetX = (canvas.width - WORLD_W * scale) / 2;
  const offsetY = (canvas.height - WORLD_H * scale) / 2;
  return { x: wx * scale + offsetX, y: wy * scale + offsetY, scale };
}

/** Convert screen coords → world coords */
function screenToWorld(sx, sy, canvas) {
  const scale = Math.min(canvas.width / WORLD_W, canvas.height / WORLD_H);
  const offsetX = (canvas.width - WORLD_W * scale) / 2;
  const offsetY = (canvas.height - WORLD_H * scale) / 2;
  return { x: (sx - offsetX) / scale, y: (sy - offsetY) / scale };
}

/**
 * Draw a pixel-art rectangle.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} wx     - world x
 * @param {number} wy     - world y
 * @param {number} wPx    - width in pixel-art units
 * @param {number} hPx    - height in pixel-art units
 * @param {string} color
 * @param {number} scale  - worldToScreen scale factor
 */
function drawPixelRect(ctx, wx, wy, wPx, hPx, color, scale) {
  ctx.fillStyle = color;
  const { x, y } = worldToScreen(wx, wy, ctx.canvas);
  ctx.fillRect(
    Math.round(x),
    Math.round(y),
    Math.round(wPx * PIXEL_SIZE * scale),
    Math.round(hPx * PIXEL_SIZE * scale)
  );
}

/**
 * Seeded PRNG (mulberry32)
 * @param {number} seed
 * @returns {function(): number}  0‥1
 */
function mulberry32(seed) {
  let h = seed | 0;
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Hit-test a point against a list of entities (front-to-back).
 * Entities must have { x, y, width, height }.
 * @returns {object|null}
 */
function hitTest(worldX, worldY, entities) {
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    if (
      worldX >= e.x && worldX <= e.x + e.width &&
      worldY >= e.y && worldY <= e.y + e.height
    ) {
      return e;
    }
  }
  return null;
}

/* ---- Stub: renderScene (replaced in Task 02) ---- */
function renderScene(ctx, state) {
  const { x, y, scale } = worldToScreen(WORLD_W / 2, WORLD_H / 2, ctx.canvas);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `${Math.round(18 * scale)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('[ Scene goes here ]', x, y);
}

/**
 * Main render dispatcher — clears canvas and delegates to the current screen renderer.
 */
function render(state) {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Clear
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  switch (state.screen) {
    case STATES.TITLE:
      renderTitle(ctx, state);
      break;
    case STATES.BRIEFING:
      renderBriefing(ctx, state);
      break;
    case STATES.SCENE:
    case STATES.INSPECT:
      renderScene(ctx, state);
      break;
    case STATES.SOLVED:
      renderSolved(ctx, state);
      break;
    case STATES.FAILED:
      renderFailed(ctx, state);
      break;
    case STATES.VICTORY:
      renderTitle(ctx, state); // reuse title for now
      break;
  }

  // Update DOM-based UI
  renderHUD(state);
  renderCluePanel(state);
}
