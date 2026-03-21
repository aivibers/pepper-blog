/* engine.js — Game loop, state machine, input handling */
/* globals: window.Game, window.Renderer, window.Player, window.Dungeon, window.HUD */

(function () {
  'use strict';

  var R = window.Renderer;

  var STATES = {
    TITLE:           0,
    PLAYING:         1,
    DEAD:            2,
    ROOM_TRANSITION: 3
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
  var dungeon = null;
  var lastTime = 0;
  var score = 0;
  var floor = 1;
  var transitionTimer = 0;

  // ── DOM refs ──

  var titleOverlay, hudBar;

  // ── helpers ──

  function currentRoom() {
    if (!dungeon) return null;
    var cr = dungeon.currentRoom;
    return dungeon.rooms[cr.row][cr.col];
  }

  // ── Init ──

  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    titleOverlay = document.getElementById('title-overlay');
    hudBar       = document.getElementById('hud-bar');

    HUD.init();

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
    } else if (state === STATES.PLAYING || state === STATES.ROOM_TRANSITION) {
      titleOverlay.classList.add('hidden');
      hudBar.classList.add('visible');
    } else if (state === STATES.DEAD) {
      hudBar.classList.remove('visible');
    }
  }

  function startGame() {
    score = 0;
    floor = 1;

    // Generate dungeon
    dungeon = Dungeon.generate(floor);

    // Spawn player in center of starting room
    var spawnX = 7 * R.TILE_SIZE;
    var spawnY = 6 * R.TILE_SIZE;
    player = Player.create(spawnX, spawnY);

    setState(STATES.PLAYING);
  }

  // ── Door / transition logic ──

  /** Which direction the player is exiting, or null */
  function checkDoorExit() {
    var room = currentRoom();
    if (!room) return null;
    var ts = R.TILE_SIZE;
    var ps = Player.PLAYER_SIZE;

    // north door — top of tile row 0
    if (room.doors.n && player.y < 0) return 'n';
    // south door — past bottom wall
    if (room.doors.s && player.y + ps > (R.FULL_ROOM_H - 1) * ts) return 's';
    // west door
    if (room.doors.w && player.x < 0) return 'w';
    // east door
    if (room.doors.e && player.x + ps > (R.FULL_ROOM_W - 1) * ts) return 'e';

    return null;
  }

  function beginTransition(dir) {
    var off = Dungeon.DIR_OFFSET[dir];
    var cr  = dungeon.currentRoom;
    var nr  = cr.row + off.dr;
    var nc  = cr.col + off.dc;

    dungeon.currentRoom = { row: nr, col: nc };
    var nextRoom = dungeon.rooms[nr][nc];
    nextRoom.visited = true;

    // Reposition player at opposite door
    var ts = R.TILE_SIZE;
    var ps = Player.PLAYER_SIZE;
    switch (dir) {
      case 'n':
        player.x = 6.5 * ts - ps / 2;
        player.y = (R.FULL_ROOM_H - 2) * ts - ps;
        break;
      case 's':
        player.x = 6.5 * ts - ps / 2;
        player.y = 1 * ts + 2;
        break;
      case 'w':
        player.x = (R.FULL_ROOM_W - 2) * ts - ps;
        player.y = 5.5 * ts - ps / 2;
        break;
      case 'e':
        player.x = 1 * ts + 2;
        player.y = 5.5 * ts - ps / 2;
        break;
    }

    transitionTimer = 0.3;
    setState(STATES.ROOM_TRANSITION);
  }

  // ── Game loop ──

  function loop(now) {
    var dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (state === STATES.ROOM_TRANSITION) {
      transitionTimer -= dt;
      if (transitionTimer <= 0) {
        setState(STATES.PLAYING);
      }
      return;
    }

    if (state !== STATES.PLAYING) return;

    var room = currentRoom();
    player.update(dt, room, keys);

    // Check door exit
    var exitDir = checkDoorExit();
    if (exitDir) {
      beginTransition(exitDir);
      return;
    }

    // Update HUD
    HUD.update({ floor: floor, score: score, player: player });
  }

  function render() {
    // Clear canvas
    ctx.fillStyle = R.PALETTE.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state === STATES.PLAYING || state === STATES.ROOM_TRANSITION) {
      var room = currentRoom();

      // Draw room tiles
      R.drawRoom(ctx, room);

      // Draw doors
      drawDoors(ctx, room);

      // Draw player (not during transition fade)
      if (state === STATES.PLAYING) {
        player.draw(ctx);
      }

      // Transition darkening overlay
      if (state === STATES.ROOM_TRANSITION) {
        var alpha = Math.min(1, transitionTimer / 0.15);
        ctx.fillStyle = 'rgba(13,17,23,' + (0.7 * alpha) + ')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Minimap
      HUD.drawMinimap(ctx, dungeon);

    } else if (state === STATES.DEAD) {
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
  }

  // ── Door rendering ──

  function drawDoors(ctx, room) {
    if (!room || !room.doors) return;

    var hasEnemies = room.enemies && room.enemies.length > 0 && !room.cleared;
    var color = hasEnemies ? R.PALETTE.doorLocked : R.PALETTE.door;

    for (var dir in room.doors) {
      if (!room.doors[dir]) continue;

      var positions = Dungeon.DOOR_POS[dir];
      for (var i = 0; i < positions.length; i++) {
        var pr = positions[i].r;
        var pc = positions[i].c;
        var sx = pc * R.RENDER_TILE;
        var sy = pr * R.RENDER_TILE;

        // Draw door frame (slightly inset)
        ctx.fillStyle = color;
        ctx.fillRect(sx + 4, sy + 4, R.RENDER_TILE - 8, R.RENDER_TILE - 8);

        // Small highlight for depth
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(sx + 4, sy + 4, R.RENDER_TILE - 8, 6);
      }
    }
  }

  // ── Export ──

  window.Game = {
    init:      init,
    STATES:    STATES,
    getState:  function () { return state; },
    getPlayer: function () { return player; },
    getDungeon: function () { return dungeon; },
    getKeys:   function () { return keys; },
    getScore:  function () { return score; },
    getFloor:  function () { return floor; },
    setState:  setState,
    startGame: startGame
  };

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
