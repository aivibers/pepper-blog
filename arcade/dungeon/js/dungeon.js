/* dungeon.js — Procedural dungeon generation */
/* globals: window.Dungeon, window.Renderer */

(function () {
  'use strict';

  var R = window.Renderer;

  /* Door-opening positions (tile coords in the 14×12 room grid) */
  var DOOR_POS = {
    n: [{ r: 0, c: 6 }, { r: 0, c: 7 }],
    s: [{ r: 11, c: 6 }, { r: 11, c: 7 }],
    w: [{ r: 5, c: 0 }, { r: 6, c: 0 }],
    e: [{ r: 5, c: 13 }, { r: 6, c: 13 }]
  };

  /* Directional offsets in the 3×3 grid */
  var DIR_OFFSET = {
    n: { dr: -1, dc: 0 },
    s: { dr:  1, dc: 0 },
    w: { dr:  0, dc: -1 },
    e: { dr:  0, dc:  1 }
  };

  var OPPOSITE = { n: 's', s: 'n', e: 'w', w: 'e' };

  // ── helpers ──

  function inBounds(r, c) {
    return r >= 0 && r < 3 && c >= 0 && c < 3;
  }

  function emptyNeighbors(grid, row, col) {
    var out = [];
    for (var dir in DIR_OFFSET) {
      var nr = row + DIR_OFFSET[dir].dr;
      var nc = col + DIR_OFFSET[dir].dc;
      if (inBounds(nr, nc) && !grid[nr][nc]) {
        out.push({ row: nr, col: nc });
      }
    }
    return out;
  }

  // ── tile generation ──

  function generateTiles(doors) {
    var tiles = [];
    for (var r = 0; r < R.FULL_ROOM_H; r++) {
      var row = [];
      for (var c = 0; c < R.FULL_ROOM_W; c++) {
        if (r === 0 || r === R.FULL_ROOM_H - 1 ||
            c === 0 || c === R.FULL_ROOM_W - 1) {
          row.push(1); // wall
        } else {
          row.push(0); // floor
        }
      }
      tiles.push(row);
    }

    // Carve door openings (replace wall with floor)
    for (var dir in doors) {
      if (doors[dir]) {
        var positions = DOOR_POS[dir];
        for (var i = 0; i < positions.length; i++) {
          tiles[positions[i].r][positions[i].c] = 0;
        }
      }
    }

    return tiles;
  }

  // ── main generator ──

  function generate(floor) {
    var numRooms = Math.min(5 + floor, 9);

    // Phase 1 — place rooms on a 3×3 grid via random expansion from center
    var grid = [[false, false, false],
                [false, false, false],
                [false, false, false]];
    grid[1][1] = true;
    var placed = [{ row: 1, col: 1 }];

    while (placed.length < numRooms) {
      // collect candidates: placed rooms with at least one empty neighbor
      var candidates = [];
      for (var i = 0; i < placed.length; i++) {
        var nb = emptyNeighbors(grid, placed[i].row, placed[i].col);
        if (nb.length > 0) candidates.push({ src: placed[i], nb: nb });
      }
      if (candidates.length === 0) break; // grid full

      var pick = candidates[Math.floor(Math.random() * candidates.length)];
      var dest = pick.nb[Math.floor(Math.random() * pick.nb.length)];
      grid[dest.row][dest.col] = true;
      placed.push(dest);
    }

    // Phase 2 — build room objects with door info & tiles
    var rooms = [[null, null, null],
                 [null, null, null],
                 [null, null, null]];

    for (var i = 0; i < placed.length; i++) {
      var p = placed[i];
      var doors = { n: false, s: false, e: false, w: false };

      for (var dir in DIR_OFFSET) {
        var nr = p.row + DIR_OFFSET[dir].dr;
        var nc = p.col + DIR_OFFSET[dir].dc;
        if (inBounds(nr, nc) && grid[nr][nc]) {
          doors[dir] = true;
        }
      }

      rooms[p.row][p.col] = {
        type:    'normal',
        doors:   doors,
        tiles:   generateTiles(doors),
        enemies: [],
        items:   [],
        cleared: false,
        visited: (p.row === 1 && p.col === 1)
      };
    }

    // Phase 3 — assign special rooms (skip center)
    var sortable = [];
    for (var i = 0; i < placed.length; i++) {
      if (placed[i].row === 1 && placed[i].col === 1) continue;
      var dist = Math.abs(placed[i].row - 1) + Math.abs(placed[i].col - 1);
      sortable.push({ pos: placed[i], dist: dist });
    }
    sortable.sort(function (a, b) { return b.dist - a.dist; });

    var stairsPos = sortable.length > 0 ? sortable[0].pos : { row: 1, col: 1 };
    var keyPos    = sortable.length > 1 ? sortable[1].pos : { row: 1, col: 1 };

    rooms[stairsPos.row][stairsPos.col].type = 'stairs';
    if (keyPos.row !== stairsPos.row || keyPos.col !== stairsPos.col) {
      rooms[keyPos.row][keyPos.col].type = 'key';
    }

    return {
      rooms:       rooms,
      currentRoom: { row: 1, col: 1 },
      keyRoom:     { row: keyPos.row, col: keyPos.col },
      stairsRoom:  { row: stairsPos.row, col: stairsPos.col }
    };
  }

  // ── export ──

  window.Dungeon = {
    generate:   generate,
    DOOR_POS:   DOOR_POS,
    DIR_OFFSET: DIR_OFFSET,
    OPPOSITE:   OPPOSITE
  };
})();
