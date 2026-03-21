/* engine.js — Game loop, state machine, input handling */
/* globals: window.Game, window.Renderer, window.Player, window.Dungeon,
            window.HUD, window.Enemies, window.Combat, window.Items */

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

    // Starting room is safe — mark cleared
    var start = dungeon.rooms[1][1];
    start.cleared = true;
    start.enemies = [];
    start.items   = [];

    // Clear projectiles from previous game
    Combat.projectiles.length = 0;

    setState(STATES.PLAYING);
  }

  // ── Room enter logic ──

  function onRoomEnter(room) {
    if (!room.cleared && (!room.enemies || room.enemies.length === 0)) {
      room.enemies = Enemies.spawnForRoom(room, floor);
    }
    if (!room.items) room.items = [];
  }

  // ── Drop spawning ──

  function spawnDrops(room) {
    var ts = R.TILE_SIZE;
    // 1-3 gold
    var goldCount = 1 + Math.floor(Math.random() * 3);
    for (var g = 0; g < goldCount; g++) {
      var gx = (3 + Math.floor(Math.random() * 8)) * ts;
      var gy = (3 + Math.floor(Math.random() * 6)) * ts;
      room.items.push(Items.spawn('gold', gx, gy));
    }
    // 30% chance potion
    if (Math.random() < 0.3) {
      var px = (3 + Math.floor(Math.random() * 8)) * ts;
      var py = (3 + Math.floor(Math.random() * 6)) * ts;
      room.items.push(Items.spawn('potion', px, py));
    }
    // rare sword upgrade (10% chance, floor 2+)
    if (floor >= 2 && Math.random() < 0.1) {
      var ux = (4 + Math.floor(Math.random() * 6)) * ts;
      var uy = (3 + Math.floor(Math.random() * 6)) * ts;
      room.items.push(Items.spawn('swordUpgrade', ux, uy));
    }
  }

  // ── Door / transition logic ──

  function roomHasLiveEnemies(room) {
    if (!room || !room.enemies) return false;
    for (var i = 0; i < room.enemies.length; i++) {
      if (room.enemies[i].hp > 0) return true;
    }
    return false;
  }

  /** Which direction the player is exiting, or null */
  function checkDoorExit() {
    var room = currentRoom();
    if (!room) return null;

    // Doors locked while enemies alive
    if (roomHasLiveEnemies(room)) return null;

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

    // Clear projectiles between rooms
    Combat.projectiles.length = 0;

    // Spawn enemies in new room
    onRoomEnter(nextRoom);

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

    // Player movement
    player.update(dt, room, keys);

    // ── Combat ──
    Combat.updateSwing(dt);
    Combat.updatePlayerInv(player, dt);

    // Sword attack
    if (room.enemies && room.enemies.length > 0) {
      var killed = Combat.playerAttack(player, room.enemies, keys);
      if (killed) {
        for (var k = 0; k < killed.length; k++) {
          score += killed[k].points || 10;
        }
      }
    } else {
      // still let player swing for style
      Combat.playerAttack(player, [], keys);
    }

    // Enemy AI
    if (room.enemies) {
      Enemies.update(room.enemies, player, dt, room);
    }

    // Enemy → player contact damage
    if (room.enemies) {
      Combat.enemyContact(player, room.enemies);
    }

    // Boss projectiles
    Combat.updateProjectiles(dt, room, player);

    // Check death
    if (player.hp <= 0) {
      setState(STATES.DEAD);
      return;
    }

    // ── Room cleared check ──
    if (!room.cleared && room.enemies && !roomHasLiveEnemies(room)) {
      room.cleared = true;
      // prune dead enemies
      room.enemies = [];
      // spawn drops
      spawnDrops(room);
    }

    // ── Items ──
    if (room.items && room.items.length > 0) {
      var picked = Items.update(room.items, player, dt);
      if (picked) {
        for (var p = 0; p < picked.length; p++) {
          score += picked[p].score || 0;
        }
      }
    }

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

      // Draw items
      if (room.items && state === STATES.PLAYING) {
        Items.draw(ctx, room.items);
      }

      // Draw enemies
      if (room.enemies && state === STATES.PLAYING) {
        Enemies.draw(ctx, room.enemies);
      }

      // Draw projectiles
      if (state === STATES.PLAYING) {
        Combat.drawProjectiles(ctx);
      }

      // Draw player (not during transition fade)
      if (state === STATES.PLAYING) {
        // flash when invincible
        if (!player.invincible || Math.floor(player.invTimer * 10) % 2 === 0) {
          player.draw(ctx);
        }
        Combat.drawSword(ctx, player);
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
      ctx.fillText('Floor: ' + floor, canvas.width / 2, canvas.height / 2 + 50);
      ctx.fillText('Press ENTER to Retry', canvas.width / 2, canvas.height / 2 + 90);
    }
  }

  // ── Door rendering ──

  function drawDoors(ctx, room) {
    if (!room || !room.doors) return;

    var hasEnemies = roomHasLiveEnemies(room);
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
    init:       init,
    STATES:     STATES,
    getState:   function () { return state; },
    getPlayer:  function () { return player; },
    getDungeon: function () { return dungeon; },
    getKeys:    function () { return keys; },
    getScore:   function () { return score; },
    getFloor:   function () { return floor; },
    setState:   setState,
    startGame:  startGame
  };

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
