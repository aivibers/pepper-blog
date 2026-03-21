/* ui.js — HUD rendering, clue panel, title screen, briefing, status bar, accusation flow */

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

  // Case number
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `${Math.round(16 * scale)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`CASE ${state.caseIndex + 1}`, cx, canvas.height * 0.2);

  // Case title
  ctx.fillStyle = PALETTE.accent;
  ctx.font = `bold ${Math.round(36 * scale)}px ui-monospace, monospace`;
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
  ctx.fillText('🎉 Case Solved!', cx, canvas.height * 0.30);

  // Stars
  const starStr = '★'.repeat(state.stars) + '☆'.repeat(3 - state.stars);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `${Math.round(36 * scale)}px ui-monospace, monospace`;
  ctx.fillText(starStr, cx, canvas.height * 0.45);

  // Score
  ctx.fillStyle = PALETTE.text;
  ctx.font = `${Math.round(20 * scale)}px ui-monospace, monospace`;
  ctx.fillText(`Score: ${state.score}`, cx, canvas.height * 0.55);

  // Solution text
  if (state.currentCase && state.currentCase.solution) {
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = `${Math.round(16 * scale)}px ui-monospace, monospace`;
    ctx.fillText(state.currentCase.solution, cx, canvas.height * 0.65);
  }

  // Next case or victory prompt
  const isLastCase = typeof CASES !== 'undefined' && state.caseIndex + 1 >= CASES.length;
  ctx.fillStyle = PALETTE.accent;
  ctx.font = `${Math.round(18 * scale)}px ui-monospace, monospace`;
  ctx.fillText(
    isLastCase ? 'Click to See Final Score →' : 'Click for Next Case →',
    cx, canvas.height * 0.80
  );
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
  ctx.fillText('Case Failed', cx, canvas.height * 0.35);

  // Empty stars
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `${Math.round(36 * scale)}px ui-monospace, monospace`;
  ctx.fillText('☆☆☆', cx, canvas.height * 0.48);

  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `${Math.round(18 * scale)}px ui-monospace, monospace`;
  ctx.fillText('The culprit got away...', cx, canvas.height * 0.58);

  ctx.fillStyle = PALETTE.text;
  ctx.font = `${Math.round(20 * scale)}px ui-monospace, monospace`;
  ctx.fillText('Click to Try Again', cx, canvas.height * 0.72);
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
 * Update clue panel DOM with match highlighting during INSPECT.
 */
function renderCluePanel(state) {
  const listEl = document.getElementById('clue-list');
  if (!listEl) return;

  if (!state.currentCase || !state.currentCase.clues ||
      state.screen === STATES.TITLE || state.screen === STATES.VICTORY) {
    listEl.innerHTML = '';
    return;
  }

  const inspecting = state.screen === STATES.INSPECT && state.selectedCharacter;
  const attrs = inspecting ? (state.selectedCharacter.attributes || {}) : null;

  listEl.innerHTML = state.currentCase.clues.map(clue => {
    // Red herring and flavor clues always show as neutral
    if (clue.type === 'redHerring' || clue.type === 'flavor') {
      return `<li class="clue-neutral">${clue.text}</li>`;
    }

    // During inspection, highlight matching/non-matching clues
    if (inspecting && attrs) {
      const matches = attrs[clue.attribute] === clue.value;
      const cls = matches ? 'clue-match' : 'clue-mismatch';
      return `<li class="${cls}">${clue.text}</li>`;
    }

    // Default: unchecked
    return `<li>${clue.text}</li>`;
  }).join('');
}

/**
 * Show selected character info in suspect panel, or clear it.
 */
function renderSuspectInfo(state) {
  const el = document.getElementById('suspect-info');
  if (!el) return;

  if (!state.selectedCharacter || state.screen !== STATES.INSPECT) {
    el.innerHTML = '<span style="color:#8b949e">Select a suspect…</span>';
    return;
  }

  const c = state.selectedCharacter;
  const desc = describeCharacter(c);

  el.innerHTML = `
    <div class="suspect-name">Suspect #${c.id}</div>
    <div class="suspect-desc">${desc}</div>
    <div class="suspect-buttons">
      <button class="btn-accuse" onclick="handleAccuse()">⚡ Accuse</button>
      <button class="btn-back" onclick="handleDismiss()">← Back</button>
    </div>
  `;
}

/**
 * Dismiss suspect inspection, return to scene.
 */
function handleDismiss() {
  setState({ screen: STATES.SCENE, selectedCharacter: null });
  renderSuspectInfo(gameState);
  renderStatusBar('Click on suspects to inspect them');
}

/**
 * Update status bar text.
 */
function renderStatusBar(message) {
  const el = document.getElementById('status-bar');
  if (el) el.textContent = message;
}
