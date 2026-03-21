/* scenes.js — scene builder: modular room/environment construction */

/**
 * Create a complete scene for a given template type.
 * @param {string} type — 'museum' | 'kitchen' | 'library'
 * @param {function} rng — seeded RNG
 * @returns {{ layers: object, characterSlots: Array<{x:number,y:number}>, name: string }}
 */
function createScene(type, rng) {
  switch (type) {
    case 'museum':        return _buildMuseum(rng);
    case 'kitchen':       return _buildKitchen(rng);
    case 'library':       return _buildLibrary(rng);
    case 'park':          return _buildPark(rng);
    case 'train_station': return _buildTrainStation(rng);
    case 'hotel_lobby':   return _buildHotelLobby(rng);
    case 'market':        return _buildMarket(rng);
    case 'theater':       return _buildTheater(rng);
    case 'office':        return _buildOffice(rng);
    case 'gallery':       return _buildGallery(rng);
    case 'cafe':          return _buildCafe(rng);
    case 'harbor':        return _buildHarbor(rng);
    case 'garden':        return _buildGarden(rng);
    case 'ballroom':      return _buildBallroom(rng);
    case 'lab':           return _buildLab(rng);
    default:              return _buildMuseum(rng);
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

/** Park — outdoor green space: grass, paths, benches, trees, fountain, flower beds */
function _buildPark(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background: sky gradient ---
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 80, color: '#4a90c2' });
  bg.push({ x: 0, y: 320, w: WORLD_W / PIXEL_SIZE, h: 20, color: '#6aaedb' });
  // Grass field
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 6) {
    for (let row = 100; row < WORLD_H / PIXEL_SIZE; row += 6) {
      const shade = (col + row) % 12 === 0 ? '#3d8b37' : '#4a9e44';
      bg.push({ x: col * PIXEL_SIZE, y: row * PIXEL_SIZE, w: 6, h: 6, color: shade });
    }
  }

  // --- Gravel path (horizontal) ---
  bg.push({ x: 0, y: 640, w: WORLD_W / PIXEL_SIZE, h: 20, color: '#c8b89a' });
  bg.push({ x: 0, y: 720, w: WORLD_W / PIXEL_SIZE, h: 2, color: '#b0a080' });

  // --- Trees ---
  const treeXs = [80, 360, 800, 1200, 1480];
  for (const tx of treeXs) {
    furniture.push({ x: tx, y: 320, w: 3, h: 40, color: '#6B4226' }); // trunk
    furniture.push({ x: tx - 10, y: 200, w: 24, h: 24, color: '#2d6b2e' }); // canopy top
    furniture.push({ x: tx - 14, y: 260, w: 32, h: 20, color: '#357a36' }); // canopy mid
  }

  // --- Benches ---
  const benchXs = [240, 640, 1050];
  for (const bx of benchXs) {
    furniture.push({ x: bx, y: 610, w: 30, h: 4, color: PALETTE.wood }); // seat
    furniture.push({ x: bx, y: 590, w: 30, h: 4, color: PALETTE.wood }); // backrest
    furniture.push({ x: bx + 2, y: 626, w: 2, h: 8, color: '#555' }); // left leg
    furniture.push({ x: bx + 106, y: 626, w: 2, h: 8, color: '#555' }); // right leg
  }

  // --- Fountain (center) ---
  furniture.push({ x: 700, y: 460, w: 40, h: 10, color: '#999' }); // basin rim
  furniture.push({ x: 704, y: 420, w: 36, h: 14, color: '#79c0ff' }); // water
  furniture.push({ x: 716, y: 380, w: 3, h: 10, color: '#999' }); // spout column
  objects.push({ x: 714, y: 364, w: 5, h: 4, color: '#ADD8E6' }); // water spray

  // --- Flower beds ---
  const flowerColors = [PALETTE.red, '#ff69b4', '#ffa657', '#d2a8ff', '#FFD700'];
  for (let i = 0; i < 4; i++) {
    const fx = 160 + i * 360;
    furniture.push({ x: fx, y: 520, w: 20, h: 6, color: '#5a3d1a' }); // soil bed
    for (let f = 0; f < 5; f++) {
      objects.push({ x: fx + 4 + f * 14, y: 508, w: 2, h: 3, color: pick(rng, flowerColors) });
    }
  }

  // --- Character slots (16 total) ---
  const characterSlots = [
    // Back (near trees)
    { x: 180, y: 460 }, { x: 450, y: 470 }, { x: 680, y: 460 },
    { x: 1000, y: 470 }, { x: 1300, y: 460 },
    // Middle (along path)
    { x: 120, y: 640 }, { x: 350, y: 650 }, { x: 580, y: 640 },
    { x: 820, y: 650 }, { x: 1060, y: 640 }, { x: 1350, y: 650 },
    // Front
    { x: 200, y: 840 }, { x: 480, y: 850 }, { x: 760, y: 840 },
    { x: 1080, y: 850 }, { x: 1400, y: 840 },
  ];

  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'City Park',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}

/** Train Station — platform, tracks, benches, ticket booth, clock, columns */
function _buildTrainStation(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background: arched ceiling ---
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 100, color: '#2a3040' });
  bg.push({ x: 0, y: 400, w: WORLD_W / PIXEL_SIZE, h: 10, color: '#3a4050' }); // beam line
  // Platform floor
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 10) {
    for (let row = 110; row < WORLD_H / PIXEL_SIZE; row += 10) {
      const t = (col / 10 + row / 10) % 2 === 0;
      bg.push({ x: col * PIXEL_SIZE, y: row * PIXEL_SIZE, w: 10, h: 10, color: t ? '#b0a898' : '#a09888' });
    }
  }

  // --- Tracks at the bottom ---
  bg.push({ x: 0, y: 900, w: WORLD_W / PIXEL_SIZE, h: 25, color: '#555' });
  // Rails
  for (let rx = 0; rx < WORLD_W; rx += 80) {
    objects.push({ x: rx, y: 920, w: 15, h: 2, color: PALETTE.metal }); // sleeper
  }
  bg.push({ x: 0, y: 916, w: WORLD_W / PIXEL_SIZE, h: 1, color: '#aaa' }); // rail 1
  bg.push({ x: 0, y: 936, w: WORLD_W / PIXEL_SIZE, h: 1, color: '#aaa' }); // rail 2

  // --- Columns ---
  const colPositions = [160, 480, 800, 1120, 1440];
  for (const cx of colPositions) {
    furniture.push({ x: cx, y: 160, w: 5, h: 80, color: '#888' });
    furniture.push({ x: cx - 4, y: 160, w: 10, h: 4, color: '#999' }); // capital
    furniture.push({ x: cx - 4, y: 468, w: 10, h: 4, color: '#999' }); // base
  }

  // --- Ticket booth ---
  furniture.push({ x: 60, y: 440, w: 30, h: 40, color: '#5C3D2E' });
  furniture.push({ x: 60, y: 440, w: 30, h: 6, color: PALETTE.gold }); // sign strip
  objects.push({ x: 68, y: 460, w: 12, h: 8, color: PALETTE.glass }); // window

  // --- Clock ---
  objects.push({ x: 776, y: 100, w: 10, h: 10, color: '#e6edf3' }); // face
  objects.push({ x: 780, y: 104, w: 1, h: 4, color: '#333' }); // hand

  // --- Benches ---
  const benchXs = [300, 650, 1000, 1300];
  for (const bx of benchXs) {
    furniture.push({ x: bx, y: 680, w: 26, h: 4, color: PALETTE.wood });
    furniture.push({ x: bx + 2, y: 696, w: 2, h: 8, color: '#555' });
    furniture.push({ x: bx + 96, y: 696, w: 2, h: 8, color: '#555' });
  }

  // --- Departures board ---
  furniture.push({ x: 1240, y: 200, w: 40, h: 24, color: '#1a1a1a' });
  for (let r = 0; r < 4; r++) {
    objects.push({ x: 1248, y: 208 + r * 20, w: 24, h: 2, color: '#ffa657' }); // text lines
  }

  // --- Character slots (18 total) ---
  const characterSlots = [
    // Back row (near wall)
    { x: 120, y: 520 }, { x: 340, y: 510 }, { x: 560, y: 520 },
    { x: 780, y: 510 }, { x: 1000, y: 520 }, { x: 1240, y: 510 },
    // Middle row
    { x: 200, y: 680 }, { x: 420, y: 690 }, { x: 640, y: 680 },
    { x: 860, y: 690 }, { x: 1100, y: 680 }, { x: 1360, y: 690 },
    // Front row (near tracks)
    { x: 100, y: 840 }, { x: 360, y: 850 }, { x: 600, y: 840 },
    { x: 860, y: 850 }, { x: 1120, y: 840 }, { x: 1400, y: 850 },
  ];

  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'Grand Central Station',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}

/** Hotel Lobby — marble floor, reception desk, couches, elevator doors, chandelier, plants */
function _buildHotelLobby(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background: ornate walls ---
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 130, color: '#2e2420' });
  bg.push({ x: 0, y: 520, w: WORLD_W / PIXEL_SIZE, h: 10, color: '#d4af37' }); // gold trim
  // Marble floor
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 12) {
    for (let row = 140; row < WORLD_H / PIXEL_SIZE; row += 12) {
      const t = (col / 12 + row / 12) % 2 === 0;
      bg.push({ x: col * PIXEL_SIZE, y: row * PIXEL_SIZE, w: 12, h: 12, color: t ? '#e8e0d8' : '#d8d0c8' });
    }
  }

  // --- Reception desk ---
  furniture.push({ x: 560, y: 460, w: 80, h: 12, color: '#5C3D2E' }); // countertop
  furniture.push({ x: 560, y: 508, w: 80, h: 20, color: '#4A3020' }); // front panel
  objects.push({ x: 580, y: 448, w: 4, h: 3, color: PALETTE.gold }); // bell
  objects.push({ x: 860, y: 448, w: 8, h: 5, color: '#333' }); // computer

  // --- Elevator doors ---
  for (let ei = 0; ei < 3; ei++) {
    const ex = 1200 + ei * 100;
    furniture.push({ x: ex, y: 260, w: 16, h: 50, color: PALETTE.metal });
    furniture.push({ x: ex + 7 * PIXEL_SIZE, y: 260, w: 1, h: 50, color: '#555' }); // seam
  }

  // --- Couches ---
  const couchXs = [120, 900];
  for (const cx of couchXs) {
    furniture.push({ x: cx, y: 680, w: 40, h: 10, color: '#703030' }); // seat
    furniture.push({ x: cx, y: 660, w: 40, h: 8, color: '#803030' }); // back
    furniture.push({ x: cx - 4, y: 668, w: 4, h: 14, color: '#703030' }); // left arm
    furniture.push({ x: cx + 156, y: 668, w: 4, h: 14, color: '#703030' }); // right arm
  }

  // --- Chandelier (top center) ---
  objects.push({ x: 760, y: 60, w: 1, h: 10, color: PALETTE.gold }); // chain
  objects.push({ x: 740, y: 100, w: 20, h: 6, color: PALETTE.gold }); // frame
  for (let li = 0; li < 5; li++) {
    objects.push({ x: 744 + li * 14, y: 90, w: 2, h: 3, color: '#ffe68a' }); // candle lights
  }

  // --- Plants ---
  const plantXs = [60, 540, 1160, 1500];
  for (const px of plantXs) {
    furniture.push({ x: px, y: 600, w: 6, h: 8, color: '#5a3d1a' }); // pot
    objects.push({ x: px - 4, y: 568, w: 10, h: 8, color: '#2d6b2e' }); // foliage
  }

  // --- Luggage ---
  objects.push({ x: 340, y: 740, w: 6, h: 8, color: PALETTE.red }); // suitcase
  objects.push({ x: 368, y: 744, w: 4, h: 6, color: PALETTE.blue }); // bag

  // --- Character slots (20 total) ---
  const characterSlots = [
    // Back row (near desk / elevators)
    { x: 140, y: 520 }, { x: 360, y: 510 }, { x: 580, y: 520 },
    { x: 760, y: 510 }, { x: 960, y: 520 }, { x: 1160, y: 510 },
    { x: 1400, y: 520 },
    // Middle row
    { x: 100, y: 680 }, { x: 320, y: 690 }, { x: 540, y: 680 },
    { x: 760, y: 690 }, { x: 980, y: 680 }, { x: 1200, y: 690 },
    { x: 1440, y: 680 },
    // Front row
    { x: 200, y: 860 }, { x: 440, y: 870 }, { x: 700, y: 860 },
    { x: 960, y: 870 }, { x: 1220, y: 860 }, { x: 1440, y: 870 },
  ];

  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'Hotel Lobby',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}

/** Market — stalls, awnings, crates, barrels, hanging goods, cobblestone */
function _buildMarket(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background: open sky ---
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 60, color: '#5a9ec8' });
  // Cobblestone ground
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 5) {
    for (let row = 60; row < WORLD_H / PIXEL_SIZE; row += 5) {
      const shade = rng() > 0.5 ? '#9e9080' : '#8a8070';
      bg.push({ x: col * PIXEL_SIZE, y: row * PIXEL_SIZE, w: 4, h: 4, color: shade });
    }
  }

  // --- Stalls with awnings ---
  const stallXs = [80, 440, 800, 1160];
  const awningColors = [PALETTE.red, '#f0883e', PALETTE.blue, PALETTE.green];
  for (let i = 0; i < stallXs.length; i++) {
    const sx = stallXs[i];
    // Awning (striped)
    furniture.push({ x: sx, y: 320, w: 60, h: 6, color: awningColors[i] });
    furniture.push({ x: sx, y: 344, w: 60, h: 6, color: '#e6edf3' });
    // Counter
    furniture.push({ x: sx, y: 480, w: 60, h: 10, color: PALETTE.wood });
    // Posts
    furniture.push({ x: sx, y: 368, w: 2, h: 28, color: PALETTE.wood });
    furniture.push({ x: sx + 232, y: 368, w: 2, h: 28, color: PALETTE.wood });
    // Goods on counter
    for (let g = 0; g < 4; g++) {
      objects.push({ x: sx + 16 + g * 44, y: 464, w: 4, h: 4, color: pick(rng, PALETTE.clothing) });
    }
  }

  // --- Crates & barrels ---
  const crateXs = [360, 720, 1100, 1440];
  for (const cx of crateXs) {
    furniture.push({ x: cx, y: 580, w: 10, h: 10, color: PALETTE.wood }); // crate
    objects.push({ x: cx + 2, y: 584, w: 6, h: 1, color: '#555' }); // slat
  }
  // Barrels
  furniture.push({ x: 200, y: 560, w: 8, h: 12, color: '#6B4226' });
  furniture.push({ x: 1380, y: 560, w: 8, h: 12, color: '#6B4226' });

  // --- Hanging goods (from awnings) ---
  for (const sx of stallXs) {
    for (let h = 0; h < 3; h++) {
      objects.push({ x: sx + 40 + h * 40, y: 368, w: 2, h: 6, color: pick(rng, PALETTE.clothing) });
    }
  }

  // --- Character slots (18 total) ---
  const characterSlots = [
    // Back (near stalls)
    { x: 180, y: 500 }, { x: 400, y: 490 }, { x: 620, y: 500 },
    { x: 880, y: 490 }, { x: 1100, y: 500 }, { x: 1360, y: 490 },
    // Middle
    { x: 120, y: 660 }, { x: 360, y: 670 }, { x: 600, y: 660 },
    { x: 840, y: 670 }, { x: 1080, y: 660 }, { x: 1340, y: 670 },
    // Front
    { x: 200, y: 840 }, { x: 460, y: 850 }, { x: 720, y: 840 },
    { x: 980, y: 850 }, { x: 1240, y: 840 }, { x: 1460, y: 850 },
  ];

  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'Open-Air Market',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}

/** Theater — stage, curtain, rows of seats, balcony, spotlight */
function _buildTheater(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background: dark interior ---
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 250, color: '#1a1018' });
  // Floor (carpeted aisle)
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 8) {
    for (let row = 160; row < WORLD_H / PIXEL_SIZE; row += 8) {
      bg.push({ x: col * PIXEL_SIZE, y: row * PIXEL_SIZE, w: 8, h: 8, color: '#3a1828' });
    }
  }

  // --- Stage ---
  furniture.push({ x: 300, y: 300, w: 200, h: 10, color: PALETTE.wood }); // stage floor
  furniture.push({ x: 300, y: 340, w: 200, h: 20, color: '#4A3020' }); // stage front

  // --- Curtain (red, draped on sides) ---
  furniture.push({ x: 300, y: 80, w: 20, h: 65, color: '#8B0000' }); // left drape
  furniture.push({ x: 1060, y: 80, w: 20, h: 65, color: '#8B0000' }); // right drape
  furniture.push({ x: 300, y: 80, w: 200, h: 6, color: '#cc0000' }); // valance

  // --- Rows of seats ---
  for (let row = 0; row < 4; row++) {
    const sy = 500 + row * 100;
    for (let seat = 0; seat < 12; seat++) {
      const sx = 160 + seat * 108;
      furniture.push({ x: sx, y: sy, w: 6, h: 5, color: '#8B0000' }); // seat back
      furniture.push({ x: sx, y: sy + 20, w: 6, h: 4, color: '#700000' }); // seat
    }
  }

  // --- Balcony (top) ---
  furniture.push({ x: 0, y: 200, w: 60, h: 10, color: '#5C3D2E' }); // left balcony
  furniture.push({ x: 0, y: 160, w: 60, h: 10, color: PALETTE.gold }); // railing
  furniture.push({ x: 1340, y: 200, w: 60, h: 10, color: '#5C3D2E' }); // right balcony
  furniture.push({ x: 1340, y: 160, w: 60, h: 10, color: PALETTE.gold }); // railing

  // --- Spotlight ---
  objects.push({ x: 700, y: 40, w: 6, h: 4, color: '#333' }); // housing
  objects.push({ x: 704, y: 56, w: 3, h: 3, color: '#ffe68a' }); // beam source

  // --- Character slots (20 total, spread among seats and aisles) ---
  const characterSlots = [
    // Near stage
    { x: 400, y: 460 }, { x: 600, y: 470 }, { x: 800, y: 460 },
    { x: 1000, y: 470 }, { x: 1200, y: 460 },
    // Row 2
    { x: 200, y: 580 }, { x: 420, y: 590 }, { x: 640, y: 580 },
    { x: 860, y: 590 }, { x: 1100, y: 580 }, { x: 1360, y: 590 },
    // Row 3
    { x: 160, y: 720 }, { x: 380, y: 730 }, { x: 620, y: 720 },
    { x: 860, y: 730 }, { x: 1100, y: 720 },
    // Back / aisles
    { x: 100, y: 880 }, { x: 500, y: 870 }, { x: 900, y: 880 },
    { x: 1400, y: 870 },
  ];

  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'Grand Theater',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}

/** Office — desks, computers, water cooler, filing cabinets, whiteboard, potted plants */
function _buildOffice(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background: office walls ---
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 130, color: '#d8d4cc' });
  // Carpet floor (grey-blue)
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 6) {
    for (let row = 130; row < WORLD_H / PIXEL_SIZE; row += 6) {
      bg.push({ x: col * PIXEL_SIZE, y: row * PIXEL_SIZE, w: 6, h: 6, color: '#6a7080' });
    }
  }

  // --- Desks (L-shaped cubicles) ---
  const deskXs = [100, 500, 900, 1300];
  for (const dx of deskXs) {
    furniture.push({ x: dx, y: 460, w: 40, h: 10, color: '#b0a080' }); // desk top
    furniture.push({ x: dx, y: 500, w: 3, h: 16, color: '#888' }); // leg
    furniture.push({ x: dx + 148, y: 500, w: 3, h: 16, color: '#888' }); // leg
    // Computer monitor
    objects.push({ x: dx + 40, y: 432, w: 8, h: 7, color: '#1a1a1a' });
    objects.push({ x: dx + 48, y: 452, w: 3, h: 2, color: '#555' }); // monitor stand
  }

  // --- Filing cabinets ---
  furniture.push({ x: 40, y: 320, w: 12, h: 30, color: PALETTE.metal });
  furniture.push({ x: 40, y: 328, w: 12, h: 2, color: '#555' }); // drawer line
  furniture.push({ x: 40, y: 360, w: 12, h: 2, color: '#555' }); // drawer line

  furniture.push({ x: 1480, y: 320, w: 12, h: 30, color: PALETTE.metal });

  // --- Water cooler ---
  furniture.push({ x: 1400, y: 440, w: 6, h: 14, color: '#ADD8E6' }); // jug
  furniture.push({ x: 1396, y: 496, w: 8, h: 10, color: '#e6edf3' }); // base

  // --- Whiteboard ---
  furniture.push({ x: 660, y: 180, w: 60, h: 36, color: '#f0f0f0' });
  furniture.push({ x: 660, y: 180, w: 60, h: 2, color: PALETTE.metal }); // top frame
  objects.push({ x: 680, y: 196, w: 20, h: 1, color: PALETTE.blue }); // writing
  objects.push({ x: 680, y: 212, w: 30, h: 1, color: PALETTE.red }); // writing

  // --- Potted plants ---
  const plantXs = [60, 480, 1460];
  for (const px of plantXs) {
    furniture.push({ x: px, y: 580, w: 6, h: 7, color: '#5a3d1a' }); // pot
    objects.push({ x: px - 2, y: 556, w: 8, h: 6, color: '#2d6b2e' }); // leaves
  }

  // --- Character slots (16 total) ---
  const characterSlots = [
    // Back row
    { x: 180, y: 520 }, { x: 400, y: 510 }, { x: 640, y: 520 },
    { x: 880, y: 510 }, { x: 1140, y: 520 }, { x: 1380, y: 510 },
    // Middle row
    { x: 120, y: 700 }, { x: 380, y: 710 }, { x: 640, y: 700 },
    { x: 920, y: 710 }, { x: 1200, y: 700 },
    // Front row
    { x: 200, y: 870 }, { x: 500, y: 880 }, { x: 800, y: 870 },
    { x: 1100, y: 880 }, { x: 1400, y: 870 },
  ];

  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'Corporate Office',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}

/** Gallery — modern art: abstract paintings, sculptures, white walls */
function _buildGallery(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background: white walls ---
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 140, color: '#f0f0f0' });
  // Polished concrete floor
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 10) {
    for (let row = 140; row < WORLD_H / PIXEL_SIZE; row += 10) {
      bg.push({ x: col * PIXEL_SIZE, y: row * PIXEL_SIZE, w: 10, h: 10, color: '#d0d0d0' });
    }
  }

  // --- Abstract paintings ---
  const paintingXs = [120, 400, 680, 960, 1240];
  for (let i = 0; i < paintingXs.length; i++) {
    const px = paintingXs[i];
    const pw = 14 + Math.floor(rng() * 10);
    const ph = 10 + Math.floor(rng() * 8);
    // Black frame (thin)
    furniture.push({ x: px - 2, y: 148, w: pw + 1, h: ph + 1, color: '#333' });
    // Abstract art (colorful blocks)
    const artColors = [PALETTE.red, PALETTE.blue, '#d2a8ff', '#ffa657', PALETTE.green, '#FFD700'];
    for (let b = 0; b < 3; b++) {
      const bx = px + Math.floor(rng() * (pw - 6) * PIXEL_SIZE / PIXEL_SIZE);
      const by = 152 + Math.floor(rng() * (ph - 4));
      objects.push({ x: bx, y: by, w: 4 + Math.floor(rng() * 4), h: 3 + Math.floor(rng() * 3), color: pick(rng, artColors) });
    }
  }

  // --- Sculptures on pedestals ---
  const sculptXs = [280, 760, 1400];
  for (const sx of sculptXs) {
    furniture.push({ x: sx, y: 540, w: 10, h: 20, color: '#e0e0e0' }); // pedestal
    const sc = pick(rng, ['#333', '#888', PALETTE.red, PALETTE.blue]);
    objects.push({ x: sx + 2, y: 510, w: 6, h: 8, color: sc }); // sculpture shape
  }

  // --- Track lighting ---
  for (let lx = 100; lx < WORLD_W; lx += 200) {
    objects.push({ x: lx, y: 60, w: 4, h: 3, color: '#333' }); // light housing
  }

  // --- Character slots (18 total) ---
  const characterSlots = [
    // Back row
    { x: 160, y: 520 }, { x: 380, y: 510 }, { x: 580, y: 520 },
    { x: 800, y: 510 }, { x: 1040, y: 520 }, { x: 1280, y: 510 },
    // Middle row
    { x: 120, y: 680 }, { x: 360, y: 690 }, { x: 600, y: 680 },
    { x: 840, y: 690 }, { x: 1100, y: 680 }, { x: 1380, y: 690 },
    // Front row
    { x: 200, y: 860 }, { x: 460, y: 870 }, { x: 720, y: 860 },
    { x: 980, y: 870 }, { x: 1240, y: 860 }, { x: 1440, y: 870 },
  ];

  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'Modern Art Gallery',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}

/** Cafe — small tables, counter, espresso machine, pastry case, chalkboard menu */
function _buildCafe(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background: warm walls ---
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 140, color: '#3d2b1a' });
  // Wood plank floor
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 14) {
    for (let row = 140; row < WORLD_H / PIXEL_SIZE; row += 3) {
      bg.push({ x: col * PIXEL_SIZE, y: row * PIXEL_SIZE, w: 13, h: 2, color: row % 2 === 0 ? '#a08060' : '#907050' });
    }
  }

  // --- Counter (along back) ---
  furniture.push({ x: 40, y: 460, w: 120, h: 12, color: PALETTE.wood }); // countertop
  furniture.push({ x: 40, y: 508, w: 120, h: 20, color: '#5C3D2E' }); // front

  // --- Espresso machine ---
  objects.push({ x: 80, y: 424, w: 10, h: 9, color: PALETTE.metal }); // body
  objects.push({ x: 84, y: 416, w: 3, h: 2, color: '#333' }); // top

  // --- Pastry case ---
  furniture.push({ x: 260, y: 460, w: 30, h: 12, color: PALETTE.glass }); // glass display
  furniture.push({ x: 260, y: 508, w: 30, h: 8, color: PALETTE.wood }); // base
  // Pastries inside
  for (let p = 0; p < 4; p++) {
    objects.push({ x: 268 + p * 24, y: 472, w: 3, h: 2, color: pick(rng, ['#ffa657', PALETTE.red, '#DAA520', '#e8a87c']) });
  }

  // --- Chalkboard menu ---
  furniture.push({ x: 600, y: 120, w: 40, h: 30, color: '#1a3020' });
  furniture.push({ x: 600, y: 120, w: 40, h: 2, color: PALETTE.wood }); // frame top
  objects.push({ x: 612, y: 140, w: 16, h: 1, color: '#e6edf3' }); // text
  objects.push({ x: 612, y: 156, w: 20, h: 1, color: '#e6edf3' }); // text
  objects.push({ x: 612, y: 172, w: 14, h: 1, color: '#ffa657' }); // text

  // --- Small tables ---
  const tableXs = [200, 480, 760, 1060, 1340];
  for (const tx of tableXs) {
    furniture.push({ x: tx, y: 660, w: 16, h: 4, color: PALETTE.wood }); // tabletop
    furniture.push({ x: tx + 24, y: 676, w: 2, h: 14, color: '#555' }); // leg
    // Cup on some tables
    if (rng() > 0.4) {
      objects.push({ x: tx + 16, y: 648, w: 3, h: 3, color: '#e6edf3' }); // cup
    }
  }

  // --- Hanging pendant lights ---
  for (let lx = 200; lx < WORLD_W; lx += 300) {
    objects.push({ x: lx, y: 60, w: 1, h: 8, color: '#333' }); // cord
    objects.push({ x: lx - 2, y: 92, w: 4, h: 3, color: '#ffe68a' }); // bulb
  }

  // --- Character slots (14 total) ---
  const characterSlots = [
    // Near counter
    { x: 140, y: 520 }, { x: 360, y: 510 }, { x: 560, y: 520 },
    { x: 800, y: 510 },
    // Middle (around tables)
    { x: 200, y: 680 }, { x: 440, y: 690 }, { x: 680, y: 680 },
    { x: 920, y: 690 }, { x: 1180, y: 680 }, { x: 1400, y: 690 },
    // Front
    { x: 160, y: 860 }, { x: 500, y: 870 }, { x: 900, y: 860 },
    { x: 1300, y: 870 },
  ];

  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'Corner Café',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}

/** Harbor — wooden dock, boats, rope coils, crates, lighthouse, seagull perches */
function _buildHarbor(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background: sky + sea ---
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 70, color: '#6aaedb' }); // sky
  bg.push({ x: 0, y: 280, w: WORLD_W / PIXEL_SIZE, h: 40, color: '#3a7ab8' }); // horizon water
  // Water
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 8) {
    for (let row = 110; row < 160; row += 8) {
      const shade = (col + row) % 16 === 0 ? '#2a6aa0' : '#3a7ab8';
      bg.push({ x: col * PIXEL_SIZE, y: row * PIXEL_SIZE, w: 8, h: 8, color: shade });
    }
  }

  // Wooden dock planks
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 12) {
    for (let row = 160; row < WORLD_H / PIXEL_SIZE; row += 3) {
      bg.push({ x: col * PIXEL_SIZE, y: row * PIXEL_SIZE, w: 11, h: 2, color: row % 2 === 0 ? '#8B7355' : '#7A6345' });
    }
  }

  // --- Lighthouse (background right) ---
  furniture.push({ x: 1440, y: 60, w: 8, h: 40, color: '#e6edf3' }); // tower
  furniture.push({ x: 1436, y: 60, w: 12, h: 4, color: PALETTE.red }); // stripe
  furniture.push({ x: 1436, y: 100, w: 12, h: 4, color: PALETTE.red }); // stripe
  objects.push({ x: 1444, y: 44, w: 4, h: 4, color: '#ffe68a' }); // light

  // --- Boats ---
  // Boat 1
  furniture.push({ x: 100, y: 400, w: 40, h: 8, color: '#5C3D2E' }); // hull
  furniture.push({ x: 116, y: 360, w: 2, h: 10, color: PALETTE.wood }); // mast
  objects.push({ x: 120, y: 360, w: 10, h: 8, color: '#e6edf3' }); // sail

  // Boat 2
  furniture.push({ x: 900, y: 420, w: 36, h: 6, color: '#4A3020' }); // hull
  furniture.push({ x: 916, y: 380, w: 2, h: 10, color: PALETTE.wood }); // mast

  // --- Rope coils ---
  const ropeXs = [300, 700, 1200];
  for (const rx of ropeXs) {
    objects.push({ x: rx, y: 640, w: 5, h: 5, color: '#c8a860' }); // coiled rope
  }

  // --- Crates ---
  const crateXs = [400, 800, 1100, 1380];
  for (const cx of crateXs) {
    furniture.push({ x: cx, y: 580, w: 10, h: 10, color: PALETTE.wood });
    objects.push({ x: cx + 2, y: 584, w: 6, h: 1, color: '#555' }); // slat
  }

  // --- Seagull perches (posts) ---
  const postXs = [200, 560, 1000, 1340];
  for (const px of postXs) {
    furniture.push({ x: px, y: 520, w: 2, h: 20, color: PALETTE.wood }); // post
    if (rng() > 0.4) {
      objects.push({ x: px - 2, y: 508, w: 4, h: 3, color: '#e6edf3' }); // seagull
    }
  }

  // --- Character slots (18 total) ---
  const characterSlots = [
    // Near water
    { x: 200, y: 520 }, { x: 440, y: 510 }, { x: 660, y: 520 },
    { x: 880, y: 510 }, { x: 1120, y: 520 }, { x: 1360, y: 510 },
    // Middle dock
    { x: 140, y: 680 }, { x: 380, y: 690 }, { x: 600, y: 680 },
    { x: 840, y: 690 }, { x: 1060, y: 680 }, { x: 1300, y: 690 },
    // Front
    { x: 200, y: 850 }, { x: 440, y: 860 }, { x: 680, y: 850 },
    { x: 960, y: 860 }, { x: 1200, y: 850 }, { x: 1440, y: 860 },
  ];

  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'Foggy Harbor',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}

/** Garden — hedges, paths, statues, roses, fountain, gazebo, butterflies */
function _buildGarden(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background: sky ---
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 60, color: '#7dc0e8' });
  // Lush grass
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 6) {
    for (let row = 60; row < WORLD_H / PIXEL_SIZE; row += 6) {
      const shade = (col + row) % 12 === 0 ? '#3a8837' : '#48a044';
      bg.push({ x: col * PIXEL_SIZE, y: row * PIXEL_SIZE, w: 6, h: 6, color: shade });
    }
  }

  // --- Gravel paths (cross shape) ---
  bg.push({ x: 720, y: 240, w: 40, h: 190, color: '#c8b89a' }); // vertical path
  bg.push({ x: 200, y: 600, w: 300, h: 16, color: '#c8b89a' }); // horizontal path

  // --- Hedges ---
  const hedgeRows = [
    { x: 80, y: 360, w: 100 }, { x: 1200, y: 360, w: 100 },
    { x: 80, y: 700, w: 60 }, { x: 1300, y: 700, w: 60 },
  ];
  for (const h of hedgeRows) {
    furniture.push({ x: h.x, y: h.y, w: h.w, h: 14, color: '#1e5c1e' });
    furniture.push({ x: h.x, y: h.y - 8, w: h.w, h: 8, color: '#2d7a2d' }); // top rounded
  }

  // --- Gazebo (center-right) ---
  furniture.push({ x: 1060, y: 440, w: 50, h: 6, color: '#e6edf3' }); // roof
  furniture.push({ x: 1060, y: 464, w: 2, h: 30, color: '#e6edf3' }); // left pillar
  furniture.push({ x: 1252, y: 464, w: 2, h: 30, color: '#e6edf3' }); // right pillar
  furniture.push({ x: 1060, y: 584, w: 50, h: 4, color: '#c0c0c0' }); // floor

  // --- Fountain (center) ---
  furniture.push({ x: 680, y: 440, w: 30, h: 8, color: '#999' }); // basin
  furniture.push({ x: 684, y: 408, w: 26, h: 10, color: '#79c0ff' }); // water
  furniture.push({ x: 694, y: 376, w: 2, h: 8, color: '#999' }); // spout
  objects.push({ x: 692, y: 360, w: 4, h: 4, color: '#ADD8E6' }); // spray

  // --- Statues ---
  furniture.push({ x: 340, y: 400, w: 6, h: 20, color: '#c0c0c0' }); // statue body
  furniture.push({ x: 336, y: 400, w: 10, h: 4, color: '#aaa' }); // base

  // --- Rose bushes ---
  const roseBushXs = [160, 460, 880, 1160, 1420];
  for (const rx of roseBushXs) {
    furniture.push({ x: rx, y: 520, w: 10, h: 8, color: '#2d6b2e' }); // bush
    for (let r = 0; r < 3; r++) {
      objects.push({ x: rx + 4 + r * 12, y: 512, w: 2, h: 2, color: pick(rng, [PALETTE.red, '#ff69b4', '#FFD700']) });
    }
  }

  // --- Butterflies (foreground) ---
  for (let i = 0; i < 4; i++) {
    const bx = 200 + Math.floor(rng() * 1200);
    const by = 300 + Math.floor(rng() * 400);
    foreground.push({ x: bx, y: by, w: 2, h: 2, color: pick(rng, ['#d2a8ff', '#ffa657', '#79c0ff', '#ff69b4']) });
  }

  // --- Character slots (20 total) ---
  const characterSlots = [
    // Back
    { x: 160, y: 480 }, { x: 380, y: 470 }, { x: 580, y: 480 },
    { x: 800, y: 470 }, { x: 1020, y: 480 }, { x: 1260, y: 470 },
    { x: 1440, y: 480 },
    // Middle
    { x: 120, y: 660 }, { x: 340, y: 670 }, { x: 560, y: 660 },
    { x: 780, y: 670 }, { x: 1000, y: 660 }, { x: 1240, y: 670 },
    { x: 1440, y: 660 },
    // Front
    { x: 200, y: 850 }, { x: 460, y: 860 }, { x: 720, y: 850 },
    { x: 980, y: 860 }, { x: 1240, y: 850 }, { x: 1460, y: 860 },
  ];

  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'Rose Garden',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}

/** Ballroom — dance floor pattern, columns, balcony, grand piano, chandeliers */
function _buildBallroom(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background: ornate walls & ceiling ---
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 120, color: '#2a1e28' });
  bg.push({ x: 0, y: 480, w: WORLD_W / PIXEL_SIZE, h: 6, color: PALETTE.gold }); // crown molding

  // Dance floor — checkered parquet
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 8) {
    for (let row = 126; row < WORLD_H / PIXEL_SIZE; row += 8) {
      const t = (col / 8 + row / 8) % 2 === 0;
      bg.push({ x: col * PIXEL_SIZE, y: row * PIXEL_SIZE, w: 8, h: 8, color: t ? '#c8a870' : '#a08850' });
    }
  }

  // --- Columns ---
  const colXs = [120, 520, 920, 1320];
  for (const cx of colXs) {
    furniture.push({ x: cx, y: 160, w: 6, h: 70, color: '#c8b898' });
    furniture.push({ x: cx - 4, y: 160, w: 10, h: 5, color: PALETTE.gold }); // capital
    furniture.push({ x: cx - 4, y: 440, w: 10, h: 5, color: PALETTE.gold }); // base
  }

  // --- Balcony (top, spanning width) ---
  furniture.push({ x: 0, y: 200, w: 60, h: 12, color: '#5C3D2E' }); // left balcony
  furniture.push({ x: 0, y: 180, w: 60, h: 4, color: PALETTE.gold }); // railing
  furniture.push({ x: 1340, y: 200, w: 60, h: 12, color: '#5C3D2E' }); // right balcony
  furniture.push({ x: 1340, y: 180, w: 60, h: 4, color: PALETTE.gold }); // railing

  // --- Grand piano ---
  furniture.push({ x: 1200, y: 560, w: 30, h: 18, color: '#1a1a1a' }); // body
  furniture.push({ x: 1200, y: 632, w: 2, h: 12, color: '#1a1a1a' }); // leg
  furniture.push({ x: 1316, y: 632, w: 2, h: 12, color: '#1a1a1a' }); // leg
  objects.push({ x: 1208, y: 560, w: 20, h: 2, color: '#e6edf3' }); // keys

  // --- Chandeliers (two) ---
  const chandelierXs = [500, 1000];
  for (const clx of chandelierXs) {
    objects.push({ x: clx + 16, y: 40, w: 1, h: 12, color: PALETTE.gold }); // chain
    objects.push({ x: clx, y: 88, w: 20, h: 6, color: PALETTE.gold }); // frame
    for (let li = 0; li < 5; li++) {
      objects.push({ x: clx + 4 + li * 14, y: 76, w: 2, h: 3, color: '#ffe68a' }); // candles
    }
  }

  // --- Refreshment table ---
  furniture.push({ x: 60, y: 600, w: 40, h: 8, color: '#e6edf3' }); // cloth
  objects.push({ x: 80, y: 588, w: 4, h: 3, color: PALETTE.gold }); // candelabra
  objects.push({ x: 120, y: 590, w: 3, h: 3, color: PALETTE.red }); // wine glass

  // --- Character slots (22 total — most crowded) ---
  const characterSlots = [
    // Back row
    { x: 160, y: 510 }, { x: 360, y: 500 }, { x: 560, y: 510 },
    { x: 760, y: 500 }, { x: 960, y: 510 }, { x: 1160, y: 500 },
    { x: 1400, y: 510 },
    // Middle row
    { x: 100, y: 660 }, { x: 280, y: 670 }, { x: 460, y: 660 },
    { x: 640, y: 670 }, { x: 820, y: 660 }, { x: 1000, y: 670 },
    { x: 1180, y: 660 }, { x: 1400, y: 670 },
    // Front row
    { x: 140, y: 850 }, { x: 340, y: 860 }, { x: 540, y: 850 },
    { x: 740, y: 860 }, { x: 960, y: 850 }, { x: 1200, y: 860 },
    { x: 1440, y: 850 },
  ];

  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'Grand Ballroom',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}

/** Lab — workbenches, beakers, microscopes, chemical shelves, whiteboards with formulas */
function _buildLab(rng) {
  const bg = [];
  const furniture = [];
  const objects = [];
  const foreground = [];

  // --- Background: sterile walls ---
  bg.push({ x: 0, y: 0, w: WORLD_W / PIXEL_SIZE, h: 140, color: '#e0e4e8' });
  // Linoleum floor
  for (let col = 0; col < WORLD_W / PIXEL_SIZE; col += 10) {
    for (let row = 140; row < WORLD_H / PIXEL_SIZE; row += 10) {
      bg.push({ x: col * PIXEL_SIZE, y: row * PIXEL_SIZE, w: 10, h: 10, color: '#c8ccd0' });
    }
  }

  // --- Workbenches (black-topped) ---
  const benchXs = [80, 560, 1040];
  for (const bx of benchXs) {
    furniture.push({ x: bx, y: 480, w: 80, h: 8, color: '#2a2a2a' }); // top
    furniture.push({ x: bx, y: 512, w: 80, h: 16, color: '#888' }); // cabinet base
    // Beakers
    objects.push({ x: bx + 20, y: 460, w: 3, h: 5, color: PALETTE.glass }); // beaker 1
    objects.push({ x: bx + 60, y: 456, w: 4, h: 6, color: PALETTE.glass }); // beaker 2
    objects.push({ x: bx + 64, y: 460, w: 2, h: 3, color: PALETTE.green }); // liquid
    objects.push({ x: bx + 100, y: 458, w: 3, h: 5, color: PALETTE.glass }); // flask
    objects.push({ x: bx + 104, y: 462, w: 1, h: 3, color: PALETTE.blue }); // liquid
  }

  // --- Microscopes ---
  const microXs = [200, 760, 1340];
  for (const mx of microXs) {
    objects.push({ x: mx, y: 452, w: 4, h: 7, color: '#333' }); // body
    objects.push({ x: mx - 2, y: 448, w: 3, h: 2, color: '#555' }); // eyepiece
    objects.push({ x: mx, y: 476, w: 6, h: 2, color: '#444' }); // base
  }

  // --- Chemical shelves (on back wall) ---
  const shelfXs = [100, 500, 900, 1300];
  for (const sx of shelfXs) {
    furniture.push({ x: sx, y: 200, w: 50, h: 3, color: PALETTE.metal }); // shelf
    furniture.push({ x: sx, y: 300, w: 50, h: 3, color: PALETTE.metal }); // shelf
    // Bottles
    for (let b = 0; b < 5; b++) {
      const bc = pick(rng, [PALETTE.red, PALETTE.blue, PALETTE.green, '#d2a8ff', '#ffa657']);
      objects.push({ x: sx + 8 + b * 32, y: 184, w: 2, h: 4, color: bc });
      objects.push({ x: sx + 8 + b * 32, y: 284, w: 2, h: 4, color: pick(rng, [PALETTE.red, PALETTE.green, '#79c0ff']) });
    }
  }

  // --- Whiteboards with formulas ---
  furniture.push({ x: 320, y: 120, w: 50, h: 30, color: '#f5f5f5' });
  furniture.push({ x: 320, y: 120, w: 50, h: 2, color: PALETTE.metal }); // frame
  objects.push({ x: 332, y: 136, w: 26, h: 1, color: PALETTE.blue }); // formula
  objects.push({ x: 332, y: 152, w: 18, h: 1, color: PALETTE.red }); // formula
  objects.push({ x: 332, y: 168, w: 22, h: 1, color: '#333' }); // formula

  furniture.push({ x: 1100, y: 120, w: 50, h: 30, color: '#f5f5f5' });
  furniture.push({ x: 1100, y: 120, w: 50, h: 2, color: PALETTE.metal });
  objects.push({ x: 1112, y: 140, w: 24, h: 1, color: PALETTE.green }); // formula
  objects.push({ x: 1112, y: 156, w: 20, h: 1, color: '#333' }); // formula

  // --- Safety shower / eye wash station ---
  furniture.push({ x: 1480, y: 340, w: 4, h: 20, color: '#ffcc00' });
  objects.push({ x: 1476, y: 340, w: 6, h: 3, color: PALETTE.metal }); // shower head

  // --- Character slots (16 total) ---
  const characterSlots = [
    // Back row (near shelves)
    { x: 160, y: 520 }, { x: 400, y: 510 }, { x: 640, y: 520 },
    { x: 880, y: 510 }, { x: 1140, y: 520 }, { x: 1400, y: 510 },
    // Middle row
    { x: 120, y: 700 }, { x: 380, y: 710 }, { x: 640, y: 700 },
    { x: 920, y: 710 }, { x: 1200, y: 700 },
    // Front row
    { x: 200, y: 870 }, { x: 500, y: 880 }, { x: 800, y: 870 },
    { x: 1100, y: 880 }, { x: 1400, y: 870 },
  ];

  for (const s of characterSlots) {
    s.x += Math.floor((rng() - 0.5) * 40);
    s.y += Math.floor((rng() - 0.5) * 20);
  }

  return {
    name: 'Research Laboratory',
    layers: { background: bg, furniture, objects, foreground },
    characterSlots,
  };
}
