/* engine.js — Game loop, state machine, input handling */
/* globals: window.Game, window.Renderer, window.Player */

(function () {
  'use strict';

  var R = window.Renderer;

  var STATES = {
    TITLE:   0,
    PLAYING: 1,
    DEAD:    2
  };

  // ── Input ──

  var keys = {};
  document.addEventListener('keydown', function (e) {
    keys[e.key] = true;
  });
  document.addEventListener('keyup', function (e) {
    keys[e.key] = false;
  });

  // ── Game state ──

  var canvas, ctx;
  var state = STATES.TITLE;
  var player = null;
  var room = null;
  var lastTime = 0;
  var score = 0;
  var floor = 1;

  // ── DOM refs ──

  var titleOverlay, hudBar, hudFloor, hudScore, hudHp;

  // ── Init ──

  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    titleOverlay = document.getElementById('title-overlay');
    hudBar       = document.getElementById('hud-bar');
    hudFloor     = document.getElementById('hud-floor');
    hudScore     = document.getElementById('hud-score');
    hudHp        = document.getElementById('hud-hp');

    // Start on title screen
    setState(STATES.TITLE);

    // Listen for ENTER to start
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        if (state === STATES.TITLE || state === STATES.DEAD) {
          startGame();
        }
      }
    });

    // Begin the game loop
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  // ── State management ──

  function setState(newState) {
    state = newState;

    if (state === STATES.TITLE) {
      titleOverlay.classList.remove('hidden');
      hudBar.classList.remove('visible');
    } else if (state === STATES.PLAYING) {
      titleOverlay.classList.add('hidden');
      hudBar.classList.add('visible');
    } else if (state === STATES.DEAD) {
      hudBar.classList.remove('visible');
      // Show death message on canvas
    }
  }

  function startGame() {
    score = 0;
    floor = 1;

    // Create a basic room
    room = {
      tiles: R.createBasicRoom()
    };

    // Spawn player in center of room (world coords)
    var spawnX = 7 * R.TILE_SIZE;  // tile 7 of 14
    var spawnY = 6 * R.TILE_SIZE;  // tile 6 of 12
    player = Player.create(spawnX, spawnY);

    setState(STATES.PLAYING);
  }

  // ── Game loop ──

  function loop(now) {
    var dt = (now - lastTime) / 1000;
    lastTime = now;

    // Clamp dt to avoid huge jumps (e.g. tab switch)
    if (dt > 0.1) dt = 0.1;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (state !== STATES.PLAYING) return;

    player.update(dt, room, keys);

    // Update HUD
    hudFloor.textContent = 'Floor ' + floor;
    hudScore.textContent = 'Score: ' + score;
    hudHp.textContent = 'HP: ' + player.hp + '/' + player.maxHp;
  }

  function render() {
    // Clear canvas
    ctx.fillStyle = R.PALETTE.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state === STATES.PLAYING) {
      // Draw room
      R.drawRoom(ctx, room);

      // Draw player
      player.draw(ctx);

    } else if (state === STATES.DEAD) {
      // Death screen
      ctx.fillStyle = R.PALETTE.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ff4444';
      ctx.font = '48px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('YOU DIED', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#e6edf3';
      ctx.font = '20px "Courier New", monospace';
      ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillText('Press ENTER to Retry', canvas.width / 2, canvas.height / 2 + 60);
    }
    // TITLE state is handled by the CSS overlay
  }

  // ── Export ──

  window.Game = {
    init:     init,
    STATES:   STATES,
    getState: function () { return state; },
    getPlayer: function () { return player; },
    getRoom:  function () { return room; },
    getKeys:  function () { return keys; },
    getScore: function () { return score; },
    getFloor: function () { return floor; },
    setState: setState,
    startGame: startGame
  };

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
