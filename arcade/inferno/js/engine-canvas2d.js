/**
 * engine-canvas2d.js — Canvas2D raycasting fallback for Pepper's Inferno.
 * Wolfenstein 3D-style renderer. No WebGL required.
 * Self-contained: no ES module imports.
 */
(function () {
  'use strict';

  // ── Constants ──
  const TILE = {
    EMPTY: 0, WALL1: 1, WALL2: 2, WALL3: 3, WALL4: 4,
    DOOR: 5, SPAWN: 6, EXIT: 7,
  };
  const MAP_W = 24, MAP_H = 24;
  const FOV = Math.PI / 3; // 60 degrees
  const HALF_FOV = FOV / 2;
  const MOVE_SPEED = 3.0;
  const ROT_SPEED = 2.5;
  const MOUSE_SENS = 0.002;
  const MINIMAP_SIZE = 140;
  const WALL_COLORS = {
    [TILE.WALL1]: '#6a1b9a',
    [TILE.WALL2]: '#4a148c',
    [TILE.WALL3]: '#880e4f',
    [TILE.WALL4]: '#311b92',
    [TILE.DOOR]:  '#ffd700',
    [TILE.EXIT]:  '#44ffaa',
  };
  const WALL_COLORS_DARK = {
    [TILE.WALL1]: '#4a1270',
    [TILE.WALL2]: '#330e62',
    [TILE.WALL3]: '#600a38',
    [TILE.WALL4]: '#221266',
    [TILE.DOOR]:  '#cca800',
    [TILE.EXIT]:  '#2ecc80',
  };

  // ── Game state ──
  let screen = 'title'; // title | playing | dead | won
  let map = [];
  let player = { x: 1.5, y: 1.5, angle: 0, health: 100, ammo: 30, score: 0, kills: 0 };
  let level = 1;
  const MAX_LEVEL = 3;
  let enemies = [];
  let pickups = [];
  let shootTimer = 0;
  let damageFlash = 0;
  let levelFlash = 0;
  let doorOpen = false;
  let muzzleFlash = 0;

  // ── Input ──
  const keys = {};
  let mouseX = 0;
  let pointerLocked = false;

  // ── Canvas setup ──
  const container = document.getElementById('game-container');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);

  let W, H, RAYS;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    RAYS = Math.min(W, 640);
  }
  resize();
  window.addEventListener('resize', resize);

  // ── DOM refs ──
  const titleScreen = document.getElementById('title-screen');
  const hudOverlay = document.getElementById('hud-overlay');
  const healthVal = document.getElementById('hud-health-value');
  const ammoVal = document.getElementById('hud-ammo-value');
  const weaponName = document.getElementById('hud-weapon-name');

  // HUD extras created by WebGL engine may not exist, create if missing
  function ensureEl(id, parent, tag, styles) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement(tag || 'div');
      el.id = id;
      Object.assign(el.style, styles || {});
      (parent || hudOverlay).appendChild(el);
    }
    return el;
  }

  // Score/level display
  const scoreDiv = ensureEl('hud-score', hudOverlay, 'div', {
    position: 'absolute', top: '20px', right: '30px', fontSize: '1.5rem',
    textShadow: '0 0 10px rgba(255,215,0,0.6)',
  });
  if (!scoreDiv.querySelector('.hud-label')) {
    scoreDiv.innerHTML = '<span class="hud-label" style="color:#ffd700;margin-right:8px;font-size:1rem">SCORE</span><span id="hud-score-value" style="color:#fff;font-weight:bold">0</span>';
  }
  const scoreVal = document.getElementById('hud-score-value');

  const levelDiv = ensureEl('hud-level', hudOverlay, 'div', {
    position: 'absolute', top: '20px', left: '30px', fontSize: '1.5rem',
    textShadow: '0 0 10px rgba(68,255,170,0.6)',
  });
  if (!levelDiv.querySelector('.hud-label')) {
    levelDiv.innerHTML = '<span class="hud-label" style="color:#44ffaa;margin-right:8px;font-size:1rem">LEVEL</span><span id="hud-level-value" style="color:#fff;font-weight:bold">1</span>';
  }
  const levelVal = document.getElementById('hud-level-value');

  // Minimap container
  const minimapDiv = ensureEl('hud-minimap', hudOverlay, 'div', {});
  let minimapCanvas = minimapDiv.querySelector('canvas');
  if (!minimapCanvas) {
    minimapCanvas = document.createElement('canvas');
    minimapCanvas.width = MINIMAP_SIZE;
    minimapCanvas.height = MINIMAP_SIZE;
    minimapDiv.appendChild(minimapCanvas);
  }
  const mctx = minimapCanvas.getContext('2d');

  // Health bar
  ensureEl('hud-health-bar-container', hudOverlay, 'div', {});
  ensureEl('hud-health-bar', document.getElementById('hud-health-bar-container'), 'div', {});
  const healthBar = document.getElementById('hud-health-bar');

  // Death screen
  let deathScreen = document.getElementById('death-screen');
  if (!deathScreen) {
    deathScreen = document.createElement('div');
    deathScreen.id = 'death-screen';
    deathScreen.innerHTML = `
      <div class="death-title">YOU DIED</div>
      <div class="death-stats">
        <div class="death-stat" id="death-score"></div>
        <div class="death-stat" id="death-kills"></div>
        <div class="death-stat" id="death-level"></div>
      </div>
      <div class="death-prompt">Click to Restart</div>`;
    document.body.appendChild(deathScreen);
  }

  // ── Map generation ──
  function generateMap(lvl) {
    map = [];
    for (let y = 0; y < MAP_H; y++) {
      map[y] = [];
      for (let x = 0; x < MAP_W; x++) {
        if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) {
          map[y][x] = TILE.WALL1;
        } else {
          map[y][x] = TILE.EMPTY;
        }
      }
    }

    // Seed-based random for consistent levels
    let seed = lvl * 7919;
    function rng() { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; }

    // Place rooms
    const rooms = [];
    const roomCount = 3 + lvl;
    for (let i = 0; i < roomCount; i++) {
      const rw = Math.floor(rng() * 4) + 4;
      const rh = Math.floor(rng() * 4) + 4;
      const rx = Math.floor(rng() * (MAP_W - rw - 4)) + 2;
      const ry = Math.floor(rng() * (MAP_H - rh - 4)) + 2;
      rooms.push({ x: rx, y: ry, w: rw, h: rh,
        cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2) });
      // Carve room with walls
      for (let dy = 0; dy < rh; dy++) {
        for (let dx = 0; dx < rw; dx++) {
          const mx = rx + dx, my = ry + dy;
          if (mx > 0 && mx < MAP_W - 1 && my > 0 && my < MAP_H - 1) {
            if (dx === 0 || dy === 0 || dx === rw - 1 || dy === rh - 1) {
              const wallType = [TILE.WALL1, TILE.WALL2, TILE.WALL3, TILE.WALL4][i % 4];
              if (map[my][mx] === TILE.EMPTY) map[my][mx] = wallType;
            } else {
              map[my][mx] = TILE.EMPTY;
            }
          }
        }
      }
    }

    // Connect rooms with corridors
    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i - 1], b = rooms[i];
      let cx = a.cx, cy = a.cy;
      while (cx !== b.cx) {
        if (cx > 0 && cx < MAP_W - 1 && cy > 0 && cy < MAP_H - 1) {
          map[cy][cx] = TILE.EMPTY;
          if (cy + 1 < MAP_H - 1) map[cy + 1][cx] = TILE.EMPTY;
        }
        cx += cx < b.cx ? 1 : -1;
      }
      while (cy !== b.cy) {
        if (cx > 0 && cx < MAP_W - 1 && cy > 0 && cy < MAP_H - 1) {
          map[cy][cx] = TILE.EMPTY;
          if (cx + 1 < MAP_W - 1) map[cy][cx + 1] = TILE.EMPTY;
        }
        cy += cy < b.cy ? 1 : -1;
      }
    }

    // Add some pillars / interior walls for cover
    const pillarCount = 5 + lvl * 2;
    for (let i = 0; i < pillarCount; i++) {
      const px = Math.floor(rng() * (MAP_W - 4)) + 2;
      const py = Math.floor(rng() * (MAP_H - 4)) + 2;
      if (map[py][px] === TILE.EMPTY) {
        map[py][px] = [TILE.WALL2, TILE.WALL3, TILE.WALL4][i % 3];
      }
    }

    // Place player in first room
    player.x = rooms[0].cx + 0.5;
    player.y = rooms[0].cy + 0.5;
    player.angle = 0;
    // Make sure spawn is clear
    map[rooms[0].cy][rooms[0].cx] = TILE.EMPTY;

    // Place exit door in last room
    const lastRoom = rooms[rooms.length - 1];
    map[lastRoom.cy][lastRoom.cx] = TILE.EXIT;

    // Spawn enemies
    enemies = [];
    const enemyCount = 3 + lvl * 3;
    const typeCount = Math.min(lvl + 1, 4);
    for (let i = 0; i < enemyCount; i++) {
      const room = rooms[1 + Math.floor(rng() * (rooms.length - 1))];
      const ex = room.x + 1 + Math.floor(rng() * (room.w - 2));
      const ey = room.y + 1 + Math.floor(rng() * (room.h - 2));
      if (map[ey][ex] === TILE.EMPTY) {
        const type = Math.floor(rng() * typeCount);
        enemies.push(makeEnemy(ex + 0.5, ey + 0.5, type));
      }
    }

    // Spawn pickups
    pickups = [];
    const pickupCount = 2 + lvl;
    for (let i = 0; i < pickupCount; i++) {
      const room = rooms[Math.floor(rng() * rooms.length)];
      const px = room.x + 1 + Math.floor(rng() * (room.w - 2)) + 0.5;
      const py = room.y + 1 + Math.floor(rng() * (room.h - 2)) + 0.5;
      pickups.push({ x: px, y: py, type: i % 2 === 0 ? 'health' : 'ammo' });
    }

    doorOpen = false;
  }

  // ── Enemy types ──
  const ENEMY_DEFS = [
    { name: 'Blob',    hp: 30,  speed: 1.5, damage: 10, color: '#ff69b4', score: 100, size: 0.4 },
    { name: 'Spitter', hp: 50,  speed: 1.0, damage: 8,  color: '#4488ff', score: 200, size: 0.35 },
    { name: 'Charger', hp: 40,  speed: 3.0, damage: 20, color: '#44ff44', score: 300, size: 0.3 },
    { name: 'Tank',    hp: 150, speed: 0.8, damage: 15, color: '#9944ff', score: 500, size: 0.6 },
  ];

  function makeEnemy(x, y, type) {
    const def = ENEMY_DEFS[type];
    return { x, y, type, hp: def.hp, maxHp: def.hp, attackTimer: 0, alive: true };
  }

  // ── Raycasting core ──
  function castRay(ox, oy, angle) {
    const sin = Math.sin(angle), cos = Math.cos(angle);
    const dx = cos, dy = sin;
    let mapX = Math.floor(ox), mapY = Math.floor(oy);
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
    const deltaX = Math.abs(1 / (dx || 1e-10)), deltaY = Math.abs(1 / (dy || 1e-10));
    let sideDistX = dx > 0 ? (mapX + 1 - ox) * deltaX : (ox - mapX) * deltaX;
    let sideDistY = dy > 0 ? (mapY + 1 - oy) * deltaY : (oy - mapY) * deltaY;
    let side = 0, dist = 0, tile = 0;

    for (let i = 0; i < 64; i++) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaY;
        mapY += stepY;
        side = 1;
      }
      if (mapX < 0 || mapY < 0 || mapX >= MAP_W || mapY >= MAP_H) break;
      tile = map[mapY][mapX];
      if (tile > 0 && tile !== TILE.SPAWN) {
        if (tile === TILE.EXIT && doorOpen) continue; // open exit = passable
        dist = side === 0 ? sideDistX - deltaX : sideDistY - deltaY;
        return { dist, side, tile, mapX, mapY };
      }
    }
    return { dist: 64, side: 0, tile: 0, mapX, mapY };
  }

  // ── Rendering ──
  function render() {
    // Sky + floor
    ctx.fillStyle = '#0a0014';
    ctx.fillRect(0, 0, W, H / 2);
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(0, H / 2, W, H / 2);

    // Floor gradient for depth
    const grad = ctx.createLinearGradient(0, H / 2, 0, H);
    grad.addColorStop(0, '#2a1040');
    grad.addColorStop(1, '#0a0014');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H / 2, W, H / 2);

    // Ceiling gradient
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, H / 2);
    ceilGrad.addColorStop(0, '#0a0014');
    ceilGrad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, W, H / 2);

    // Z-buffer for sprite clipping
    const zBuffer = new Float32Array(RAYS);
    const stripW = W / RAYS;

    // Cast rays
    for (let i = 0; i < RAYS; i++) {
      const rayAngle = player.angle - HALF_FOV + (i / RAYS) * FOV;
      const hit = castRay(player.x, player.y, rayAngle);
      const corrDist = hit.dist * Math.cos(rayAngle - player.angle); // fisheye fix
      zBuffer[i] = corrDist;

      if (hit.tile > 0) {
        const wallH = Math.min(H / corrDist, H * 2);
        const wallTop = (H - wallH) / 2;

        // Pick color based on tile type and side
        const colors = hit.side === 1 ? WALL_COLORS_DARK : WALL_COLORS;
        ctx.fillStyle = colors[hit.tile] || '#6a1b9a';

        // Distance fog
        const fog = Math.max(0, 1 - corrDist / 16);
        ctx.globalAlpha = Math.max(0.15, fog);
        ctx.fillRect(Math.floor(i * stripW), Math.floor(wallTop), Math.ceil(stripW) + 1, Math.ceil(wallH));

        // Add stripe texture effect
        if (hit.side === 0 && stripW > 1.5) {
          ctx.globalAlpha = 0.08;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.floor(i * stripW), Math.floor(wallTop), 1, Math.ceil(wallH));
        }
        ctx.globalAlpha = 1;
      }
    }

    // ── Render sprites (enemies + pickups) ──
    const sprites = [];

    // Enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - player.x, dy = e.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) - player.angle;
      // Normalize angle
      let a = angle;
      while (a > Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      if (Math.abs(a) < HALF_FOV + 0.2) {
        sprites.push({ type: 'enemy', obj: e, dist, angle: a });
      }
    }

    // Pickups
    for (const p of pickups) {
      const dx = p.x - player.x, dy = p.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) - player.angle;
      let a = angle;
      while (a > Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      if (Math.abs(a) < HALF_FOV + 0.2) {
        sprites.push({ type: 'pickup', obj: p, dist, angle: a });
      }
    }

    // Sort back-to-front
    sprites.sort((a, b) => b.dist - a.dist);

    for (const sp of sprites) {
      const corrDist = sp.dist * Math.cos(sp.angle);
      if (corrDist < 0.2) continue;
      const spriteH = Math.min(H / corrDist, H * 2);
      const screenX = W / 2 + (sp.angle / HALF_FOV) * (W / 2);
      const spriteW = spriteH * 0.6;
      const fog = Math.max(0, 1 - corrDist / 16);

      // Check z-buffer for visibility
      const startRay = Math.floor(((screenX - spriteW / 2) / W) * RAYS);
      const endRay = Math.floor(((screenX + spriteW / 2) / W) * RAYS);
      let visible = false;
      for (let r = Math.max(0, startRay); r < Math.min(RAYS, endRay); r++) {
        if (corrDist < zBuffer[r]) { visible = true; break; }
      }
      if (!visible) continue;

      ctx.globalAlpha = Math.max(0.15, fog);

      if (sp.type === 'enemy') {
        const def = ENEMY_DEFS[sp.obj.type];
        const topY = (H - spriteH) / 2 + spriteH * 0.1;
        const bodyH = spriteH * 0.7;

        // Body
        ctx.fillStyle = def.color;
        ctx.fillRect(screenX - spriteW / 2, topY, spriteW, bodyH);

        // Eyes (two red dots)
        ctx.fillStyle = '#ff0000';
        const eyeSize = Math.max(2, spriteW * 0.12);
        const eyeY = topY + bodyH * 0.25;
        ctx.fillRect(screenX - spriteW * 0.2, eyeY, eyeSize, eyeSize);
        ctx.fillRect(screenX + spriteW * 0.1, eyeY, eyeSize, eyeSize);

        // Health bar above
        if (sp.obj.hp < sp.obj.maxHp) {
          const barW = spriteW * 0.8;
          const barH = Math.max(2, spriteH * 0.03);
          const barX = screenX - barW / 2;
          const barY = topY - barH - 4;
          ctx.fillStyle = '#333';
          ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(barX, barY, barW * (sp.obj.hp / sp.obj.maxHp), barH);
        }
      } else {
        // Pickup
        const topY = (H - spriteH * 0.3) / 2 + spriteH * 0.15;
        const sz = spriteH * 0.25;
        if (sp.obj.type === 'health') {
          ctx.fillStyle = '#ff2222';
          ctx.fillRect(screenX - sz / 6, topY, sz / 3, sz);
          ctx.fillRect(screenX - sz / 2, topY + sz / 3, sz, sz / 3);
        } else {
          ctx.fillStyle = '#ff8800';
          ctx.fillRect(screenX - sz / 2, topY, sz, sz * 0.7);
          ctx.fillStyle = '#cc6600';
          ctx.fillRect(screenX - sz / 2, topY + sz * 0.3, sz, sz * 0.15);
        }
      }
      ctx.globalAlpha = 1;
    }

    // ── Weapon view ──
    drawWeapon();

    // ── Damage flash ──
    if (damageFlash > 0) {
      ctx.globalAlpha = damageFlash * 0.4;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // ── Level transition flash ──
    if (levelFlash > 0) {
      ctx.globalAlpha = levelFlash;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      if (levelFlash > 0.3) {
        ctx.globalAlpha = levelFlash;
        ctx.fillStyle = '#44ffaa';
        ctx.font = `bold ${Math.floor(H * 0.08)}px 'Courier New', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL ' + level, W / 2, H / 2);
        ctx.globalAlpha = 1;
      }
    }

    // ── Muzzle flash ──
    if (muzzleFlash > 0) {
      ctx.globalAlpha = muzzleFlash;
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.72, 20 + muzzleFlash * 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawWeapon() {
    const wx = W / 2, wy = H * 0.82;
    const bob = Math.sin(Date.now() * 0.004) * 3;

    // Pistol body
    ctx.fillStyle = '#666';
    ctx.fillRect(wx - 12, wy - 40 + bob, 24, 45);
    ctx.fillStyle = '#888';
    ctx.fillRect(wx - 8, wy - 55 + bob, 16, 20);
    // Barrel
    ctx.fillStyle = '#555';
    ctx.fillRect(wx - 4, wy - 70 + bob, 8, 18);
    // Grip highlight
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(wx - 10, wy - 38 + bob, 2, 30);
  }

  // ── Minimap ──
  function drawMinimap() {
    mctx.fillStyle = 'rgba(0,0,0,0.8)';
    mctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    const scale = MINIMAP_SIZE / MAP_W;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tile = map[y][x];
        if (tile > 0 && !(tile === TILE.EXIT && doorOpen)) {
          mctx.fillStyle = WALL_COLORS[tile] || '#6a1b9a';
          mctx.globalAlpha = 0.7;
          mctx.fillRect(x * scale, y * scale, scale, scale);
          mctx.globalAlpha = 1;
        }
      }
    }

    // Pickups
    for (const p of pickups) {
      mctx.fillStyle = p.type === 'health' ? '#ff2222' : '#ff8800';
      mctx.fillRect(p.x * scale - 1.5, p.y * scale - 1.5, 3, 3);
    }

    // Enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      mctx.fillStyle = '#ffff00';
      mctx.fillRect(e.x * scale - 2, e.y * scale - 2, 4, 4);
    }

    // Player
    mctx.fillStyle = '#ffffff';
    mctx.beginPath();
    mctx.arc(player.x * scale, player.y * scale, 3, 0, Math.PI * 2);
    mctx.fill();

    // Direction line
    mctx.strokeStyle = '#44ffaa';
    mctx.lineWidth = 1.5;
    mctx.beginPath();
    mctx.moveTo(player.x * scale, player.y * scale);
    mctx.lineTo(
      (player.x + Math.cos(player.angle) * 2) * scale,
      (player.y + Math.sin(player.angle) * 2) * scale
    );
    mctx.stroke();
  }

  // ── HUD update ──
  function updateHUD() {
    healthVal.textContent = Math.ceil(player.health);
    ammoVal.textContent = player.ammo;
    scoreVal.textContent = player.score;
    levelVal.textContent = level;
    weaponName.textContent = 'SPLAT PISTOL';
    const pct = player.health / 100;
    healthBar.style.width = (pct * 100) + '%';
    healthBar.style.background = pct > 0.5 ? '#44ff44' : pct > 0.25 ? '#ffaa00' : '#ff4444';
  }

  // ── Collision ──
  function isWall(x, y) {
    const mx = Math.floor(x), my = Math.floor(y);
    if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) return true;
    const tile = map[my][mx];
    if (tile === TILE.EMPTY || tile === TILE.SPAWN) return false;
    if (tile === TILE.EXIT && doorOpen) return false;
    return tile > 0;
  }

  function tryMove(nx, ny) {
    const pad = 0.2;
    // Check all four corners of the player's collision box
    if (!isWall(nx - pad, ny - pad) && !isWall(nx + pad, ny - pad) &&
        !isWall(nx - pad, ny + pad) && !isWall(nx + pad, ny + pad)) {
      return { x: nx, y: ny };
    }
    // Try sliding along X
    if (!isWall(nx - pad, player.y - pad) && !isWall(nx + pad, player.y - pad) &&
        !isWall(nx - pad, player.y + pad) && !isWall(nx + pad, player.y + pad)) {
      return { x: nx, y: player.y };
    }
    // Try sliding along Y
    if (!isWall(player.x - pad, ny - pad) && !isWall(player.x + pad, ny - pad) &&
        !isWall(player.x - pad, ny + pad) && !isWall(player.x + pad, ny + pad)) {
      return { x: player.x, y: ny };
    }
    return { x: player.x, y: player.y };
  }

  // ── Shooting ──
  function shoot() {
    if (shootTimer > 0 || player.ammo <= 0) return;
    player.ammo--;
    shootTimer = 0.2;
    muzzleFlash = 1;
    playShootSound();

    // Hitscan: cast ray from player center
    const hit = castRay(player.x, player.y, player.angle);

    // Check enemies along the ray
    let closestEnemy = null, closestDist = hit.dist;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - player.x, dy = e.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > closestDist) continue;
      const angle = Math.atan2(dy, dx) - player.angle;
      let a = angle;
      while (a > Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      const def = ENEMY_DEFS[e.type];
      const hitWidth = def.size / dist;
      if (Math.abs(a) < hitWidth && dist < closestDist) {
        closestEnemy = e;
        closestDist = dist;
      }
    }

    if (closestEnemy) {
      closestEnemy.hp -= 15;
      if (closestEnemy.hp <= 0) {
        closestEnemy.alive = false;
        const def = ENEMY_DEFS[closestEnemy.type];
        player.score += def.score;
        player.kills++;
        playKillSound();
        checkDoorUnlock();
      }
    }
  }

  function checkDoorUnlock() {
    if (!doorOpen && enemies.every(e => !e.alive)) {
      doorOpen = true;
    }
  }

  // ── Audio (simple procedural) ──
  let audioCtx = null;
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playShootSound() {
    try {
      const a = getAudio(), t = a.currentTime;
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain).connect(a.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch (_) { /* no audio */ }
  }

  function playKillSound() {
    try {
      const a = getAudio(), t = a.currentTime;
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.2);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain).connect(a.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    } catch (_) { /* no audio */ }
  }

  function playHurtSound() {
    try {
      const a = getAudio(), t = a.currentTime;
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain).connect(a.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (_) { /* no audio */ }
  }

  function playPickupSound() {
    try {
      const a = getAudio(), t = a.currentTime;
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, t);
      osc.frequency.exponentialRampToValueAtTime(1000, t + 0.1);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain).connect(a.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (_) { /* no audio */ }
  }

  // ── Enemy AI update ──
  function updateEnemyAI(dt) {
    for (const e of enemies) {
      if (!e.alive) continue;
      const def = ENEMY_DEFS[e.type];
      const dx = player.x - e.x, dy = player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Simple LOS check: can enemy see player?
      const angle = Math.atan2(dy, dx);
      const los = castRay(e.x, e.y, angle);
      const canSee = los.dist >= dist - 0.5;

      if (canSee && dist > 1.0) {
        // Move toward player
        const speed = def.speed * dt;
        const nx = e.x + (dx / dist) * speed;
        const ny = e.y + (dy / dist) * speed;
        if (!isWall(nx, ny)) {
          e.x = nx;
          e.y = ny;
        } else if (!isWall(nx, e.y)) {
          e.x = nx;
        } else if (!isWall(e.x, ny)) {
          e.y = ny;
        }
      }

      // Attack when close
      if (dist < 1.5 && canSee) {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = 1.0;
          player.health -= def.damage;
          damageFlash = 1;
          playHurtSound();
          if (player.health <= 0) {
            player.health = 0;
            die();
          }
        }
      }
    }
  }

  // ── Pickup collision ──
  function checkPickups() {
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      const dx = p.x - player.x, dy = p.y - player.y;
      if (dx * dx + dy * dy < 0.64) {
        if (p.type === 'health' && player.health < 100) {
          player.health = Math.min(100, player.health + 25);
          playPickupSound();
          pickups.splice(i, 1);
        } else if (p.type === 'ammo') {
          player.ammo += 10;
          playPickupSound();
          pickups.splice(i, 1);
        }
      }
    }
  }

  // ── Exit check ──
  function checkExit() {
    if (!doorOpen) return;
    const mx = Math.floor(player.x), my = Math.floor(player.y);
    if (map[my] && map[my][mx] === TILE.EXIT) {
      if (level >= MAX_LEVEL) {
        win();
      } else {
        level++;
        levelFlash = 1;
        generateMap(level);
        player.health = Math.min(100, player.health + 25);
        player.ammo += 15;
      }
    }
  }

  // ── Screen transitions ──
  function die() {
    screen = 'dead';
    hudOverlay.classList.remove('active');
    deathScreen.classList.add('active');
    document.getElementById('death-score').textContent = 'SCORE: ' + player.score;
    document.getElementById('death-kills').textContent = 'KILLS: ' + player.kills;
    document.getElementById('death-level').textContent = 'REACHED LEVEL: ' + level;
    document.exitPointerLock && document.exitPointerLock();
  }

  function win() {
    screen = 'dead'; // reuse death screen
    hudOverlay.classList.remove('active');
    deathScreen.querySelector('.death-title').textContent = 'YOU WIN!';
    deathScreen.querySelector('.death-title').style.color = '#44ffaa';
    deathScreen.classList.add('active');
    document.getElementById('death-score').textContent = 'FINAL SCORE: ' + player.score;
    document.getElementById('death-kills').textContent = 'TOTAL KILLS: ' + player.kills;
    document.getElementById('death-level').textContent = 'ALL LEVELS CLEARED!';
    document.exitPointerLock && document.exitPointerLock();
  }

  function startGame() {
    screen = 'playing';
    level = 1;
    player.health = 100;
    player.ammo = 30;
    player.score = 0;
    player.kills = 0;
    generateMap(level);
    titleScreen.style.display = 'none';
    deathScreen.classList.remove('active');
    // Reset death screen text in case of win
    deathScreen.querySelector('.death-title').textContent = 'YOU DIED';
    deathScreen.querySelector('.death-title').style.color = '';
    hudOverlay.classList.add('active');
    canvas.requestPointerLock && canvas.requestPointerLock();
  }

  // ── Input handlers ──
  document.addEventListener('keydown', e => { keys[e.code] = true; });
  document.addEventListener('keyup', e => { keys[e.code] = false; });

  document.addEventListener('mousemove', e => {
    if (document.pointerLockElement === canvas) {
      player.angle += e.movementX * MOUSE_SENS;
    }
  });

  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === canvas;
  });

  document.addEventListener('click', () => {
    if (screen === 'title') {
      startGame();
    } else if (screen === 'dead') {
      startGame();
    } else if (screen === 'playing') {
      if (!pointerLocked) {
        canvas.requestPointerLock && canvas.requestPointerLock();
      }
      shoot();
    }
  });

  // ── Game loop ──
  let lastTime = 0;
  function gameLoop(time) {
    requestAnimationFrame(gameLoop);
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    if (screen === 'playing') {
      // Movement
      let dx = 0, dy = 0;
      const cos = Math.cos(player.angle), sin = Math.sin(player.angle);
      if (keys['KeyW'] || keys['ArrowUp'])   { dx += cos; dy += sin; }
      if (keys['KeyS'] || keys['ArrowDown']) { dx -= cos; dy -= sin; }
      // A/D always strafe
      if (keys['KeyA']) { dx += sin; dy -= cos; }
      if (keys['KeyD']) { dx -= sin; dy += cos; }
      // Arrow keys: rotate when no pointer lock, strafe when locked
      if (!pointerLocked) {
        if (keys['ArrowLeft'])  player.angle -= ROT_SPEED * dt;
        if (keys['ArrowRight']) player.angle += ROT_SPEED * dt;
      } else {
        if (keys['ArrowLeft'])  { dx += sin; dy -= cos; }
        if (keys['ArrowRight']) { dx -= sin; dy += cos; }
      }

      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len; dy /= len;
        const result = tryMove(
          player.x + dx * MOVE_SPEED * dt,
          player.y + dy * MOVE_SPEED * dt
        );
        player.x = result.x;
        player.y = result.y;
      }

      // Timers
      if (shootTimer > 0) shootTimer -= dt;
      if (damageFlash > 0) damageFlash = Math.max(0, damageFlash - dt * 4);
      if (levelFlash > 0) levelFlash = Math.max(0, levelFlash - dt * 1.5);
      if (muzzleFlash > 0) muzzleFlash = Math.max(0, muzzleFlash - dt * 12);

      // AI
      updateEnemyAI(dt);
      checkPickups();
      checkExit();
      updateHUD();
    }

    // Always render if playing
    if (screen === 'playing') {
      render();
      drawMinimap();
    } else if (screen === 'title') {
      // Animate background
      ctx.fillStyle = '#0a0014';
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ── Start ──
  requestAnimationFrame(gameLoop);
})();
