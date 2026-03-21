/* renderer.js — Tile renderer, sprite drawing, room rendering */
/* globals: window.Renderer */

(function () {
  'use strict';

  var TILE_SIZE = 16;      // world units per tile
  var SCALE    = 3;        // render scale
  var RENDER_TILE = TILE_SIZE * SCALE;  // 48 px on screen
  var ROOM_W   = 12;       // interior tiles wide
  var ROOM_H   = 10;       // interior tiles tall
  var FULL_ROOM_W = ROOM_W + 2;  // 14 (including walls)
  var FULL_ROOM_H = ROOM_H + 2;  // 12

  var PALETTE = {
    // Dungeon
    floor1:     '#2a1f3d',
    floor2:     '#332847',
    wall:       '#1a1225',
    wallTop:    '#3d2f54',
    door:       '#8B6914',
    doorLocked: '#555555',
    stairs:     '#ffd700',

    // Player
    playerBody:  '#4488ff',
    playerSkin:  '#FDBCB4',
    playerSword: '#c0c0c0',

    // Enemies
    slime:    '#44ff44',
    bat:      '#9944ff',
    skeleton: '#e6e6e6',
    boss:     '#ff4444',

    // Items
    potion:       '#ff4444',
    gold:         '#ffd700',
    key:          '#c0c0c0',
    swordUpgrade: '#4488ff',
    shield:       '#888888',

    // UI
    bg:              '#0d1117',
    text:            '#e6edf3',
    hud:             '#161b22',
    heartFull:       '#ff4444',
    heartEmpty:      '#333333',
    minimapRoom:     '#3d2f54',
    minimapCurrent:  '#ffd700',
    minimapUnvisited:'#1a1225'
  };

  // ── helpers ──

  /** Draw a single scaled pixel */
  function px(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, s, s);
  }

  /** Convert world position to tile coordinate */
  function worldToTile(worldVal) {
    return Math.floor(worldVal / TILE_SIZE);
  }

  /** Convert tile coordinate to screen position */
  function tileToScreen(tileVal) {
    return tileVal * RENDER_TILE;
  }

  // ── room data helpers ──

  /**
   * Create a basic room layout.
   * 0 = floor, 1 = wall
   * Room is FULL_ROOM_W x FULL_ROOM_H (14x12)
   */
  function createBasicRoom() {
    var tiles = [];
    for (var row = 0; row < FULL_ROOM_H; row++) {
      var line = [];
      for (var col = 0; col < FULL_ROOM_W; col++) {
        if (row === 0 || row === FULL_ROOM_H - 1 ||
            col === 0 || col === FULL_ROOM_W - 1) {
          line.push(1); // wall
        } else {
          line.push(0); // floor
        }
      }
      tiles.push(line);
    }
    return tiles;
  }

  // ── draw functions ──

  /**
   * Draw a complete room.
   * room.tiles is a 2D array [row][col] of tile IDs (0=floor, 1=wall).
   */
  function drawRoom(ctx, room) {
    var tiles = room.tiles;
    for (var row = 0; row < FULL_ROOM_H; row++) {
      for (var col = 0; col < FULL_ROOM_W; col++) {
        var sx = col * RENDER_TILE;
        var sy = row * RENDER_TILE;
        var tile = tiles[row][col];

        if (tile === 1) {
          // Wall: bottom portion darker, top portion lighter (two-tone)
          ctx.fillStyle = PALETTE.wall;
          ctx.fillRect(sx, sy, RENDER_TILE, RENDER_TILE);
          // Wall top face (upper half)
          ctx.fillStyle = PALETTE.wallTop;
          ctx.fillRect(sx, sy, RENDER_TILE, RENDER_TILE * 0.6);
          // Subtle edge line
          ctx.fillStyle = PALETTE.wall;
          ctx.fillRect(sx, sy + RENDER_TILE * 0.6, RENDER_TILE, 2);
        } else {
          // Floor: checkerboard pattern
          var isLight = (row + col) % 2 === 0;
          ctx.fillStyle = isLight ? PALETTE.floor1 : PALETTE.floor2;
          ctx.fillRect(sx, sy, RENDER_TILE, RENDER_TILE);
        }
      }
    }
  }

  // ── export ──

  window.Renderer = {
    PALETTE:      PALETTE,
    TILE_SIZE:    TILE_SIZE,
    SCALE:        SCALE,
    RENDER_TILE:  RENDER_TILE,
    ROOM_W:       ROOM_W,
    ROOM_H:       ROOM_H,
    FULL_ROOM_W:  FULL_ROOM_W,
    FULL_ROOM_H:  FULL_ROOM_H,
    px:           px,
    drawRoom:     drawRoom,
    worldToTile:  worldToTile,
    tileToScreen: tileToScreen,
    createBasicRoom: createBasicRoom
  };
})();
