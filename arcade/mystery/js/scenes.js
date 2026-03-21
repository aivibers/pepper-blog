/* scenes.js — scene builder: modular room/environment construction */

/**
 * Create a complete scene for a given template type.
 * @param {string} type — 'museum' | 'kitchen' | 'library'
 * @param {function} rng — seeded RNG
 * @returns {{ layers: object, characterSlots: Array<{x:number,y:number}>, name: string }}
 */
function createScene(type, rng) {
  switch (type) {
    case 'museum':  return _buildMuseum(rng);
    case 'kitchen': return _buildKitchen(rng);
    case 'library': return _buildLibrary(rng);
    default:        return _buildMuseum(rng);
  }
}

/**
 * Draw a single layer of the scene on the canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} scene
 * @param {string} layerName — 'background' | 'furniture' | 'objects' | 'foreground'
 * @param {number} scale — worldToScreen scale factor
 */
function drawScene(ctx, scene, layerName, scale) {
  const layer = scene.layers[layerName];
  if (!layer) return;
  for (const item of layer) {
    _drawSceneItem(ctx, item, scale);
  }
}

/**
 * Draw a single scene item.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} item  — { x, y, w, h, color } (w,h in pixel units)
 * @param {number} scale
 */
function _drawSceneItem(ctx, item, scale) {
  drawPixelRect(ctx, item.x, item.y, item.w, item.h, item.color, scale);
}

/* ===================================================================
 *  Scene templates
 * =================================================================== */

/** Museum — gallery with paintings, benches, pillars, display cases */
function _buildMuseum(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background: walls & floor ---
  // Back wall
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 120, color: '#1e2530' });
  // Wainscoting (lower wall)
  bg.push({ x: 0, y: 120 * PIXEL_SIZE, w: WORLD_W / PIXEL_SIZE, h: 30, color: '#161b22' });
  // Floor — checkerboard marble
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 10) {
    for (let row = 150; row < WORLD_H / PIXEL_SIZE; row += 10) {
      const isLight = ((col / 10 + row / 10) % 2 === 0);
      bg.push({
        x: col * PIXEL_SIZE,
        y: row * PIXEL_SIZE,
        w: 10, h: 10,
        color: isLight ? '#c8c8c8' : '#a0a0a0',
      });
    }
  }

  // --- Furniture: pillars ---
  const pillarPositions = [200, 600, 1000, 1400];
  for (const px of pillarPositions) {
    furniture.push({ x: px, y: 200, w: 6, h: 60, color: '#b0b0b0' }); // shaft
    furniture.push({ x: px - 4, y: 200, w: 10, h: 4, color: '#c0c0c0' }); // capital
    furniture.push({ x: px - 4, y: 440, w: 10, h: 4, color: '#c0c0c0' }); // base
  }

  // --- Furniture: benches ---
  furniture.push({ x: 400, y: 700, w: 30, h: 5, color: PALETTE.wood });
  furniture.push({ x: 400, y: 720, w: 3, h: 10, color: PALETTE.wood });
  furniture.push({ x: 508, y: 720, w: 3, h: 10, color: PALETTE.wood });

  furniture.push({ x: 900, y: 700, w: 30, h: 5, color: PALETTE.wood });
  furniture.push({ x: 900, y: 720, w: 3, h: 10, color: PALETTE.wood });
  furniture.push({ x: 1008, y: 720, w: 3, h: 10, color: PALETTE.wood });

  // --- Furniture: display cases ---
  const casePositions = [300, 700, 1100];
  for (const cx of casePositions) {
    furniture.push({ x: cx, y: 540, w: 24, h: 4, color: PALETTE.glass });  // glass top
    furniture.push({ x: cx, y: 556, w: 24, h: 16, color: '#333' });        // base
  }

  // --- Furniture: paintings ---
  const paintingColors = [PALETTE.red, PALETTE.blue, PALETTE.green, '#d2a8ff', '#ffa657'];
  const paintingXs = [100, 380, 660, 940, 1220];
  for (let i = 0; i < paintingXs.length; i++) {
    const pw = 12 + Math.floor(rng() * 8);
    const ph = 10 + Math.floor(rng() * 6);
    const px = paintingXs[i];
    const py = 120;
    // Gold frame
    furniture.push({ x: px - 4, y: (py - 4) * PIXEL_SIZE / PIXEL_SIZE, w: pw + 2, h: ph + 2, color: PALETTE.gold });
    // Canvas fill
    furniture.push({ x: px, y: py * PIXEL_SIZE / PIXEL_SIZE, w: pw - 2, h: ph - 2, color: paintingColors[i % paintingColors.length] });
  }

  // --- Furniture: rope barriers ---
  furniture.push({ x: 260, y: 650, w: 2, h: 10, color: PALETTE.gold });
  furniture.push({ x: 340, y: 650, w: 2, h: 10, color: PALETTE.gold });
  furniture.push({ x: 260, y: 650, w: 22, h: 1, color: '#CC0000' });

  furniture.push({ x: 1060, y: 650, w: 2, h: 10, color: PALETTE.gold });
  furniture.push({ x: 1140, y: 650, w: 2, h: 10, color: PALETTE.gold });
  furniture.push({ x: 1060, y: 650, w: 22, h: 1, color: '#CC0000' });

  // --- Objects: small decorative items on display cases ---
  for (const cx of casePositions) {
    const itemColor = pick(rng, [PALETTE.gold, PALETTE.red, PALETTE.blue, '#d2a8ff']);
    objects.push({ x: cx + 8, y: 528, w: 4, h: 3, color: itemColor });
  }

  // --- Objects: floor vent ---
  objects.push({ x: 750, y: 900, w: 10, h: 3, color: PALETTE.metal });

  // --- Character slots (18 total, spread around the room) ---
  const characterSlots = [
    // Row 1 — near the back wall
    { x: 150, y: 520 }, { x: 350, y: 520 }, { x: 550, y: 530 },
    { x: 750, y: 520 }, { x: 950, y: 530 }, { x: 1150, y: 520 },
    { x: 1350, y: 520 },
    // Row 2 — middle area
    { x: 250, y: 680 }, { x: 480, y: 690 }, { x: 700, y: 680 },
    { x: 920, y: 690 }, { x: 1100, y: 680 }, { x: 1300, y: 690 },
    // Row 3 — front
    { x: 200, y: 870 }, { x: 500, y: 880 }, { x: 800, y: 870 },
    { x: 1100, y: 880 }, { x: 1400, y: 870 },
  ];

  // Add slight random offset to each slot
  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'Museum Gallery',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}

/** Kitchen — restaurant kitchen with counters, stoves, shelves */
function _buildKitchen(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background ---
  // Back wall
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 150, color: '#e8e0d0' });
  // Tile floor — grid pattern
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 8) {
    for (let row = 150; row < WORLD_H / PIXEL_SIZE; row += 8) {
      bg.push({
        x: col * PIXEL_SIZE,
        y: row * PIXEL_SIZE,
        w: 7, h: 7,
        color: (col / 8 + row / 8) % 2 === 0 ? '#d4d4d4' : '#c0c0c0',
      });
    }
  }

  // --- Furniture: stainless steel counters along the back ---
  furniture.push({ x: 0, y: 500, w: 180, h: 20, color: PALETTE.metal });
  furniture.push({ x: 0, y: 580, w: 180, h: 30, color: '#555555' });

  furniture.push({ x: 880, y: 500, w: 180, h: 20, color: PALETTE.metal });
  furniture.push({ x: 880, y: 580, w: 180, h: 30, color: '#555555' });

  // --- Furniture: stove/oven ---
  furniture.push({ x: 100, y: 330, w: 30, h: 30, color: '#333333' });
  // Burners
  objects.push({ x: 104, y: 332, w: 5, h: 5, color: '#555555' });
  objects.push({ x: 116, y: 332, w: 5, h: 5, color: '#555555' });
  objects.push({ x: 104, y: 348, w: 5, h: 5, color: '#555555' });
  objects.push({ x: 116, y: 348, w: 5, h: 5, color: '#555555' });

  furniture.push({ x: 1200, y: 330, w: 30, h: 30, color: '#333333' });
  objects.push({ x: 1204, y: 332, w: 5, h: 5, color: '#555555' });
  objects.push({ x: 1216, y: 332, w: 5, h: 5, color: '#555555' });

  // --- Furniture: hanging pots/pans ---
  const potPositions = [200, 280, 360, 1000, 1080, 1160];
  for (const px of potPositions) {
    furniture.push({ x: px, y: 120, w: 1, h: 10, color: '#555555' }); // hook
    furniture.push({ x: px - 4, y: 160, w: 8, h: 5, color: PALETTE.metal }); // pan
  }

  // --- Furniture: central prep table ---
  furniture.push({ x: 560, y: 600, w: 60, h: 20, color: PALETTE.wood });
  furniture.push({ x: 560, y: 680, w: 3, h: 20, color: PALETTE.wood }); // leg
  furniture.push({ x: 792, y: 680, w: 3, h: 20, color: PALETTE.wood }); // leg

  // --- Furniture: shelving on back wall ---
  const shelfYs = [200, 280];
  for (const sy of shelfYs) {
    furniture.push({ x: 500, y: sy, w: 80, h: 3, color: PALETTE.metal });
    // Colorful ingredient containers
    for (let i = 0; i < 6; i++) {
      const col = pick(rng, PALETTE.clothing);
      objects.push({ x: 510 + i * 40, y: sy - 16, w: 4, h: 4, color: col });
    }
  }

  // --- Objects: scattered kitchen items ---
  objects.push({ x: 580, y: 588, w: 6, h: 3, color: PALETTE.green }); // cutting board
  objects.push({ x: 620, y: 590, w: 2, h: 2, color: PALETTE.red });   // tomato
  objects.push({ x: 650, y: 588, w: 3, h: 4, color: '#FFFFFF' });     // plate

  // --- Character slots (16 total) ---
  const characterSlots = [
    // Back row
    { x: 250, y: 540 }, { x: 450, y: 530 }, { x: 750, y: 540 },
    { x: 1050, y: 530 }, { x: 1350, y: 540 },
    // Middle row
    { x: 150, y: 700 }, { x: 400, y: 710 }, { x: 650, y: 700 },
    { x: 900, y: 710 }, { x: 1200, y: 700 }, { x: 1450, y: 710 },
    // Front row
    { x: 200, y: 880 }, { x: 500, y: 870 }, { x: 800, y: 880 },
    { x: 1100, y: 870 }, { x: 1400, y: 880 },
  ];

  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'Restaurant Kitchen',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}

/** Library — reading room with bookshelves, desks, lamps, armchairs */
function _buildLibrary(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background ---
  // Walls — warm tones
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 150, color: '#2a2218' });
  // Wood floor
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 12) {
    for (let row = 150; row < WORLD_H / PIXEL_SIZE; row += 3) {
      bg.push({
        x: col * PIXEL_SIZE,
        y: row * PIXEL_SIZE,
        w: 11, h: 2,
        color: row % 2 === 0 ? '#8B6914' : '#7A5C12',
      });
    }
  }

  // --- Furniture: tall bookshelves along back wall ---
  const shelfXs = [40, 280, 520, 1000, 1240];
  for (const sx of shelfXs) {
    // Bookshelf body
    furniture.push({ x: sx, y: 80, w: 45, h: 80, color: '#5C3D2E' });
    // Shelves
    for (let sy = 0; sy < 5; sy++) {
      furniture.push({ x: sx, y: 80 + sy * 64, w: 45, h: 2, color: '#4A3020' });
      // Book spines — random colors
      for (let bi = 0; bi < 8; bi++) {
        const bc = pick(rng, PALETTE.clothing);
        const bw = 2 + Math.floor(rng() * 3);
        objects.push({
          x: sx + 4 + bi * 20,
          y: 80 + sy * 64 - 14,
          w: bw, h: 3, color: bc,
        });
      }
    }
  }

  // --- Furniture: reading desks ---
  const deskXs = [200, 700, 1200];
  for (const dx of deskXs) {
    furniture.push({ x: dx, y: 620, w: 40, h: 10, color: PALETTE.wood }); // top
    furniture.push({ x: dx + 4, y: 660, w: 3, h: 16, color: PALETTE.wood }); // leg
    furniture.push({ x: dx + 132, y: 660, w: 3, h: 16, color: PALETTE.wood }); // leg
    // Lamp on desk
    objects.push({ x: dx + 60, y: 596, w: 4, h: 6, color: PALETTE.gold });
    objects.push({ x: dx + 56, y: 590, w: 8, h: 2, color: '#DAA520' }); // shade
  }

  // --- Furniture: armchairs ---
  const chairXs = [100, 900, 1380];
  for (const ax of chairXs) {
    furniture.push({ x: ax, y: 740, w: 18, h: 16, color: '#703030' }); // seat
    furniture.push({ x: ax - 4, y: 720, w: 4, h: 20, color: '#703030' }); // left arm
    furniture.push({ x: ax + 68, y: 720, w: 4, h: 20, color: '#703030' }); // right arm
    furniture.push({ x: ax, y: 710, w: 18, h: 8, color: '#803030' }); // back
  }

  // --- Furniture: card catalog ---
  furniture.push({ x: 1400, y: 400, w: 30, h: 30, color: '#5C3D2E' });
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      objects.push({
        x: 1404 + c * 20, y: 404 + r * 28,
        w: 3, h: 4, color: PALETTE.metal,
      });
    }
  }

  // --- Furniture: globe on a stand ---
  objects.push({ x: 60, y: 700, w: 1, h: 10, color: PALETTE.wood }); // stand
  objects.push({ x: 52, y: 668, w: 6, h: 6, color: PALETTE.blue });  // globe body
  objects.push({ x: 52, y: 670, w: 6, h: 2, color: PALETTE.green }); // land

  // --- Character slots (18 total) ---
  const characterSlots = [
    // Near bookshelves
    { x: 180, y: 540 }, { x: 400, y: 530 }, { x: 640, y: 540 },
    { x: 860, y: 530 }, { x: 1100, y: 540 }, { x: 1360, y: 530 },
    // Middle area (around desks)
    { x: 260, y: 700 }, { x: 500, y: 710 }, { x: 760, y: 700 },
    { x: 960, y: 710 }, { x: 1150, y: 700 }, { x: 1400, y: 710 },
    // Front row
    { x: 150, y: 870 }, { x: 400, y: 880 }, { x: 650, y: 870 },
    { x: 900, y: 880 }, { x: 1150, y: 870 }, { x: 1400, y: 880 },
  ];

  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'Reading Room',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}
