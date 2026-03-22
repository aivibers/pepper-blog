/* engine.js — Game loop, state machine, input handling */
/* globals: window.Game, window.Renderer, window.Player, window.Dungeon,
            window.HUD, window.Enemies, window.Combat, window.Items, window.SFX */

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
  var gold = 0;
  var kills = 0;
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

    // Listen for SPACE to start / restart
    document.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter') {
        if (state === STATES.TITLE) {
          startGame();
        } else if (state === STATES.DEAD) {
          startGame();
        }
      }
    });

    // Also listen for click/tap to start / restart (mobile + desktop)
    document.addEventListener('click', function () {
      if (state === STATES.TITLE) {
        startGame();
      } else if (state === STATES.DEAD) {
        startGame();
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
      titleOverlay.classList.add('hidden');
      hudBar.classList.remove('visible');
    }
  }

  function startGame() {
    score = 0;
    gold  = 0;
    kills = 0;
    floor = 1;

    // Generate dungeon
    dungeon = Dungeon.generate(floor);

    // Spawn player in center of starting room
    var spawnX = 7 * R.TILE_SIZE;
    var spawnY = 6 * R.TILE_SIZE;
    player = Player.create(spawnX, spawnY);
    player.hasKey = false;
    player.gold = 0;

    // Starting room is safe — mark cleared
    var start = dungeon.rooms[1][1];
    start.cleared = true;
    start.enemies = [];
    start.items   = [];

    // Spawn key in key room
    spawnKeyInRoom();

    // Clear projectiles from previous game
    Combat.projectiles.length = 0;

    setState(STATES.PLAYING);
  }

  // ── Floor progression ──

  function advanceFloor() {
    floor++;
    SFX.play('stairs');

    // Generate new dungeon
    dungeon = Dungeon.generate(floor);

    // Reset player position, keep stats
    var spawnX = 7 * R.TILE_SIZE;
    var spawnY = 6 * R.TILE_SIZE;
    player.x = spawnX;
    player.y = spawnY;
    player.hasKey = false;
    player.invincible = false;
    player.invTimer = 0;
    player.knockbackTimer = 0;

    // Starting room safe
    var start = dungeon.rooms[1][1];
    start.cleared = true;
    start.enemies = [];
    start.items   = [];

    // Spawn key in key room
    spawnKeyInRoom();

    // Clear projectiles
    Combat.projectiles.length = 0;
  }

  function spawnKeyInRoom() {
    var kr = dungeon.keyRoom;
    var keyRoom = dungeon.rooms[kr.row][kr.col];
    if (!keyRoom.items) keyRoom.items = [];
    // Spawn key in center of key room
    var ts = R.TILE_SIZE;
    keyRoom.items.push(Items.spawn('key', 7 * ts, 5 * ts));
  }

  // ── Room enter logic ──

  function onRoomEnter(room) {
    if (!room.cleared && (!room.enemies || room.enemies.length === 0)) {
      room.enemies = Enemies.spawnForRoom(room, floor);
    }
    if (!room.items) room.items = [];
    SFX.play('door');
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

  // ── Stairs check ──

  function checkStairs() {
    if (!player.hasKey) return false;

    var cr = dungeon.currentRoom;
    var sr = dungeon.stairsRoom;

    // Are we in the stairs room?
    if (cr.row !== sr.row || cr.col !== sr.col) return false;

    var room = currentRoom();
    if (roomHasLiveEnemies(room)) return false;

    // Check if player is standing on the stairs tile area (center of room)
    var ts = R.TILE_SIZE;
    var stairsX = 6.5 * ts;
    var stairsY = 5.5 * ts;
    var ps = player.size || 12;
    var cx = player.x + ps / 2;
    var cy = player.y + ps / 2;
    var dist = Math.sqrt((cx - stairsX) * (cx - stairsX) + (cy - stairsY) * (cy - stairsY));

    if (dist < ts * 1.5) {
      advanceFloor();
      return true;
    }
    return false;
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
          kills++;
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
          if (picked[p].type === 'gold') {
            gold++;
          }
        }
      }
    }

    // Check stairs
    if (checkStairs()) return;

    // Check door exit
    var exitDir = checkDoorExit();
    if (exitDir) {
      beginTransition(exitDir);
      return;
    }

    // Update HUD
    HUD.update({ floor: floor, score: score, gold: gold, player: player });
  }

  function render() {
    // Clear canvas
    ctx.fillStyle = R.PALETTE.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state === STATES.PLAYING || state === STATES.ROOM_TRANSITION) {
      var room = currentRoom();

      // Draw room tiles
      R.drawRoom(ctx, room);

      // Draw stairs tile in stairs room
      drawStairsTile(ctx, room);

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
      renderDeathScreen();
    }
  }

  // ── Death screen ──

  function renderDeathScreen() {
    ctx.fillStyle = R.PALETTE.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Vignette
    var grd = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 50,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.6
    );
    grd.addColorStop(0, 'rgba(80,0,0,0.3)');
    grd.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';

    // YOU DIED
    ctx.fillStyle = '#ff2222';
    ctx.font = 'bold 56px "Courier New", monospace';
    ctx.fillText('YOU DIED', canvas.width / 2, canvas.height / 2 - 60);

    // Decorative line
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(canvas.width / 2 - 120, canvas.height / 2 - 35, 240, 2);

    // Stats
    ctx.font = '18px "Courier New", monospace';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('Floor: ' + floor, canvas.width / 2, canvas.height / 2 + 5);

    ctx.fillStyle = '#e6edf3';
    ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 35);

    ctx.fillStyle = '#e6edf3';
    ctx.fillText('Kills: ' + kills, canvas.width / 2, canvas.height / 2 + 60);

    ctx.fillStyle = '#ffd700';
    ctx.fillText('Gold: ' + gold, canvas.width / 2, canvas.height / 2 + 85);

    // Prompt
    ctx.fillStyle = '#888';
    ctx.font = '16px "Courier New", monospace';
    var blink = Math.sin(performance.now() / 400) > 0;
    if (blink) {
      ctx.fillText('Press SPACE to Restart', canvas.width / 2, canvas.height / 2 + 130);
    }
  }

  // ── Stairs tile rendering ──

  function drawStairsTile(ctx, room) {
    if (!dungeon) return;
    var cr = dungeon.currentRoom;
    var sr = dungeon.stairsRoom;
    if (cr.row !== sr.row || cr.col !== sr.col) return;

    var ts = R.RENDER_TILE;
    // Draw golden stairs at center (cols 6-7, rows 5-6)
    var stairCells = [
      { r: 5, c: 6 }, { r: 5, c: 7 },
      { r: 6, c: 6 }, { r: 6, c: 7 }
    ];

    for (var i = 0; i < stairCells.length; i++) {
      var sc = stairCells[i];
      var sx = sc.c * ts;
      var sy = sc.r * ts;

      // Golden base
      ctx.fillStyle = player && player.hasKey ? '#ffd700' : '#8B6914';
      ctx.fillRect(sx + 4, sy + 4, ts - 8, ts - 8);

      // Step lines
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      for (var j = 0; j < 3; j++) {
        ctx.fillRect(sx + 6, sy + 8 + j * 12, ts - 12, 2);
      }

      // Sparkle when player has key
      if (player && player.hasKey) {
        var sparkle = Math.sin(performance.now() / 200 + i) * 0.3 + 0.4;
        ctx.fillStyle = 'rgba(255,255,255,' + sparkle + ')';
        ctx.fillRect(sx + ts / 2 - 3, sy + ts / 2 - 3, 6, 6);
      }
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
    getKills:   function () { return kills; },
    getGold:    function () { return gold; },
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
