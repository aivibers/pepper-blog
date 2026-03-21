/* enemies.js — Enemy types, AI, spawning, drawing */
/* globals: window.Enemies, window.Renderer, window.Combat */

(function () {
  'use strict';

  var R = window.Renderer;

  var TYPES = {
    slime:    { hp: 3,  speed: 30, damage: 1, color: R.PALETTE.slime,    size: 10, points: 10 },
    bat:      { hp: 2,  speed: 60, damage: 1, color: R.PALETTE.bat,      size: 8,  points: 15 },
    skeleton: { hp: 5,  speed: 40, damage: 2, color: R.PALETTE.skeleton,  size: 10, points: 25 },
    boss:     { hp: 15, speed: 20, damage: 3, color: R.PALETTE.boss,     size: 16, points: 100 }
  };

  /* ── factory ── */

  function spawn(type, x, y) {
    var t = TYPES[type];
    return {
      type:    type,
      x:       x,
      y:       y,
      hp:      t.hp,
      maxHp:   t.hp,
      speed:   t.speed,
      damage:  t.damage,
      color:   t.color,
      size:    t.size,
      points:  t.points,
      vx:      0,
      vy:      0,
      knockbackTimer: 0,
      knockbackVx:    0,
      knockbackVy:    0,
      dirTimer:   0,      // bat random-direction cooldown
      shootTimer: 2,      // boss projectile cooldown
      flashTimer: 0       // damage flash
    };
  }

  /* ── tile collision (shared with Combat) ── */

  function tileCollides(wx, wy, size, tiles) {
    var left   = wx;
    var right  = wx + size;
    var top    = wy;
    var bottom = wy + size;

    var tl = Math.floor(left   / R.TILE_SIZE);
    var tr = Math.floor((right  - 0.01) / R.TILE_SIZE);
    var tt = Math.floor(top    / R.TILE_SIZE);
    var tb = Math.floor((bottom - 0.01) / R.TILE_SIZE);

    for (var r = tt; r <= tb; r++) {
      for (var c = tl; c <= tr; c++) {
        if (r < 0 || r >= R.FULL_ROOM_H || c < 0 || c >= R.FULL_ROOM_W) return true;
        if (tiles[r][c] === 1) return true;
      }
    }
    return false;
  }

  /* ── AI update ── */

  function update(enemies, player, dt, room) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.hp <= 0) continue;

      // flash timer
      if (e.flashTimer > 0) e.flashTimer -= dt;

      // knockback overrides AI
      if (e.knockbackTimer > 0) {
        e.knockbackTimer -= dt;
        var kx = e.x + e.knockbackVx * dt;
        var ky = e.y + e.knockbackVy * dt;
        if (!tileCollides(kx, e.y, e.size, room.tiles)) e.x = kx;
        if (!tileCollides(e.x, ky, e.size, room.tiles)) e.y = ky;
        continue;
      }

      var dx = 0, dy = 0;

      switch (e.type) {
        /* ── slime: shamble toward player ── */
        case 'slime': {
          var sdx = player.x - e.x;
          var sdy = player.y - e.y;
          var sd  = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
          dx = sdx / sd;
          dy = sdy / sd;
          break;
        }

        /* ── bat: erratic random changes ── */
        case 'bat': {
          e.dirTimer -= dt;
          if (e.dirTimer <= 0) {
            var ang = Math.random() * Math.PI * 2;
            e.vx = Math.cos(ang);
            e.vy = Math.sin(ang);
            e.dirTimer = 0.3 + Math.random() * 0.5;
          }
          dx = e.vx;
          dy = e.vy;
          break;
        }

        /* ── skeleton: charge when on same row/col ── */
        case 'skeleton': {
          var skdx = player.x - e.x;
          var skdy = player.y - e.y;
          var align = R.TILE_SIZE * 1.5;
          if (Math.abs(skdx) < align) {
            dy = skdy > 0 ? 1 : -1;
          } else if (Math.abs(skdy) < align) {
            dx = skdx > 0 ? 1 : -1;
          } else {
            var skd = Math.sqrt(skdx * skdx + skdy * skdy) || 1;
            dx = (skdx / skd) * 0.5;
            dy = (skdy / skd) * 0.5;
          }
          break;
        }

        /* ── boss: chase + fire projectile every 2 s ── */
        case 'boss': {
          var bdx = player.x - e.x;
          var bdy = player.y - e.y;
          var bd  = Math.sqrt(bdx * bdx + bdy * bdy) || 1;
          dx = bdx / bd;
          dy = bdy / bd;

          e.shootTimer -= dt;
          if (e.shootTimer <= 0) {
            e.shootTimer = 2;
            window.Combat.projectiles.push({
              x:  e.x + e.size / 2,
              y:  e.y + e.size / 2,
              vx: (bdx / bd) * 80,
              vy: (bdy / bd) * 80,
              damage: e.damage,
              size: 4
            });
          }
          break;
        }
      }

      // move with wall collision
      var mx = dx * e.speed * dt;
      var my = dy * e.speed * dt;
      var nx = e.x + mx;
      var ny = e.y + my;

      if (!tileCollides(nx, e.y, e.size, room.tiles)) {
        e.x = nx;
      } else if (e.type === 'bat') {
        e.vx = -e.vx;
        e.dirTimer = 0;
      }

      if (!tileCollides(e.x, ny, e.size, room.tiles)) {
        e.y = ny;
      } else if (e.type === 'bat') {
        e.vy = -e.vy;
        e.dirTimer = 0;
      }
    }
  }

  /* ── drawing ── */

  function draw(ctx, enemies) {
    var S = R.SCALE;

    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.hp <= 0) continue;

      var sx = e.x * S;
      var sy = e.y * S;
      var sz = e.size * S;
      var col = (e.flashTimer > 0) ? '#ffffff' : e.color;

      ctx.fillStyle = col;

      switch (e.type) {
        /* slime — circle blob */
        case 'slime':
          ctx.beginPath();
          ctx.arc(sx + sz / 2, sy + sz / 2, sz / 2, 0, Math.PI * 2);
          ctx.fill();
          // eyes
          ctx.fillStyle = '#000';
          ctx.fillRect(sx + sz * 0.3, sy + sz * 0.35, S * 2, S * 2);
          ctx.fillRect(sx + sz * 0.55, sy + sz * 0.35, S * 2, S * 2);
          break;

        /* bat — triangle with glowing eyes */
        case 'bat':
          ctx.beginPath();
          ctx.moveTo(sx + sz / 2, sy);
          ctx.lineTo(sx, sy + sz);
          ctx.lineTo(sx + sz, sy + sz);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ff0';
          ctx.fillRect(sx + sz * 0.3, sy + sz * 0.45, S, S);
          ctx.fillRect(sx + sz * 0.6, sy + sz * 0.45, S, S);
          break;

        /* skeleton — cross with skull */
        case 'skeleton':
          // vertical bar
          ctx.fillRect(sx + sz * 0.3, sy, sz * 0.4, sz);
          // horizontal bar (arms)
          ctx.fillRect(sx, sy + sz * 0.25, sz, sz * 0.35);
          // skull at top
          ctx.beginPath();
          ctx.arc(sx + sz / 2, sy + sz * 0.18, sz * 0.22, 0, Math.PI * 2);
          ctx.fill();
          // eye sockets
          ctx.fillStyle = '#000';
          ctx.fillRect(sx + sz * 0.38, sy + sz * 0.12, S, S);
          ctx.fillRect(sx + sz * 0.55, sy + sz * 0.12, S, S);
          break;

        /* boss — large square with horns */
        case 'boss':
          // body
          ctx.fillRect(sx + sz * 0.1, sy + sz * 0.25, sz * 0.8, sz * 0.7);
          // left horn
          ctx.beginPath();
          ctx.moveTo(sx + sz * 0.15, sy + sz * 0.25);
          ctx.lineTo(sx, sy);
          ctx.lineTo(sx + sz * 0.3, sy + sz * 0.25);
          ctx.closePath();
          ctx.fill();
          // right horn
          ctx.beginPath();
          ctx.moveTo(sx + sz * 0.7, sy + sz * 0.25);
          ctx.lineTo(sx + sz, sy);
          ctx.lineTo(sx + sz * 0.85, sy + sz * 0.25);
          ctx.closePath();
          ctx.fill();
          // eyes
          ctx.fillStyle = '#fff';
          ctx.fillRect(sx + sz * 0.25, sy + sz * 0.4, S * 2, S * 2);
          ctx.fillRect(sx + sz * 0.6, sy + sz * 0.4, S * 2, S * 2);
          break;
      }

      // HP bar (only if damaged)
      if (e.hp < e.maxHp) {
        var barW = sz;
        var barH = S * 1.5;
        var barY = sy - barH - S;
        ctx.fillStyle = '#333';
        ctx.fillRect(sx, barY, barW, barH);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(sx, barY, barW * (e.hp / e.maxHp), barH);
      }
    }
  }

  /* ── room spawning ── */

  function spawnForRoom(room, floor) {
    var enemies = [];
    var ts = R.TILE_SIZE;

    // decide count
    var count = 2 + Math.floor(Math.random() * 3);          // 2-4
    if (floor > 2) count = Math.min(count + 1, 6);

    // available types per floor
    var pool = ['slime'];
    if (floor >= 1) pool.push('bat');
    if (floor >= 2) pool.push('skeleton');

    // higher floors can get a boss
    if (floor >= 3 && room.type !== 'normal' && Math.random() < 0.3) {
      enemies.push(spawn('boss', 6 * ts, 3 * ts));
    }

    // fill rest with random types
    for (var i = 0; i < count; i++) {
      var ex, ey, attempts = 0;
      do {
        var tc = 2 + Math.floor(Math.random() * 10);        // cols 2-11
        var tr = 2 + Math.floor(Math.random() * 8);         // rows 2-9
        ex = tc * ts;
        ey = tr * ts;
        attempts++;
      } while (
        attempts < 20 &&
        Math.abs(ex - 7 * ts) < 3 * ts &&
        Math.abs(ey - 5 * ts) < 3 * ts
      );

      var type = pool[Math.floor(Math.random() * pool.length)];
      var e = spawn(type, ex, ey);

      // scale HP with floor
      var hpMult = 1 + (floor - 1) * 0.25;
      e.hp    = Math.ceil(e.hp * hpMult);
      e.maxHp = e.hp;

      enemies.push(e);
    }

    return enemies;
  }

  /* ── export ── */

  window.Enemies = {
    TYPES:        TYPES,
    spawn:        spawn,
    update:       update,
    draw:         draw,
    spawnForRoom: spawnForRoom,
    tileCollides: tileCollides
  };
})();
