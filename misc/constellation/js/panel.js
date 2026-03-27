/**
 * Panel — detail panel for viewing a single memory
 * Attached to window.Panel
 */
(function () {
  'use strict';

  var COLORS = {
    identity:     '#ffd700',
    technical:    '#4488ff',
    relationship: '#44ff88',
    reflection:   '#aa44ff',
    mistake:      '#ff4444',
    milestone:    '#ffffff',
  };

  var LABELS = {
    identity:     'Identity',
    technical:    'Technical',
    relationship: 'Relationship',
    reflection:   'Reflection',
    mistake:      'Mistake',
    milestone:    'Milestone',
  };

  function Panel() {
    this.el = document.getElementById('detail-panel');
    this.closeBtn = document.getElementById('panel-close');
    this.dot = document.getElementById('panel-dot');
    this.categoryLabel = document.getElementById('panel-category-label');
    this.titleEl = document.getElementById('panel-title');
    this.dateEl = document.getElementById('panel-date');
    this.sourceEl = document.getElementById('panel-source');
    this.textEl = document.getElementById('panel-text');
    this.connectionsLabel = document.getElementById('panel-connections-label');
    this.connectionsList = document.getElementById('panel-connections-list');
    this.connectionsWrap = document.getElementById('panel-connections');

    this.currentMemory = null;
    this.memoryMap = {};
    this.onConnectionClick = null; // fn(memoryId)
    this.onClose = null;           // fn()

    var self = this;
    this.closeBtn.addEventListener('click', function () {
      self.hide();
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') self.hide();
    });
  }

  Panel.prototype.setMemories = function (memories) {
    this.memoryMap = {};
    for (var i = 0; i < memories.length; i++) {
      this.memoryMap[memories[i].id] = memories[i];
    }
  };

  Panel.prototype.showMemory = function (memory) {
    this.currentMemory = memory;
    var color = COLORS[memory.category] || '#ffffff';
    var label = LABELS[memory.category] || memory.category;

    // Category dot
    this.dot.style.backgroundColor = color;
    this.dot.style.color = color;
    this.dot.style.boxShadow = '0 0 8px ' + color;
    this.categoryLabel.textContent = label;

    // Title
    this.titleEl.textContent = memory.title;

    // Date
    var d = new Date(memory.date + 'T00:00:00');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    this.dateEl.textContent = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();

    // Source badge
    this.sourceEl.textContent = memory.source || 'unknown';

    // Text
    this.textEl.textContent = memory.text;

    // Connections
    var conns = memory.connections || [];
    var connMemories = [];
    for (var i = 0; i < conns.length; i++) {
      if (this.memoryMap[conns[i]]) {
        connMemories.push(this.memoryMap[conns[i]]);
      }
    }

    if (connMemories.length > 0) {
      this.connectionsWrap.style.display = 'block';
      this.connectionsLabel.textContent = connMemories.length + ' connection' + (connMemories.length !== 1 ? 's' : '');
      this.connectionsList.innerHTML = '';

      var self = this;
      for (var j = 0; j < connMemories.length; j++) {
        (function (cm) {
          var li = document.createElement('li');
          li.textContent = cm.title;
          li.addEventListener('click', function () {
            if (self.onConnectionClick) {
              self.onConnectionClick(cm.id);
            }
          });
          self.connectionsList.appendChild(li);
        })(connMemories[j]);
      }
    } else {
      this.connectionsWrap.style.display = 'none';
    }

    // Scroll to top
    this.el.scrollTop = 0;

    // Slide in
    this.el.classList.add('open');
  };

  Panel.prototype.hide = function () {
    this.el.classList.remove('open');
    this.currentMemory = null;
    if (this.onClose) this.onClose();
  };

  Panel.prototype.isOpen = function () {
    return this.el.classList.contains('open');
  };

  window.Panel = Panel;
})();
