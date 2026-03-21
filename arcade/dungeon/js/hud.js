/* hud.js — HUD overlay and minimap */
/* globals: window.HUD, window.Renderer */

(function () {
  'use strict';

  var R = window.Renderer;

  var minimapCanvas, minimapCtx;
  var hudFloor, hudHearts, hudGold, hudKey, hudDamage;

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
    hudFloor  = document.getElementById('hud-floor');
    hudHearts = document.getElementById('hud-hearts');
    hudGold   = document.getElementById('hud-gold');
    hudKey    = document.getElementById('hud-key');
    hudDamage = document.getElementById('hud-damage');
  }

  // ── update HUD text ──

  function update(gameState) {
    if (!hudFloor) return;

    // Floor
    hudFloor.textContent = 'Floor ' + (gameState.floor || 1);

    // Hearts
    if (gameState.player) {
      var p = gameState.player;
      var hearts = '';
      var maxHearts = Math.ceil(p.maxHp / 2);
      var cur = p.hp;
      for (var i = 0; i < maxHearts; i++) {
        if (cur >= 2) {
          hearts += '❤️';
          cur -= 2;
        } else if (cur === 1) {
          hearts += '💔';
          cur = 0;
        } else {
          hearts += '🖤';
        }
      }
      hudHearts.textContent = hearts;

      // Damage
      hudDamage.textContent = '⚔️ ' + (p.swordDamage || 2);

      // Key indicator
      if (p.hasKey) {
        hudKey.classList.remove('hud-hidden');
      } else {
        hudKey.classList.add('hud-hidden');
      }
    }

    // Gold
    hudGold.textContent = '🪙 ' + (gameState.gold || 0);
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

        // Room type icons on visited rooms
        if (room.visited || (row === cur.row && col === cur.col)) {
          if (room.type === 'key') {
            c.fillStyle = R.PALETTE.key;
            c.font = (CELL_SIZE * 0.5) + 'px monospace';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText('K', x + CELL_SIZE / 2, y + CELL_SIZE / 2);
          } else if (room.type === 'stairs') {
            c.fillStyle = R.PALETTE.stairs;
            c.font = (CELL_SIZE * 0.5) + 'px monospace';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText('S', x + CELL_SIZE / 2, y + CELL_SIZE / 2);
          }
        }

        // Draw door connections as thin lines
        if (room.visited || (row === cur.row && col === cur.col)) {
          c.fillStyle = R.PALETTE.minimapRoom;
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
