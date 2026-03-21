/* ui.js — HUD rendering, clue panel, title screen, briefing, status bar */

/**
 * Render title screen on canvas.
 */
function renderTitle(ctx, state) {
  const canvas = ctx.canvas;
  const { scale } = worldToScreen(0, 0, canvas);

  // Title text
  ctx.fillStyle = PALETTE.accent;
  ctx.font = `bold ${Math.round(64 * scale)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = canvas.width / 2;
  const cy = canvas.height * 0.38;

  ctx.fillText("PEPPER'S MYSTERY", cx, cy);

  // Magnifying glass emoji below title
  ctx.font = `${Math.round(48 * scale)}px serif`;
  ctx.fillText('🔍', cx, cy + 70 * scale);

  // Subtitle
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `${Math.round(18 * scale)}px ui-monospace, monospace`;
  ctx.fillText('A Point-and-Click Detective Game', cx, cy + 130 * scale);

  // Prompt
  ctx.fillStyle = PALETTE.text;
  ctx.font = `${Math.round(20 * scale)}px ui-monospace, monospace`;
  ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 600));
  ctx.fillText('Click to Start', cx, canvas.height * 0.72);
  ctx.globalAlpha = 1;
}

/**
 * Render briefing screen on canvas.
 */
function renderBriefing(ctx, state) {
  const canvas = ctx.canvas;
  const { scale } = worldToScreen(0, 0, canvas);
  const cx = canvas.width / 2;

  const caseData = state.currentCase;
  const title = caseData ? caseData.title : 'No cases loaded yet';
  const briefing = caseData ? caseData.briefing : 'Cases will be added in a future update.';

  // Case title
  ctx.fillStyle = PALETTE.accent;
  ctx.font = `bold ${Math.round(36 * scale)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, cx, canvas.height * 0.3);

  // Briefing text — word-wrap
  ctx.fillStyle = PALETTE.text;
  ctx.font = `${Math.round(16 * scale)}px ui-monospace, monospace`;
  const maxWidth = canvas.width * 0.7;
  const words = briefing.split(' ');
  let line = '';
  let lineY = canvas.height * 0.45;
  const lineH = 24 * scale;

  for (const word of words) {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, lineY);
      line = word;
      lineY += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, lineY);

  // Prompt
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `${Math.round(18 * scale)}px ui-monospace, monospace`;
  ctx.fillText('Click to Begin Investigation', cx, canvas.height * 0.78);
}

/**
 * Render "Case Solved!" screen on canvas.
 */
function renderSolved(ctx, state) {
  const canvas = ctx.canvas;
  const { scale } = worldToScreen(0, 0, canvas);
  const cx = canvas.width / 2;

  ctx.fillStyle = PALETTE.green;
  ctx.font = `bold ${Math.round(48 * scale)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Case Solved!', cx, canvas.height * 0.35);

  // Stars
  const starStr = '★'.repeat(state.stars) + '☆'.repeat(3 - state.stars);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `${Math.round(36 * scale)}px ui-monospace, monospace`;
  ctx.fillText(starStr, cx, canvas.height * 0.50);

  // Score
  ctx.fillStyle = PALETTE.text;
  ctx.font = `${Math.round(20 * scale)}px ui-monospace, monospace`;
  ctx.fillText(`Score: ${state.score}`, cx, canvas.height * 0.60);

  // Solution text
  if (state.currentCase && state.currentCase.solution) {
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = `${Math.round(16 * scale)}px ui-monospace, monospace`;
    ctx.fillText(state.currentCase.solution, cx, canvas.height * 0.68);
  }

  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `${Math.round(18 * scale)}px ui-monospace, monospace`;
  ctx.fillText('Click to Continue', cx, canvas.height * 0.80);
}

/**
 * Render "Case Failed" screen on canvas.
 */
function renderFailed(ctx, state) {
  const canvas = ctx.canvas;
  const { scale } = worldToScreen(0, 0, canvas);
  const cx = canvas.width / 2;

  ctx.fillStyle = PALETTE.red;
  ctx.font = `bold ${Math.round(48 * scale)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Case Failed', cx, canvas.height * 0.38);

  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `${Math.round(18 * scale)}px ui-monospace, monospace`;
  ctx.fillText('The culprit got away...', cx, canvas.height * 0.52);

  ctx.fillStyle = PALETTE.text;
  ctx.font = `${Math.round(20 * scale)}px ui-monospace, monospace`;
  ctx.fillText('Click to Retry', cx, canvas.height * 0.68);
}

/**
 * Update HUD DOM elements.
 */
function renderHUD(state) {
  const starsEl = document.getElementById('hud-stars');
  const caseEl = document.getElementById('hud-case');
  if (starsEl) {
    starsEl.textContent = '★'.repeat(state.stars) + '☆'.repeat(Math.max(0, 3 - state.stars));
  }
  if (caseEl) {
    if (state.currentCase) {
      caseEl.textContent = `Case ${state.caseIndex + 1}`;
    } else {
      caseEl.textContent = '';
    }
  }
}

/**
 * Update clue panel DOM.
 */
function renderCluePanel(state) {
  const listEl = document.getElementById('clue-list');
  if (!listEl) return;

  if (!state.currentCase || !state.currentCase.clues) {
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = state.currentCase.clues.map(clue => {
    const cls = clue.type === 'redHerring' ? ' class="red-herring"' : '';
    return `<li${cls}>${clue.text}</li>`;
  }).join('');
}

/**
 * Show selected character info in suspect panel, or clear it.
 */
function renderSuspectInfo(state) {
  const el = document.getElementById('suspect-info');
  if (!el) return;

  if (!state.selectedCharacter) {
    el.innerHTML = '<span style="color:#8b949e">Select a suspect…</span>';
    return;
  }

  const c = state.selectedCharacter;
  const attrs = c.attributes || {};
  const details = Object.entries(attrs)
    .filter(([, v]) => v !== false && v !== null && v !== undefined && v !== 'none')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  el.innerHTML = `
    <div class="suspect-name">Suspect #${c.id}</div>
    <div class="suspect-attrs">${details || 'No distinguishing features'}</div>
    <button onclick="handleAccuse()">Accuse</button>
  `;
}

/**
 * Update status bar text.
 */
function renderStatusBar(message) {
  const el = document.getElementById('status-bar');
  if (el) el.textContent = message;
}
