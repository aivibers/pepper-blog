/* player.js — Player creation, movement, collision, drawing */
/* globals: window.Player, window.Renderer */

(function () {
  'use strict';

  var R = window.Renderer;

  var PLAYER_SIZE = 12;  // player hitbox in world units (12x12 within 16x16 tile)

  /**
   * Create a player object at the given world position.
   * startX, startY are in world units (tile * TILE_SIZE).
   */
  function create(startX, startY) {
    var player = {
      x: startX,
      y: startY,
      facing: 'down',   // 'up' | 'down' | 'left' | 'right'
      speed: 48,         // world units per second (3 tiles/sec)
      hp: 10,
      maxHp: 10,
      size: PLAYER_SIZE,

      /**
       * Update player position based on input and delta time.
       * room.tiles is the 2D tile array for collision.
       * keys is the input state object.
       */
      update: function (dt, room, keys) {
        if (!keys) return;

        var dx = 0, dy = 0;
        if (keys['w'] || keys['W'] || keys['ArrowUp'])    dy = -1;
        if (keys['s'] || keys['S'] || keys['ArrowDown'])  dy = 1;
        if (keys['a'] || keys['A'] || keys['ArrowLeft'])  dx = -1;
        if (keys['d'] || keys['D'] || keys['ArrowRight']) dx = 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
          dx *= 0.707;
          dy *= 0.707;
        }

        // Set facing direction
        if (dx !== 0 || dy !== 0) {
          if (Math.abs(dx) > Math.abs(dy)) {
            player.facing = dx > 0 ? 'right' : 'left';
          } else {
            player.facing = dy > 0 ? 'down' : 'up';
          }
        }

        var moveX = dx * player.speed * dt;
        var moveY = dy * player.speed * dt;

        // Axis-independent collision (slide along walls)
        // Try X first
        var newX = player.x + moveX;
        if (!collides(newX, player.y, player.size, room.tiles)) {
          player.x = newX;
        }

        // Try Y independently
        var newY = player.y + moveY;
        if (!collides(player.x, newY, player.size, room.tiles)) {
          player.y = newY;
        }
      },

      /**
       * Draw the player on the canvas.
       */
      draw: function (ctx) {
        var sx = player.x * R.SCALE;
        var sy = player.y * R.SCALE;
        var s  = R.SCALE;
        var sz = PLAYER_SIZE * R.SCALE;  // rendered size

        // Body (blue tunic)
        ctx.fillStyle = R.PALETTE.playerBody;
        ctx.fillRect(sx + s, sy + 4 * s, (PLAYER_SIZE - 2) * s, (PLAYER_SIZE - 5) * s);

        // Head (skin)
        ctx.fillStyle = R.PALETTE.playerSkin;
        ctx.fillRect(sx + 2 * s, sy + s, (PLAYER_SIZE - 4) * s, 4 * s);

        // Eyes
        ctx.fillStyle = '#222';
        if (player.facing === 'left') {
          ctx.fillRect(sx + 3 * s, sy + 2 * s, s, s);
        } else if (player.facing === 'right') {
          ctx.fillRect(sx + (PLAYER_SIZE - 4) * s, sy + 2 * s, s, s);
        } else if (player.facing === 'up') {
          // looking away, no eyes visible
        } else {
          // facing down — two eyes
          ctx.fillRect(sx + 3 * s, sy + 3 * s, s, s);
          ctx.fillRect(sx + (PLAYER_SIZE - 4) * s, sy + 3 * s, s, s);
        }

        // Sword indicator (small line in facing direction)
        ctx.fillStyle = R.PALETTE.playerSword;
        switch (player.facing) {
          case 'up':
            ctx.fillRect(sx + 5 * s, sy - s, 2 * s, 2 * s);
            break;
          case 'down':
            ctx.fillRect(sx + 5 * s, sy + PLAYER_SIZE * s, 2 * s, 2 * s);
            break;
          case 'left':
            ctx.fillRect(sx - s, sy + 5 * s, 2 * s, 2 * s);
            break;
          case 'right':
            ctx.fillRect(sx + PLAYER_SIZE * s, sy + 5 * s, 2 * s, 2 * s);
            break;
        }
      }
    };

    return player;
  }

  /**
   * Check if a world-position + size collides with any wall tile.
   * Uses AABB against each wall tile's bounding box.
   */
  function collides(wx, wy, size, tiles) {
    // Player AABB in world coords
    var left   = wx;
    var right  = wx + size;
    var top    = wy;
    var bottom = wy + size;

    // Which tiles could overlap?
    var tileLeft   = Math.floor(left / R.TILE_SIZE);
    var tileRight  = Math.floor((right - 0.01) / R.TILE_SIZE);
    var tileTop    = Math.floor(top / R.TILE_SIZE);
    var tileBottom = Math.floor((bottom - 0.01) / R.TILE_SIZE);

    for (var row = tileTop; row <= tileBottom; row++) {
      for (var col = tileLeft; col <= tileRight; col++) {
        // Out of bounds — allow if beyond a door opening, block otherwise
        if (row < 0 || row >= R.FULL_ROOM_H || col < 0 || col >= R.FULL_ROOM_W) {
          continue; // let engine.js handle door exit detection
        }
        if (tiles[row][col] === 1) {
          return true;
        }
      }
    }
    return false;
  }

  // ── export ──

  window.Player = {
    create:   create,
    collides: collides,
    PLAYER_SIZE: PLAYER_SIZE
  };
})();
