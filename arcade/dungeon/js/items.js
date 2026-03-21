/* items.js — Collectible items: potions, gold, keys, sword upgrades */
/* globals: window.Items, window.Renderer */

(function () {
  'use strict';

  var R = window.Renderer;

  var TYPES = {
    potion:       { heal: 4,  score: 0,  damage: 0, color: R.PALETTE.potion },
    gold:         { heal: 0,  score: 10, damage: 0, color: R.PALETTE.gold },
    key:          { heal: 0,  score: 0,  damage: 0, color: R.PALETTE.key },
    swordUpgrade: { heal: 0,  score: 0,  damage: 1, color: R.PALETTE.swordUpgrade }
  };

  var bobTime = 0;  // shared sine clock

  /* ── factory ── */

  function spawn(type, x, y) {
    var t = TYPES[type];
    return {
      type:  type,
      x:     x,
      y:     y,
      size:  8,
      color: t.color,
      heal:  t.heal,
      score: t.score,
      damage: t.damage,
      collected: false
    };
  }

  /* ── update (pickup detection) ── */

  function update(items, player, dt) {
    bobTime += dt;
    var ps   = player.size || 12;
    var grab = 12;  // pickup radius in world units
    var events = [];

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.collected) continue;

      var dx = (player.x + ps / 2) - (it.x + it.size / 2);
      var dy = (player.y + ps / 2) - (it.y + it.size / 2);
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < grab) {
        it.collected = true;

        // apply effect
        if (it.heal > 0) {
          player.hp = Math.min(player.hp + it.heal, player.maxHp);
        }
        if (it.damage > 0) {
          player.swordDamage = (player.swordDamage || 2) + it.damage;
        }
        events.push(it);
      }
    }

    // prune collected items
    for (var j = items.length - 1; j >= 0; j--) {
      if (items[j].collected) items.splice(j, 1);
    }

    return events;  // engine can tally score from returned items
  }

  /* ── drawing ── */

  function draw(ctx, items) {
    var S = R.SCALE;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.collected) continue;

      var bob = Math.sin(bobTime * 3 + i) * 2 * S;
      var sx = it.x * S;
      var sy = it.y * S + bob;
      var sz = it.size * S;

      ctx.fillStyle = it.color;

      switch (it.type) {
        /* potion — red bottle */
        case 'potion':
          // neck
          ctx.fillRect(sx + sz * 0.35, sy, sz * 0.3, sz * 0.3);
          // body
          ctx.beginPath();
          ctx.arc(sx + sz / 2, sy + sz * 0.65, sz * 0.38, 0, Math.PI * 2);
          ctx.fill();
          // highlight
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fillRect(sx + sz * 0.3, sy + sz * 0.5, sz * 0.15, sz * 0.2);
          break;

        /* gold — coin */
        case 'gold':
          ctx.beginPath();
          ctx.arc(sx + sz / 2, sy + sz / 2, sz / 2, 0, Math.PI * 2);
          ctx.fill();
          // $ sign
          ctx.fillStyle = '#886600';
          ctx.font = (sz * 0.6) + 'px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('$', sx + sz / 2, sy + sz / 2);
          break;

        /* key — silver key shape */
        case 'key':
          // handle ring
          ctx.beginPath();
          ctx.arc(sx + sz * 0.3, sy + sz / 2, sz * 0.2, 0, Math.PI * 2);
          ctx.fill();
          // shaft
          ctx.fillRect(sx + sz * 0.45, sy + sz * 0.4, sz * 0.5, sz * 0.2);
          // teeth
          ctx.fillRect(sx + sz * 0.8, sy + sz * 0.35, sz * 0.1, sz * 0.3);
          ctx.fillRect(sx + sz * 0.65, sy + sz * 0.35, sz * 0.1, sz * 0.15);
          break;

        /* swordUpgrade — blue blade */
        case 'swordUpgrade':
          // blade
          ctx.beginPath();
          ctx.moveTo(sx + sz / 2, sy);
          ctx.lineTo(sx + sz * 0.7, sy + sz * 0.6);
          ctx.lineTo(sx + sz * 0.3, sy + sz * 0.6);
          ctx.closePath();
          ctx.fill();
          // guard
          ctx.fillStyle = '#886600';
          ctx.fillRect(sx + sz * 0.2, sy + sz * 0.6, sz * 0.6, sz * 0.1);
          // hilt
          ctx.fillStyle = '#553300';
          ctx.fillRect(sx + sz * 0.4, sy + sz * 0.7, sz * 0.2, sz * 0.3);
          break;
      }
    }
  }

  /* ── export ── */

  window.Items = {
    TYPES:  TYPES,
    spawn:  spawn,
    update: update,
    draw:   draw
  };
})();
