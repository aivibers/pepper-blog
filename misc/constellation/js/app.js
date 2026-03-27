/**
 * App — main entry point, data loading, coordination
 * Attached to window.App
 */
(function () {
  'use strict';

  var App = {};

  var starfield;
  var panel;
  var canvas;
  var tooltip;
  var titleOverlay;
  var memories = [];

  App.init = function () {
    canvas = document.getElementById('constellation-canvas');
    tooltip = document.getElementById('tooltip');
    titleOverlay = document.getElementById('title-overlay');

    // Init modules
    starfield = new window.Starfield(canvas);
    panel = new window.Panel();

    // Wire up hover → tooltip
    starfield.onHover = function (star, sx, sy) {
      if (star) {
        tooltip.textContent = star.memory.title;
        tooltip.classList.add('visible');
        // Position tooltip near cursor
        var tx = sx + 16;
        var ty = sy - 10;
        // Keep on screen
        var tw = tooltip.offsetWidth;
        if (tx + tw > window.innerWidth - 10) tx = sx - tw - 16;
        if (ty < 10) ty = 10;
        tooltip.style.left = tx + 'px';
        tooltip.style.top = ty + 'px';
      } else {
        tooltip.classList.remove('visible');
      }
    };

    // Wire up click → panel
    starfield.onClick = function (star) {
      panel.showMemory(star.memory);
      starfield.selectedStar = star;
    };

    // Wire up panel close → deselect
    panel.onClose = function () {
      starfield.selectedStar = null;
    };

    // Wire up connection click → navigate + show
    panel.onConnectionClick = function (id) {
      var mem = panel.memoryMap[id];
      if (mem) {
        starfield.focusStar(id);
        panel.showMemory(mem);
        starfield.selectedStar = starfield.memoryMap[id];
      }
    };

    // Handle resize
    var resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        starfield.resize();
      }, 100);
    });

    // Load data
    fetch('data/memories.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load memories: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        memories = data;
        panel.setMemories(memories);
        starfield.load(memories);

        // Start animation loop
        requestAnimationFrame(loop);

        // Fade title after 3 seconds
        setTimeout(function () {
          titleOverlay.classList.add('fade-out');
          // Remove from DOM after transition
          setTimeout(function () {
            titleOverlay.style.display = 'none';
          }, 1500);
        }, 3000);
      })
      .catch(function (err) {
        console.error('Constellation error:', err);
      });
  };

  function loop(timestamp) {
    starfield.frame(timestamp);
    requestAnimationFrame(loop);
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
  } else {
    App.init();
  }

  window.App = App;
})();
