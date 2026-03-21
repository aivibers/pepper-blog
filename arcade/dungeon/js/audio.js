/* audio.js — Procedural SFX via Web Audio API (lazy AudioContext) */
/* globals: window.SFX */

(function () {
  'use strict';

  var ctx = null;

  function getCtx() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noise(dur, vol) {
    var c = getCtx();
    if (!c) return;
    var len = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = c.createBufferSource();
    src.buffer = buf;
    var g = c.createGain();
    g.gain.setValueAtTime(vol || 0.06, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    src.connect(g);
    g.connect(c.destination);
    src.start();
  }

  var sounds = {

    /* sword — short high-frequency sweep (swoosh) */
    sword: function () {
      var c = getCtx(); if (!c) return;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(800, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.08);
      g.gain.setValueAtTime(0.12, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 0.1);
    },

    /* hit — low thump */
    hit: function () {
      var c = getCtx(); if (!c) return;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.12);
      g.gain.setValueAtTime(0.2, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 0.15);
    },

    /* pickup — two-note ascending chime */
    pickup: function () {
      var c = getCtx(); if (!c) return;
      var t = c.currentTime;
      [523, 659].forEach(function (f, i) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.1, t + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
        o.connect(g); g.connect(c.destination);
        o.start(t + i * 0.08);
        o.stop(t + i * 0.08 + 0.15);
      });
    },

    /* door — low creak with noise */
    door: function () {
      var c = getCtx(); if (!c) return;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(80, c.currentTime);
      o.frequency.linearRampToValueAtTime(120, c.currentTime + 0.05);
      o.frequency.linearRampToValueAtTime(60, c.currentTime + 0.15);
      g.gain.setValueAtTime(0.08, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 0.2);
      noise(0.12, 0.03);
    },

    /* enemyDeath — quick pitch-up pop */
    enemyDeath: function () {
      var c = getCtx(); if (!c) return;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(200, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.06);
      g.gain.setValueAtTime(0.1, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 0.1);
    },

    /* playerHurt — low sawtooth buzz */
    playerHurt: function () {
      var c = getCtx(); if (!c) return;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(100, c.currentTime);
      o.frequency.linearRampToValueAtTime(70, c.currentTime + 0.2);
      g.gain.setValueAtTime(0.12, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 0.25);
    },

    /* stairs — three ascending chime notes */
    stairs: function () {
      var c = getCtx(); if (!c) return;
      var t = c.currentTime;
      [523, 659, 784].forEach(function (f, i) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.1, t + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.25);
        o.connect(g); g.connect(c.destination);
        o.start(t + i * 0.1);
        o.stop(t + i * 0.1 + 0.25);
      });
    },

    /* key — bright high ding with harmonic */
    key: function () {
      var c = getCtx(); if (!c) return;
      var t = c.currentTime;
      var o1 = c.createOscillator();
      var g1 = c.createGain();
      o1.type = 'sine';
      o1.frequency.value = 1200;
      g1.gain.setValueAtTime(0.12, t);
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o1.connect(g1); g1.connect(c.destination);
      o1.start(); o1.stop(t + 0.3);
      // second harmonic
      var o2 = c.createOscillator();
      var g2 = c.createGain();
      o2.type = 'sine';
      o2.frequency.value = 1800;
      g2.gain.setValueAtTime(0.06, t + 0.04);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o2.connect(g2); g2.connect(c.destination);
      o2.start(t + 0.04); o2.stop(t + 0.25);
    }
  };

  window.SFX = {
    play: function (type) {
      try { if (sounds[type]) sounds[type](); }
      catch (e) { /* audio not available */ }
    }
  };
})();
