/* hud.js — HUD overlay and minimap */
/* globals: window.HUD, window.Renderer */

(function () {
  'use strict';

  var R = window.Renderer;

  var minimapCanvas, minimapCtx;
  var hudFloor, hudScore, hudHp;

  /* Minimap sizing */
  var MAP_SIZE  = 120;  // canvas px
  var CELL_PAD  = 4;
  var CELL_SIZE = Math.floor((MAP_SIZE - CELL_PAD * 4) / 3);

  // ── init ──

  function init() {
    // Create minimap canvas
    minimapCanvas = document.createElement('canvas');
    minimapCanvas.id = 'minimap';
    minimapCanvas.width  = MAP_SIZE;
    minimapCanvas.height = MAP_SIZE;
    minimapCanvas.style.cssText =
      'position:absolute;top:8px;right:8px;' +
      'border:2px solid ' + R.PALETTE.wallTop + ';' +
      'background:rgba(13,17,23,0.85);' +
      'image-rendering:pixelated;z-index:6;border-radius:4px;';
    document.getElementById('game-container').appendChild(minimapCanvas);
    minimapCtx = minimapCanvas.getContext('2d');

    // Cache HUD DOM refs
    hudFloor = document.getElementById('hud-floor');
    hudScore = document.getElementById('hud-score');
    hudHp    = document.getElementById('hud-hp');
  }

  // ── update HUD text ──

  function update(gameState) {
    if (!hudFloor) return;
    hudFloor.textContent = 'Floor ' + (gameState.floor || 1);
    hudScore.textContent = 'Score: ' + (gameState.score || 0);
    if (gameState.player) {
      hudHp.textContent = 'HP: ' + gameState.player.hp + '/' + gameState.player.maxHp;
    }
  }

  // ── draw minimap ──

  function drawMinimap(ctx, dungeon) {
    if (!dungeon) return;
    var c = minimapCtx;
    c.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

    var rooms = dungeon.rooms;
    var cur   = dungeon.currentRoom;

    for (var row = 0; row < 3; row++) {
      for (var col = 0; col < 3; col++) {
        var room = rooms[row][col];
        if (!room) continue;

        var x = CELL_PAD + col * (CELL_SIZE + CELL_PAD);
        var y = CELL_PAD + row * (CELL_SIZE + CELL_PAD);

        if (row === cur.row && col === cur.col) {
          c.fillStyle = R.PALETTE.minimapCurrent;
        } else if (room.visited) {
          c.fillStyle = R.PALETTE.minimapRoom;
        } else {
          c.fillStyle = R.PALETTE.minimapUnvisited;
        }
        c.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Draw door connections as thin lines
        if (room.visited || row === cur.row && col === cur.col) {
          c.fillStyle = c.fillStyle; // same color
          var mid = CELL_SIZE / 2;
          var lineW = 4;
          if (room.doors.n) {
            c.fillRect(x + mid - lineW / 2, y - CELL_PAD, lineW, CELL_PAD);
          }
          if (room.doors.s) {
            c.fillRect(x + mid - lineW / 2, y + CELL_SIZE, lineW, CELL_PAD);
          }
          if (room.doors.w) {
            c.fillRect(x - CELL_PAD, y + mid - lineW / 2, CELL_PAD, lineW);
          }
          if (room.doors.e) {
            c.fillRect(x + CELL_SIZE, y + mid - lineW / 2, CELL_PAD, lineW);
          }
        }
      }
    }
  }

  // ── export ──

  window.HUD = {
    init:        init,
    update:      update,
    drawMinimap: drawMinimap
  };
})();
