/* ui.js — HUD rendering, clue panel, title screen, briefing, status bar, accusation flow */

/**
 * Render title screen on canvas.
 */
function renderTitle(ctx, state) {
  const canvas = ctx.canvas;
  const { scale } = worldToScreen(0, 0, canvas);

  const cx = canvas.width / 2;
  const cy = canvas.height * 0.38;

  // Subtle animated dots in background
  const t = Date.now() / 1000;
  ctx.fillStyle = 'rgba(240, 136, 62, 0.08)';
  for (let i = 0; i < 30; i++) {
    const dx = ((i * 137.5 + t * 10) % canvas.width);
    const dy = ((i * 97.3 + Math.sin(t + i) * 20) % canvas.height);
    const r = 2 + Math.sin(t * 0.5 + i) * 1.5;
    ctx.beginPath();
    ctx.arc(dx, dy, Math.max(1, r * scale), 0, Math.PI * 2);
    ctx.fill();
  }

  // Title text
  ctx.fillStyle = PALETTE.accent;
  ctx.font = `bold ${Math.round(64 * scale)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("PEPPER'S MYSTERY", cx, cy);

  // Magnifying glass icon (circle + line, drawn on canvas)
  const mgX = cx;
  const mgY = cy + 70 * scale;
  const mgR = 18 * scale;
  ctx.strokeStyle = PALETTE.text;
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.beginPath();
  ctx.arc(mgX, mgY, mgR, 0, Math.PI * 2);
  ctx.stroke();
  // Handle
  ctx.beginPath();
  ctx.moveTo(mgX + mgR * 0.7, mgY + mgR * 0.7);
  ctx.lineTo(mgX + mgR * 1.4, mgY + mgR * 1.4);
  ctx.stroke();
  // Lens highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.beginPath();
  ctx.arc(mgX - mgR * 0.2, mgY - mgR * 0.2, mgR * 0.5, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();

  // Subtitle
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `${Math.round(18 * scale)}px ui-monospace, monospace`;
  ctx.fillText('A Point-and-Click Detective Game', cx, cy + 130 * scale);

  // Prompt — pulsing
  ctx.fillStyle = PALETTE.text;
  ctx.font = `${Math.round(20 * scale)}px ui-monospace, monospace`;
  ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 600));
  ctx.fillText('\uD83D\uDD0D Click to Start', cx, canvas.height * 0.72);
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
  const totalCases = typeof CASES !== 'undefined' ? CASES.length : '?';

  // Case number with "of N"
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `${Math.round(16 * scale)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`CASE ${state.caseIndex + 1} OF ${totalCases}`, cx, canvas.height * 0.2);

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
  ctx.fillText('\uD83C\uDF89 Case Solved!', cx, canvas.height * 0.30);

  // Stars
  const starStr = '\u2605'.repeat(state.stars) + '\u2606'.repeat(3 - state.stars);
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
    isLastCase ? 'Click to See Final Score \u2192' : 'Click for Next Case \u2192',
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
  ctx.fillText('\u2606\u2606\u2606', cx, canvas.height * 0.48);

  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `${Math.round(18 * scale)}px ui-monospace, monospace`;
  ctx.fillText('The culprit got away...', cx, canvas.height * 0.58);

  ctx.fillStyle = PALETTE.text;
  ctx.font = `${Math.round(20 * scale)}px ui-monospace, monospace`;
  ctx.fillText('Click to Try Again', cx, canvas.height * 0.72);
}

/**
 * Render Victory screen — shown after all cases solved.
 */
function renderVictory(ctx, state) {
  const canvas = ctx.canvas;
  const { scale } = worldToScreen(0, 0, canvas);
  const cx = canvas.width / 2;

  // Animated background sparkles
  const t = Date.now() / 1000;
  ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
  for (let i = 0; i < 40; i++) {
    const dx = ((i * 113.7 + t * 15) % canvas.width);
    const dy = ((i * 89.3 + Math.sin(t * 0.8 + i) * 30) % canvas.height);
    const r = 2 + Math.sin(t * 0.7 + i * 0.5) * 1.5;
    ctx.beginPath();
    ctx.arc(dx, dy, Math.max(1, r * scale), 0, Math.PI * 2);
    ctx.fill();
  }

  // Header
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold ${Math.round(52 * scale)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ALL CASES SOLVED!', cx, canvas.height * 0.22);

  // Magnifying glass
  ctx.font = `${Math.round(48 * scale)}px serif`;
  ctx.fillText('\uD83D\uDD0D', cx, canvas.height * 0.34);

  // Total score
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold ${Math.round(32 * scale)}px ui-monospace, monospace`;
  ctx.fillText(`Final Score: ${state.score}`, cx, canvas.height * 0.48);

  // Star rating based on total score — perfect is 900 (3 cases × 3 stars × 100)
  const maxScore = (typeof CASES !== 'undefined' ? CASES.length : 3) * 300;
  let totalStars;
  if (state.score >= maxScore) {
    totalStars = 3;
  } else if (state.score >= maxScore * 0.6) {
    totalStars = 2;
  } else {
    totalStars = 1;
  }
  const starStr = '\u2605'.repeat(totalStars) + '\u2606'.repeat(3 - totalStars);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `${Math.round(40 * scale)}px ui-monospace, monospace`;
  ctx.fillText(starStr, cx, canvas.height * 0.58);

  // Rating label
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `${Math.round(16 * scale)}px ui-monospace, monospace`;
  const ratingLabel = totalStars === 3 ? 'Perfect Detective!' :
                      totalStars === 2 ? 'Great Work, Detective!' :
                      'Case Closed — Keep Practicing!';
  ctx.fillText(ratingLabel, cx, canvas.height * 0.66);

  // Score breakdown
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `${Math.round(14 * scale)}px ui-monospace, monospace`;
  ctx.fillText(`${state.score} / ${maxScore} points`, cx, canvas.height * 0.73);

  // Play again prompt
  ctx.fillStyle = PALETTE.accent;
  ctx.font = `${Math.round(20 * scale)}px ui-monospace, monospace`;
  ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 600));
  ctx.fillText('\uD83D\uDD04 Click to Play Again', cx, canvas.height * 0.84);
  ctx.globalAlpha = 1;
}

/**
 * Update HUD DOM elements.
 */
function renderHUD(state) {
  const starsEl = document.getElementById('hud-stars');
  const caseEl = document.getElementById('hud-case');
  if (starsEl) {
    starsEl.textContent = '\u2605'.repeat(state.stars) + '\u2606'.repeat(Math.max(0, 3 - state.stars));
  }
  if (caseEl) {
    if (state.currentCase) {
      const totalCases = typeof CASES !== 'undefined' ? CASES.length : '?';
      caseEl.textContent = `Case ${state.caseIndex + 1}/${totalCases}`;
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
    el.innerHTML = '<span style="color:#8b949e">Select a suspect\u2026</span>';
    return;
  }

  const c = state.selectedCharacter;
  const desc = describeCharacter(c);

  el.innerHTML = `
    <div class="suspect-name">Suspect #${c.id}</div>
    <div class="suspect-desc">${desc}</div>
    <div class="suspect-buttons">
      <button class="btn-accuse" onclick="handleAccuse()">\u26A1 Accuse</button>
      <button class="btn-back" onclick="handleDismiss()">\u2190 Back</button>
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
