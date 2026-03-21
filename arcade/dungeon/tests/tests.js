/* tests.js — Pepper's Dungeon test suite */

(function () {
  'use strict';

  var testsPassed = 0;
  var testsFailed = 0;
  var results = document.getElementById('results');

  function log(msg, pass) {
    var cls = pass ? 'pass' : 'fail';
    var prefix = pass ? '✅ PASS' : '❌ FAIL';
    results.innerHTML += '<span class="' + cls + '">' + prefix + ': ' + msg + '</span>\n';
    console.log(prefix + ':', msg);
  }

  function assert(cond, msg) {
    if (!cond) { log(msg, false); testsFailed++; }
    else { log(msg, true); testsPassed++; }
  }

  function assertEqual(a, b, msg) {
    assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')');
  }

  function assertApprox(a, b, eps, msg) {
    assert(Math.abs(a - b) < eps, msg + ' (expected ~' + b + ', got ' + a + ')');
  }

  // ────────────────────────────────────
  // Renderer tests
  // ────────────────────────────────────

  assertEqual(Renderer.TILE_SIZE, 16, 'Renderer.TILE_SIZE is 16');
  assertEqual(Renderer.SCALE, 3, 'Renderer.SCALE is 3');
  assertEqual(Renderer.RENDER_TILE, 48, 'Renderer.RENDER_TILE is 48 (16*3)');
  assertEqual(Renderer.ROOM_W, 12, 'Renderer.ROOM_W is 12');
  assertEqual(Renderer.ROOM_H, 10, 'Renderer.ROOM_H is 10');
  assertEqual(Renderer.FULL_ROOM_W, 14, 'FULL_ROOM_W is 14 (12+2)');
  assertEqual(Renderer.FULL_ROOM_H, 12, 'FULL_ROOM_H is 12 (10+2)');

  // Canvas size
  assertEqual(Renderer.FULL_ROOM_W * Renderer.RENDER_TILE, 672, 'Canvas width = 672');
  assertEqual(Renderer.FULL_ROOM_H * Renderer.RENDER_TILE, 576, 'Canvas height = 576');

  // worldToTile
  assertEqual(Renderer.worldToTile(0), 0, 'worldToTile(0) = 0');
  assertEqual(Renderer.worldToTile(15), 0, 'worldToTile(15) = 0');
  assertEqual(Renderer.worldToTile(16), 1, 'worldToTile(16) = 1');
  assertEqual(Renderer.worldToTile(48), 3, 'worldToTile(48) = 3');

  // tileToScreen
  assertEqual(Renderer.tileToScreen(0), 0, 'tileToScreen(0) = 0');
  assertEqual(Renderer.tileToScreen(1), 48, 'tileToScreen(1) = 48');
  assertEqual(Renderer.tileToScreen(5), 240, 'tileToScreen(5) = 240');

  // Palette exists
  assert(Renderer.PALETTE.floor1 !== undefined, 'PALETTE has floor1');
  assert(Renderer.PALETTE.wall !== undefined, 'PALETTE has wall');
  assert(Renderer.PALETTE.wallTop !== undefined, 'PALETTE has wallTop');
  assert(Renderer.PALETTE.playerBody !== undefined, 'PALETTE has playerBody');

  // ────────────────────────────────────
  // Room creation tests
  // ────────────────────────────────────

  var testRoom = Renderer.createBasicRoom();

  assertEqual(testRoom.length, 12, 'Room has 12 rows');
  assertEqual(testRoom[0].length, 14, 'Room has 14 columns');

  // Corners are walls
  assertEqual(testRoom[0][0], 1, 'Top-left corner is wall');
  assertEqual(testRoom[0][13], 1, 'Top-right corner is wall');
  assertEqual(testRoom[11][0], 1, 'Bottom-left corner is wall');
  assertEqual(testRoom[11][13], 1, 'Bottom-right corner is wall');

  // Interior is floor
  assertEqual(testRoom[1][1], 0, 'Interior (1,1) is floor');
  assertEqual(testRoom[5][7], 0, 'Interior (5,7) is floor');
  assertEqual(testRoom[10][12], 0, 'Interior (10,12) is floor');

  // Edges are walls
  assertEqual(testRoom[0][5], 1, 'Top edge is wall');
  assertEqual(testRoom[11][5], 1, 'Bottom edge is wall');
  assertEqual(testRoom[5][0], 1, 'Left edge is wall');
  assertEqual(testRoom[5][13], 1, 'Right edge is wall');

  // ────────────────────────────────────
  // Player tests
  // ────────────────────────────────────

  var testPlayer = Player.create(80, 80);

  assertEqual(testPlayer.x, 80, 'Player starts at x=80');
  assertEqual(testPlayer.y, 80, 'Player starts at y=80');
  assertEqual(testPlayer.facing, 'down', 'Player initially faces down');
  assertEqual(testPlayer.speed, 48, 'Player speed is 48');
  assertEqual(testPlayer.hp, 10, 'Player starts with 10 HP');
  assertEqual(testPlayer.maxHp, 10, 'Player maxHp is 10');

  // Player movement — move right for 1 second
  var moveRoom = { tiles: Renderer.createBasicRoom() };
  var movePlayer = Player.create(80, 80);  // safe interior position
  var fakeKeys = { 'd': true };
  movePlayer.update(1.0, moveRoom, fakeKeys);
  assertApprox(movePlayer.x, 128, 1, 'Player moves right ~48 units in 1s');
  assertEqual(movePlayer.facing, 'right', 'Player faces right after moving right');

  // Diagonal normalization
  var diagPlayer = Player.create(80, 80);
  var diagKeys = { 'd': true, 's': true };
  diagPlayer.update(1.0, moveRoom, diagKeys);
  // Should move ~48*0.707 = ~33.9 in each axis
  assertApprox(diagPlayer.x, 80 + 48 * 0.707, 1, 'Diagonal X movement is normalized');
  assertApprox(diagPlayer.y, 80 + 48 * 0.707, 1, 'Diagonal Y movement is normalized');

  // Wall collision — player should not enter wall tiles
  var wallPlayer = Player.create(17, 17);  // just inside top-left corner (tile 1,1)
  var wallKeys = { 'a': true, 'w': true };  // move into top-left wall
  wallPlayer.update(1.0, moveRoom, wallKeys);
  // Player should not go below x=16 or y=16 (wall is tile 0)
  assert(wallPlayer.x >= 16, 'Player does not enter left wall (x=' + wallPlayer.x + ')');
  assert(wallPlayer.y >= 16, 'Player does not enter top wall (y=' + wallPlayer.y + ')');

  // Axis-independent slide: moving into corner should still slide along the open axis
  var slidePlayer = Player.create(17, 80);  // close to left wall, mid-Y
  var slideKeys = { 'a': true, 's': true };  // try to go left (blocked) and down (open)
  slidePlayer.update(0.5, moveRoom, slideKeys);
  // X should stay (can't go left into wall), Y should advance
  assert(slidePlayer.y > 80, 'Player slides along Y when X is blocked (y=' + slidePlayer.y + ')');

  // ────────────────────────────────────
  // Collision function tests
  // ────────────────────────────────────

  var collTiles = Renderer.createBasicRoom();
  // Inside floor — no collision
  assert(!Player.collides(32, 32, 12, collTiles), 'No collision in open floor');
  // On wall tile (0,0) — collision
  assert(Player.collides(0, 0, 12, collTiles), 'Collision on wall tile (0,0)');
  // Partially overlapping wall — collision
  assert(Player.collides(10, 10, 12, collTiles), 'Collision when overlapping wall edge');
  // Out of bounds — collision
  assert(Player.collides(-5, 50, 12, collTiles), 'Collision when out of bounds (negative)');

  // ────────────────────────────────────
  // Engine / state tests
  // ────────────────────────────────────

  assertEqual(Game.STATES.TITLE, 0, 'STATES.TITLE is 0');
  assertEqual(Game.STATES.PLAYING, 1, 'STATES.PLAYING is 1');
  assertEqual(Game.STATES.DEAD, 2, 'STATES.DEAD is 2');

  // Game should have started on title
  assertEqual(Game.getState(), Game.STATES.TITLE, 'Game starts on TITLE screen');

  // Start game and verify state
  Game.startGame();
  assertEqual(Game.getState(), Game.STATES.PLAYING, 'After startGame(), state is PLAYING');
  assert(Game.getPlayer() !== null, 'Player exists after startGame()');
  assert(Game.getRoom() !== null, 'Room exists after startGame()');
  assertEqual(Game.getScore(), 0, 'Score starts at 0');
  assertEqual(Game.getFloor(), 1, 'Floor starts at 1');

  // Player from engine should have valid position
  var gp = Game.getPlayer();
  assert(gp.x > 0 && gp.x < 14 * 16, 'Game player has valid X');
  assert(gp.y > 0 && gp.y < 12 * 16, 'Game player has valid Y');

  // ────────────────────────────────────
  // Summary
  // ────────────────────────────────────

  results.innerHTML += '\n──────────────────────────────────\n';
  results.innerHTML += '  Total: ' + (testsPassed + testsFailed) + '\n';
  results.innerHTML += '  <span class="pass">Passed: ' + testsPassed + '</span>\n';
  if (testsFailed > 0) {
    results.innerHTML += '  <span class="fail">Failed: ' + testsFailed + '</span>\n';
  } else {
    results.innerHTML += '  <span class="pass">All tests passed! 🌶️</span>\n';
  }
})();
