/* combat.js — Sword attacks, enemy contact, knockback, projectiles */
/* globals: window.Combat, window.Renderer, window.Player */

(function () {
  'use strict';

  var R = window.Renderer;

  /* ── state ── */

  var projectiles  = [];
  var swingTimer   = 0;          // > 0 while sword is visible
  var swingDir     = 'down';
  var SWING_DURATION = 0.2;      // 200 ms
  var attackReady  = true;       // debounce: only re-attack on fresh press

  /* ── sword hitbox helpers ── */

  function swordRect(player) {
    var ps = player.size || 12;
    var hw = 12;   // hitbox width / height in world units
    var cx = player.x + ps / 2;
    var cy = player.y + ps / 2;

    switch (player.facing) {
      case 'up':    return { x: cx - hw / 2, y: player.y - hw, w: hw, h: hw };
      case 'down':  return { x: cx - hw / 2, y: player.y + ps, w: hw, h: hw };
      case 'left':  return { x: player.x - hw, y: cy - hw / 2, w: hw, h: hw };
      case 'right': return { x: player.x + ps, y: cy - hw / 2, w: hw, h: hw };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  /* ── player attack ── */

  function playerAttack(player, enemies, keys) {
    // space debounce
    if (keys[' '] || keys['Space']) {
      if (!attackReady) return null;
      attackReady = false;
    } else {
      attackReady = true;
      return null;
    }

    swingTimer = SWING_DURATION;
    swingDir   = player.facing;

    var sr = swordRect(player);
    var killed = [];

    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.hp <= 0) continue;
      if (aabb(sr.x, sr.y, sr.w, sr.h, e.x, e.y, e.size, e.size)) {
        e.hp -= player.swordDamage || 2;
        e.flashTimer = 0.12;
        applyKnockback(e, player.x, player.y, 120);
        if (e.hp <= 0) killed.push(e);
      }
    }

    return killed.length > 0 ? killed : null;
  }

  /* ── enemy → player contact ── */

  function enemyContact(player, enemies) {
    if (player.invincible) return;

    var ps = player.size || 12;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.hp <= 0) continue;
      if (aabb(player.x, player.y, ps, ps, e.x, e.y, e.size, e.size)) {
        player.hp -= e.damage;
        player.invincible = true;
        player.invTimer   = 1;
        applyKnockback(player, e.x, e.y, 100);
        return;
      }
    }
  }

  /* ── knockback ── */

  function applyKnockback(entity, fromX, fromY, force) {
    var dx = entity.x - fromX;
    var dy = entity.y - fromY;
    var d  = Math.sqrt(dx * dx + dy * dy) || 1;
    entity.knockbackVx    = (dx / d) * force;
    entity.knockbackVy    = (dy / d) * force;
    entity.knockbackTimer = 0.15;
  }

  /* ── boss projectiles ── */

  function updateProjectiles(dt, room, player) {
    for (var i = projectiles.length - 1; i >= 0; i--) {
      var p = projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // wall collision → remove
      if (window.Enemies && window.Enemies.tileCollides(p.x, p.y, p.size, room.tiles)) {
        projectiles.splice(i, 1);
        continue;
      }

      // hit player
      var ps = player.size || 12;
      if (!player.invincible && aabb(p.x, p.y, p.size, p.size, player.x, player.y, ps, ps)) {
        player.hp -= p.damage;
        player.invincible = true;
        player.invTimer   = 1;
        applyKnockback(player, p.x, p.y, 80);
        projectiles.splice(i, 1);
      }
    }
  }

  /* ── sword invincibility ticker ── */

  function updatePlayerInv(player, dt) {
    if (player.invincible) {
      player.invTimer -= dt;
      if (player.invTimer <= 0) {
        player.invincible = false;
      }
    }
    // knockback for player
    if (player.knockbackTimer > 0) {
      player.knockbackTimer -= dt;
      player.x += player.knockbackVx * dt;
      player.y += player.knockbackVy * dt;
    }
  }

  /* ── swing timer ── */

  function updateSwing(dt) {
    if (swingTimer > 0) swingTimer -= dt;
  }

  /* ── drawing ── */

  function drawSword(ctx, player) {
    if (swingTimer <= 0) return;

    var S  = R.SCALE;
    var ps = (player.size || 12) * S;
    var sx = player.x * S;
    var sy = player.y * S;
    var len = 14 * S;
    var wid = 4 * S;

    ctx.fillStyle = R.PALETTE.playerSword;

    // arc progress (0→1)
    var t = 1 - (swingTimer / SWING_DURATION);

    ctx.save();
    var cx = sx + ps / 2;
    var cy = sy + ps / 2;
    ctx.translate(cx, cy);

    var baseAngle;
    switch (swingDir) {
      case 'up':    baseAngle = -Math.PI / 2; break;
      case 'down':  baseAngle =  Math.PI / 2; break;
      case 'left':  baseAngle =  Math.PI;     break;
      case 'right': baseAngle =  0;           break;
    }
    var sweep = (t - 0.5) * Math.PI * 0.8;
    ctx.rotate(baseAngle + sweep);

    ctx.fillRect(ps / 2 - 2, -wid / 2, len, wid);
    // tip
    ctx.fillStyle = '#fff';
    ctx.fillRect(ps / 2 + len - 4, -wid / 2, 4, wid);

    ctx.restore();
  }

  function drawProjectiles(ctx) {
    var S = R.SCALE;
    ctx.fillStyle = '#ff8800';
    for (var i = 0; i < projectiles.length; i++) {
      var p = projectiles[i];
      var px = p.x * S;
      var py = p.y * S;
      var ps = p.size * S;
      ctx.beginPath();
      ctx.arc(px + ps / 2, py + ps / 2, ps, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ── export ── */

  window.Combat = {
    playerAttack:     playerAttack,
    enemyContact:     enemyContact,
    applyKnockback:   applyKnockback,
    projectiles:      projectiles,
    updateProjectiles: updateProjectiles,
    updatePlayerInv:  updatePlayerInv,
    updateSwing:      updateSwing,
    drawSword:        drawSword,
    drawProjectiles:  drawProjectiles
  };
})();
