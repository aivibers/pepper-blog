/**
 * Starfield — canvas rendering, star positioning, animation, interaction
 * Attached to window.Starfield
 */
(function () {
  'use strict';

  // ── Color palette ──
  const COLORS = {
    identity:     '#ffd700',
    technical:    '#4488ff',
    relationship: '#44ff88',
    reflection:   '#aa44ff',
    mistake:      '#ff4444',
    milestone:    '#ffffff',
  };

  // ── Y-axis bands (fraction of canvas height) ──
  const Y_BANDS = {
    identity:     0.20,
    technical:    0.35,
    relationship: 0.50,
    reflection:   0.65,
    mistake:      0.80,
    milestone:    0.90,
  };

  // ── Helpers ──
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function dist(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── Starfield constructor ──
  function Starfield(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    this.memoryMap = {};        // id → star
    this.dpr = window.devicePixelRatio || 1;

    // Camera state
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.targetCamera = { x: 0, y: 0, zoom: 1 };

    // Interaction state
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragCameraStart = { x: 0, y: 0 };
    this.hoveredStar = null;
    this.selectedStar = null;
    this.mouse = { x: 0, y: 0 };

    // Time
    this.time = 0;
    this.lastFrame = 0;

    // Background stars (ambient dust)
    this.dust = [];
    for (let i = 0; i < 200; i++) {
      this.dust.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.2 + 0.3,
        alpha: Math.random() * 0.3 + 0.05,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.3 + 0.1,
      });
    }

    // Callbacks
    this.onHover = null;   // fn(star|null, screenX, screenY)
    this.onClick = null;   // fn(star)

    this._bindEvents();
    this.resize();
  }

  // ── Resize ──
  Starfield.prototype.resize = function () {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  // ── Load memories ──
  Starfield.prototype.load = function (memories) {
    // Find date range
    const dates = memories.map(m => new Date(m.date + 'T00:00:00').getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const dateSpan = maxDate - minDate || 1;

    // Padding so stars aren't jammed at edges
    const padX = 120;
    const padY = 60;

    // Build stars
    this.stars = memories.map((m, i) => {
      const t = (new Date(m.date + 'T00:00:00').getTime() - minDate) / dateSpan;
      const band = Y_BANDS[m.category] || 0.5;

      // Jitter for visual spread
      const jitterX = (Math.random() - 0.5) * 50;
      const jitterY = (Math.random() - 0.5) * 80;

      // Base position in a virtual coordinate space
      const baseX = padX + t * (1600 - padX * 2) + jitterX;
      const baseY = padY + band * (900 - padY * 2) + jitterY;

      // Star size based on text length
      const textLen = (m.text || '').length;
      const radius = clamp(3 + Math.sqrt(textLen) * 0.15, 3, 8);

      const color = COLORS[m.category] || '#ffffff';
      const rgb = hexToRgb(color);

      return {
        memory: m,
        baseX: baseX,
        baseY: baseY,
        x: baseX,
        y: baseY,
        radius: radius,
        color: color,
        rgb: rgb,
        // Animation params
        driftPhase: Math.random() * Math.PI * 2,
        driftPeriod: 5 + Math.random() * 5,
        driftAmpX: 1 + Math.random() * 2,
        driftAmpY: 1 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
        // Hover animation
        hoverScale: 1,
        targetHoverScale: 1,
      };
    });

    // Build lookup
    this.memoryMap = {};
    this.stars.forEach(s => {
      this.memoryMap[s.memory.id] = s;
    });

    // Center camera on the constellation
    this._centerCamera();
  };

  // ── Center camera ──
  Starfield.prototype._centerCamera = function () {
    if (this.stars.length === 0) return;
    let sumX = 0, sumY = 0;
    this.stars.forEach(s => { sumX += s.baseX; sumY += s.baseY; });
    const cx = sumX / this.stars.length;
    const cy = sumY / this.stars.length;
    this.camera.x = cx - this.width / 2;
    this.camera.y = cy - this.height / 2;
    this.targetCamera.x = this.camera.x;
    this.targetCamera.y = this.camera.y;
  };

  // ── Event binding ──
  Starfield.prototype._bindEvents = function () {
    const self = this;
    const cv = this.canvas;

    // Mouse move
    cv.addEventListener('mousemove', function (e) {
      self.mouse.x = e.clientX;
      self.mouse.y = e.clientY;

      if (self.isDragging) {
        const dx = e.clientX - self.dragStart.x;
        const dy = e.clientY - self.dragStart.y;
        self.targetCamera.x = self.dragCameraStart.x - dx / self.camera.zoom;
        self.targetCamera.y = self.dragCameraStart.y - dy / self.camera.zoom;
        return;
      }

      // Hit test
      const worldX = (e.clientX / self.camera.zoom) + self.camera.x;
      const worldY = (e.clientY / self.camera.zoom) + self.camera.y;
      let hit = null;
      let minD = Infinity;
      for (let i = 0; i < self.stars.length; i++) {
        const s = self.stars[i];
        const d = dist(worldX, worldY, s.x, s.y);
        const hitRadius = (s.radius + 6) / self.camera.zoom;
        if (d < hitRadius && d < minD) {
          minD = d;
          hit = s;
        }
      }

      if (hit !== self.hoveredStar) {
        if (self.hoveredStar) self.hoveredStar.targetHoverScale = 1;
        self.hoveredStar = hit;
        if (hit) hit.targetHoverScale = 1.5;
      }

      if (self.onHover) {
        self.onHover(hit, e.clientX, e.clientY);
      }

      cv.style.cursor = hit ? 'pointer' : 'grab';
    });

    // Mouse down
    cv.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      self.isDragging = true;
      self.dragStart.x = e.clientX;
      self.dragStart.y = e.clientY;
      self.dragCameraStart.x = self.targetCamera.x;
      self.dragCameraStart.y = self.targetCamera.y;
      cv.style.cursor = 'grabbing';
    });

    // Mouse up
    window.addEventListener('mouseup', function (e) {
      if (!self.isDragging) return;
      const dx = e.clientX - self.dragStart.x;
      const dy = e.clientY - self.dragStart.y;
      const wasDrag = Math.abs(dx) > 3 || Math.abs(dy) > 3;
      self.isDragging = false;
      cv.style.cursor = self.hoveredStar ? 'pointer' : 'grab';

      if (!wasDrag && self.hoveredStar && self.onClick) {
        self.onClick(self.hoveredStar);
      }
    });

    // Scroll zoom
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = clamp(self.targetCamera.zoom * delta, 0.5, 3);

      // Zoom toward cursor
      const wx = (e.clientX / self.camera.zoom) + self.camera.x;
      const wy = (e.clientY / self.camera.zoom) + self.camera.y;

      self.targetCamera.zoom = newZoom;
      self.targetCamera.x = wx - e.clientX / newZoom;
      self.targetCamera.y = wy - e.clientY / newZoom;
    }, { passive: false });

    // Touch support
    let lastTouchDist = 0;
    cv.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        self.isDragging = true;
        self.dragStart.x = t.clientX;
        self.dragStart.y = t.clientY;
        self.dragCameraStart.x = self.targetCamera.x;
        self.dragCameraStart.y = self.targetCamera.y;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: true });

    cv.addEventListener('touchmove', function (e) {
      e.preventDefault();
      if (e.touches.length === 1 && self.isDragging) {
        const t = e.touches[0];
        const dx = t.clientX - self.dragStart.x;
        const dy = t.clientY - self.dragStart.y;
        self.targetCamera.x = self.dragCameraStart.x - dx / self.camera.zoom;
        self.targetCamera.y = self.dragCameraStart.y - dy / self.camera.zoom;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDist > 0) {
          const scale = d / lastTouchDist;
          self.targetCamera.zoom = clamp(self.targetCamera.zoom * scale, 0.5, 3);
        }
        lastTouchDist = d;
      }
    }, { passive: false });

    cv.addEventListener('touchend', function (e) {
      if (e.touches.length === 0) {
        if (self.isDragging) {
          // Check for tap
          self.isDragging = false;
          // Hit test at last touch position
          const worldX = (self.dragStart.x / self.camera.zoom) + self.camera.x;
          const worldY = (self.dragStart.y / self.camera.zoom) + self.camera.y;
          let hit = null;
          let minD = Infinity;
          for (let i = 0; i < self.stars.length; i++) {
            const s = self.stars[i];
            const d2 = dist(worldX, worldY, s.x, s.y);
            const hitRadius = (s.radius + 10) / self.camera.zoom;
            if (d2 < hitRadius && d2 < minD) {
              minD = d2;
              hit = s;
            }
          }
          if (hit && self.onClick) self.onClick(hit);
        }
        lastTouchDist = 0;
      }
    }, { passive: true });
  };

  // ── Navigate to a star ──
  Starfield.prototype.focusStar = function (id) {
    const star = this.memoryMap[id];
    if (!star) return;
    this.targetCamera.x = star.baseX - this.width / (2 * this.camera.zoom);
    this.targetCamera.y = star.baseY - this.height / (2 * this.camera.zoom);
    this.selectedStar = star;
  };

  // ── Animation frame ──
  Starfield.prototype.frame = function (timestamp) {
    if (!this.lastFrame) this.lastFrame = timestamp;
    const dt = (timestamp - this.lastFrame) / 1000;
    this.lastFrame = timestamp;
    this.time += dt;

    // Smooth camera
    const camLerp = 1 - Math.pow(0.001, dt);
    this.camera.x = lerp(this.camera.x, this.targetCamera.x, camLerp);
    this.camera.y = lerp(this.camera.y, this.targetCamera.y, camLerp);
    this.camera.zoom = lerp(this.camera.zoom, this.targetCamera.zoom, camLerp);

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const zoom = this.camera.zoom;

    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    // ── Draw background dust ──
    for (let i = 0; i < this.dust.length; i++) {
      const d = this.dust[i];
      const twinkle = 0.5 + 0.5 * Math.sin(this.time * d.speed + d.phase);
      const alpha = d.alpha * twinkle;
      // Parallax at 10% of camera
      const sx = d.x * w - this.camera.x * 0.1 * zoom;
      const sy = d.y * h - this.camera.y * 0.1 * zoom;
      // Wrap
      const wx = ((sx % w) + w) % w;
      const wy = ((sy % h) + h) % h;
      ctx.beginPath();
      ctx.arc(wx, wy, d.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180, 190, 220, ' + alpha + ')';
      ctx.fill();
    }

    // ── World transform ──
    ctx.save();
    ctx.translate(-this.camera.x * zoom, -this.camera.y * zoom);
    ctx.scale(zoom, zoom);

    // ── Update star positions (drift) ──
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.x = s.baseX + Math.sin(this.time / s.driftPeriod + s.driftPhase) * s.driftAmpX;
      s.y = s.baseY + Math.cos(this.time / s.driftPeriod + s.driftPhase + 1.5) * s.driftAmpY;

      // Hover scale animation
      s.hoverScale = lerp(s.hoverScale, s.targetHoverScale, 1 - Math.pow(0.01, dt));
    }

    // ── Draw constellation lines ──
    ctx.lineWidth = 0.8;
    const drawnLines = new Set();
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const conns = s.memory.connections || [];
      for (let j = 0; j < conns.length; j++) {
        const target = this.memoryMap[conns[j]];
        if (!target) continue;

        const lineKey = s.memory.id < conns[j]
          ? s.memory.id + ':' + conns[j]
          : conns[j] + ':' + s.memory.id;
        if (drawnLines.has(lineKey)) continue;
        drawnLines.add(lineKey);

        // Distance-based alpha fade
        const lineDist = dist(s.x, s.y, target.x, target.y);
        const maxDist = 500;
        const lineAlpha = lineDist > maxDist ? 0 : 0.12 * (1 - lineDist / maxDist);
        if (lineAlpha <= 0) continue;

        // Highlight lines for selected star
        let alpha = lineAlpha;
        if (this.selectedStar && (s === this.selectedStar || target === this.selectedStar)) {
          alpha = 0.35;
        } else if (this.hoveredStar && (s === this.hoveredStar || target === this.hoveredStar)) {
          alpha = 0.25;
        }

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + alpha + ')';
        ctx.stroke();
      }
    }

    // ── Draw stars ──
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const twinkle = 0.6 + 0.4 * Math.sin(this.time * s.twinkleSpeed + s.twinklePhase);
      const r = s.radius * s.hoverScale;
      const rgb = s.rgb;

      // Outer glow
      const glowRadius = r * 4;
      const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowRadius);
      glow.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (0.25 * twinkle) + ')');
      glow.addColorStop(0.4, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (0.08 * twinkle) + ')');
      glow.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
      ctx.beginPath();
      ctx.arc(s.x, s.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Core
      const core = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      core.addColorStop(0, 'rgba(255, 255, 255, ' + (0.9 * twinkle) + ')');
      core.addColorStop(0.5, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (0.8 * twinkle) + ')');
      core.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (0.2 * twinkle) + ')');
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();

      // Selected ring
      if (s === this.selectedStar) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (0.4 * twinkle) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  window.Starfield = Starfield;
})();
