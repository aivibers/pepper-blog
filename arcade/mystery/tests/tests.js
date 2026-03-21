/* tests.js — unit tests for engine, renderer, state machine */

let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    testResults.push({ pass: true, message });
  } else {
    testsFailed++;
    testResults.push({ pass: false, message });
    console.error('FAIL:', message);
  }
}

function assertEqual(actual, expected, message) {
  const pass = actual === expected;
  if (!pass) {
    message = `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
  }
  assert(pass, message);
}

function assertApprox(actual, expected, epsilon, message) {
  const pass = Math.abs(actual - expected) < epsilon;
  if (!pass) {
    message = `${message}: expected ~${expected}, got ${actual} (ε=${epsilon})`;
  }
  assert(pass, message);
}

/* ========== Test: worldToScreen / screenToWorld roundtrip ========== */

function testCoordinateTransforms() {
  // Create a fake canvas object
  const canvas = { width: 800, height: 500 };

  // Test center point
  const center = worldToScreen(WORLD_W / 2, WORLD_H / 2, canvas);
  assertEqual(center.x, 400, 'worldToScreen center x');
  assertEqual(center.y, 250, 'worldToScreen center y');

  // Test origin
  const origin = worldToScreen(0, 0, canvas);
  assertEqual(origin.x, 0, 'worldToScreen origin x');
  assertEqual(origin.y, 0, 'worldToScreen origin y');

  // Test bottom-right
  const br = worldToScreen(WORLD_W, WORLD_H, canvas);
  assertEqual(br.x, 800, 'worldToScreen bottom-right x');
  assertEqual(br.y, 500, 'worldToScreen bottom-right y');

  // Roundtrip: world → screen → world
  const testPoints = [
    [0, 0], [800, 500], [400, 300], [1600, 1000], [100, 950],
  ];
  for (const [wx, wy] of testPoints) {
    const scr = worldToScreen(wx, wy, canvas);
    const back = screenToWorld(scr.x, scr.y, canvas);
    assertApprox(back.x, wx, 0.01, `roundtrip x for (${wx},${wy})`);
    assertApprox(back.y, wy, 0.01, `roundtrip y for (${wx},${wy})`);
  }

  // Test with non-16:10 canvas (letterboxing)
  const wideCanvas = { width: 1000, height: 400 };
  // 1000/400 = 2.5, 16/10 = 1.6 → height-limited, scale = 400/1000 = 0.4
  const scale = Math.min(1000 / WORLD_W, 400 / WORLD_H);
  assertEqual(scale, 0.4, 'wide canvas scale');
  const wideCenter = worldToScreen(WORLD_W / 2, WORLD_H / 2, wideCanvas);
  assertEqual(wideCenter.y, 200, 'wide canvas center y');
  // x should be offset: (1000 - 1600*0.4)/2 + 800*0.4 = (1000-640)/2 + 320 = 180+320 = 500
  assertEqual(wideCenter.x, 500, 'wide canvas center x');

  // Roundtrip on wide canvas
  const scr2 = worldToScreen(200, 600, wideCanvas);
  const back2 = screenToWorld(scr2.x, scr2.y, wideCanvas);
  assertApprox(back2.x, 200, 0.01, 'wide canvas roundtrip x');
  assertApprox(back2.y, 600, 0.01, 'wide canvas roundtrip y');
}

/* ========== Test: hitTest ========== */

function testHitTest() {
  const entities = [
    { id: 1, x: 100, y: 100, width: 50, height: 80 },
    { id: 2, x: 130, y: 120, width: 50, height: 80 },  // overlaps entity 1
    { id: 3, x: 500, y: 500, width: 30, height: 30 },
  ];

  // Click on entity 3
  const hit3 = hitTest(510, 510, entities);
  assertEqual(hit3.id, 3, 'hitTest finds entity 3');

  // Click on overlapping area — should return entity 2 (front/topmost = last in array)
  const hitOverlap = hitTest(140, 130, entities);
  assertEqual(hitOverlap.id, 2, 'hitTest returns topmost (last) on overlap');

  // Click on entity 1 only area
  const hit1 = hitTest(105, 105, entities);
  assertEqual(hit1.id, 1, 'hitTest finds entity 1 in non-overlap zone');

  // Click on nothing
  const miss = hitTest(800, 800, entities);
  assertEqual(miss, null, 'hitTest returns null on miss');

  // Edge cases: exact boundary
  const edgeHit = hitTest(100, 100, entities);
  assertEqual(edgeHit.id, 1, 'hitTest includes top-left edge');

  const edgeHitBR = hitTest(150, 180, entities);
  assertEqual(edgeHitBR.id, 2, 'hitTest includes bottom-right edge of entity 2');

  // Just outside
  const justOutside = hitTest(99, 100, entities);
  assertEqual(justOutside, null, 'hitTest excludes point just outside');
}

/* ========== Test: mulberry32 deterministic sequence ========== */

function testMulberry32() {
  const rng1 = mulberry32(42);
  const rng2 = mulberry32(42);

  // Same seed → same sequence
  const seq1 = [];
  const seq2 = [];
  for (let i = 0; i < 10; i++) {
    seq1.push(rng1());
    seq2.push(rng2());
  }

  for (let i = 0; i < 10; i++) {
    assertEqual(seq1[i], seq2[i], `mulberry32 deterministic at index ${i}`);
  }

  // Values in [0, 1)
  for (let i = 0; i < 10; i++) {
    assert(seq1[i] >= 0 && seq1[i] < 1, `mulberry32 value ${i} in [0,1)`);
  }

  // Different seed → different sequence
  const rng3 = mulberry32(99);
  const val3 = rng3();
  const val1 = mulberry32(42)();
  assert(val3 !== val1, 'mulberry32 different seeds produce different values');
}

/* ========== Test: setState merges correctly ========== */

function testSetState() {
  // Save original state
  const origScreen = gameState.screen;
  const origStars = gameState.stars;
  const origScore = gameState.score;

  // Reset to title for testing
  gameState.screen = STATES.TITLE;
  gameState.stars = 3;
  gameState.score = 0;
  gameState.caseIndex = 0;

  // Merge should update only patched fields
  setState({ screen: STATES.BRIEFING });
  assertEqual(gameState.screen, STATES.BRIEFING, 'setState updates screen');
  assertEqual(gameState.stars, 3, 'setState preserves unpatched stars');
  assertEqual(gameState.score, 0, 'setState preserves unpatched score');

  // Merge multiple fields
  setState({ screen: STATES.SCENE, stars: 2 });
  assertEqual(gameState.screen, STATES.SCENE, 'setState multi-field screen');
  assertEqual(gameState.stars, 2, 'setState multi-field stars');

  // Restore state
  gameState.screen = origScreen;
  gameState.stars = origStars;
  gameState.score = origScore;
}

/* ========== Test: state transition validation ========== */

function testStateTransitions() {
  // Save
  const orig = gameState.screen;

  // Valid: TITLE → BRIEFING
  gameState.screen = STATES.TITLE;
  setState({ screen: STATES.BRIEFING });
  assertEqual(gameState.screen, STATES.BRIEFING, 'valid transition TITLE→BRIEFING');

  // Valid: BRIEFING → SCENE
  setState({ screen: STATES.SCENE });
  assertEqual(gameState.screen, STATES.SCENE, 'valid transition BRIEFING→SCENE');

  // Invalid: TITLE → SOLVED (should be rejected)
  gameState.screen = STATES.TITLE;
  setState({ screen: STATES.SOLVED });
  assertEqual(gameState.screen, STATES.TITLE, 'invalid TITLE→SOLVED rejected');

  // Invalid: TITLE → SCENE (should be rejected)
  gameState.screen = STATES.TITLE;
  setState({ screen: STATES.SCENE });
  assertEqual(gameState.screen, STATES.TITLE, 'invalid TITLE→SCENE rejected');

  // Valid: SCENE → INSPECT
  gameState.screen = STATES.SCENE;
  setState({ screen: STATES.INSPECT });
  assertEqual(gameState.screen, STATES.INSPECT, 'valid SCENE→INSPECT');

  // Valid: INSPECT → SCENE (back)
  setState({ screen: STATES.SCENE });
  assertEqual(gameState.screen, STATES.SCENE, 'valid INSPECT→SCENE');

  // Valid: SCENE → SOLVED
  setState({ screen: STATES.SOLVED });
  assertEqual(gameState.screen, STATES.SOLVED, 'valid SCENE→SOLVED');

  // Valid: SOLVED → VICTORY
  setState({ screen: STATES.VICTORY });
  assertEqual(gameState.screen, STATES.VICTORY, 'valid SOLVED→VICTORY');

  // Valid: VICTORY → TITLE
  setState({ screen: STATES.TITLE });
  assertEqual(gameState.screen, STATES.TITLE, 'valid VICTORY→TITLE');

  // Valid: SCENE → FAILED
  gameState.screen = STATES.SCENE;
  setState({ screen: STATES.FAILED });
  assertEqual(gameState.screen, STATES.FAILED, 'valid SCENE→FAILED');

  // Valid: FAILED → BRIEFING
  setState({ screen: STATES.BRIEFING });
  assertEqual(gameState.screen, STATES.BRIEFING, 'valid FAILED→BRIEFING');

  // Restore
  gameState.screen = orig;
}

/* ========== Test: VALID_TRANSITIONS completeness ========== */

function testTransitionTableComplete() {
  const allStates = Object.values(STATES);
  for (const s of allStates) {
    assert(
      VALID_TRANSITIONS[s] !== undefined,
      `VALID_TRANSITIONS has entry for ${s}`
    );
    assert(
      Array.isArray(VALID_TRANSITIONS[s]),
      `VALID_TRANSITIONS[${s}] is an array`
    );
  }
}

/* ========== Test: PALETTE sanity ========== */

function testPalette() {
  assert(typeof PALETTE.bg === 'string', 'PALETTE.bg is a string');
  assert(PALETTE.skin.length >= 3, 'PALETTE has enough skin tones');
  assert(PALETTE.clothing.length >= 5, 'PALETTE has enough clothing colors');
  assert(PALETTE.hair.length >= 5, 'PALETTE has enough hair colors');
}

/* ========== Run all tests ========== */

function runAllTests() {
  testCoordinateTransforms();
  testHitTest();
  testMulberry32();
  testSetState();
  testStateTransitions();
  testTransitionTableComplete();
  testPalette();

  // Display results
  const container = document.getElementById('test-results');
  if (!container) return;

  const summary = document.createElement('div');
  summary.className = testsFailed === 0 ? 'summary pass' : 'summary fail';
  summary.textContent = `${testsPassed} passed, ${testsFailed} failed (${testsPassed + testsFailed} total)`;
  container.appendChild(summary);

  for (const r of testResults) {
    const div = document.createElement('div');
    div.className = r.pass ? 'test pass' : 'test fail';
    div.textContent = `${r.pass ? '✓' : '✗'} ${r.message}`;
    container.appendChild(div);
  }
}

// Run when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllTests);
} else {
  runAllTests();
}
