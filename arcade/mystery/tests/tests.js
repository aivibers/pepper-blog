/* tests.js — unit tests for engine, renderer, state machine, all cases */

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
  const scale = Math.min(1000 / WORLD_W, 400 / WORLD_H);
  assertEqual(scale, 0.4, 'wide canvas scale');
  const wideCenter = worldToScreen(WORLD_W / 2, WORLD_H / 2, wideCanvas);
  assertEqual(wideCenter.y, 200, 'wide canvas center y');
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
    { id: 2, x: 130, y: 120, width: 50, height: 80 },
    { id: 3, x: 500, y: 500, width: 30, height: 30 },
  ];

  const hit3 = hitTest(510, 510, entities);
  assertEqual(hit3.id, 3, 'hitTest finds entity 3');

  const hitOverlap = hitTest(140, 130, entities);
  assertEqual(hitOverlap.id, 2, 'hitTest returns topmost (last) on overlap');

  const hit1 = hitTest(105, 105, entities);
  assertEqual(hit1.id, 1, 'hitTest finds entity 1 in non-overlap zone');

  const miss = hitTest(800, 800, entities);
  assertEqual(miss, null, 'hitTest returns null on miss');

  const edgeHit = hitTest(100, 100, entities);
  assertEqual(edgeHit.id, 1, 'hitTest includes top-left edge');

  const edgeHitBR = hitTest(150, 180, entities);
  assertEqual(edgeHitBR.id, 2, 'hitTest includes bottom-right edge of entity 2');

  const justOutside = hitTest(99, 100, entities);
  assertEqual(justOutside, null, 'hitTest excludes point just outside');
}

/* ========== Test: mulberry32 deterministic sequence ========== */

function testMulberry32() {
  const rng1 = mulberry32(42);
  const rng2 = mulberry32(42);

  const seq1 = [];
  const seq2 = [];
  for (let i = 0; i < 10; i++) {
    seq1.push(rng1());
    seq2.push(rng2());
  }

  for (let i = 0; i < 10; i++) {
    assertEqual(seq1[i], seq2[i], `mulberry32 deterministic at index ${i}`);
  }

  for (let i = 0; i < 10; i++) {
    assert(seq1[i] >= 0 && seq1[i] < 1, `mulberry32 value ${i} in [0,1)`);
  }

  const rng3 = mulberry32(99);
  const val3 = rng3();
  const val1 = mulberry32(42)();
  assert(val3 !== val1, 'mulberry32 different seeds produce different values');
}

/* ========== Test: setState merges correctly ========== */

function testSetState() {
  const origScreen = gameState.screen;
  const origStars = gameState.stars;
  const origScore = gameState.score;

  gameState.screen = STATES.TITLE;
  gameState.stars = 3;
  gameState.score = 0;
  gameState.caseIndex = 0;

  setState({ screen: STATES.BRIEFING });
  assertEqual(gameState.screen, STATES.BRIEFING, 'setState updates screen');
  assertEqual(gameState.stars, 3, 'setState preserves unpatched stars');
  assertEqual(gameState.score, 0, 'setState preserves unpatched score');

  setState({ screen: STATES.SCENE, stars: 2 });
  assertEqual(gameState.screen, STATES.SCENE, 'setState multi-field screen');
  assertEqual(gameState.stars, 2, 'setState multi-field stars');

  gameState.screen = origScreen;
  gameState.stars = origStars;
  gameState.score = origScore;
}

/* ========== Test: state transition validation ========== */

function testStateTransitions() {
  const orig = gameState.screen;

  gameState.screen = STATES.TITLE;
  setState({ screen: STATES.BRIEFING });
  assertEqual(gameState.screen, STATES.BRIEFING, 'valid transition TITLE→BRIEFING');

  setState({ screen: STATES.SCENE });
  assertEqual(gameState.screen, STATES.SCENE, 'valid transition BRIEFING→SCENE');

  gameState.screen = STATES.TITLE;
  setState({ screen: STATES.SOLVED });
  assertEqual(gameState.screen, STATES.TITLE, 'invalid TITLE→SOLVED rejected');

  gameState.screen = STATES.TITLE;
  setState({ screen: STATES.SCENE });
  assertEqual(gameState.screen, STATES.TITLE, 'invalid TITLE→SCENE rejected');

  gameState.screen = STATES.SCENE;
  setState({ screen: STATES.INSPECT });
  assertEqual(gameState.screen, STATES.INSPECT, 'valid SCENE→INSPECT');

  setState({ screen: STATES.SCENE });
  assertEqual(gameState.screen, STATES.SCENE, 'valid INSPECT→SCENE');

  setState({ screen: STATES.SOLVED });
  assertEqual(gameState.screen, STATES.SOLVED, 'valid SCENE→SOLVED');

  setState({ screen: STATES.VICTORY });
  assertEqual(gameState.screen, STATES.VICTORY, 'valid SOLVED→VICTORY');

  setState({ screen: STATES.TITLE });
  assertEqual(gameState.screen, STATES.TITLE, 'valid VICTORY→TITLE');

  gameState.screen = STATES.SCENE;
  setState({ screen: STATES.FAILED });
  assertEqual(gameState.screen, STATES.FAILED, 'valid SCENE→FAILED');

  setState({ screen: STATES.BRIEFING });
  assertEqual(gameState.screen, STATES.BRIEFING, 'valid FAILED→BRIEFING');

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

/* ========== Test: createCharacter deterministic ========== */

function testCreateCharacterDeterministic() {
  const rng1 = mulberry32(42);
  const rng2 = mulberry32(42);
  const slot = { x: 400, y: 600 };

  const c1 = createCharacter(rng1, slot);
  const c2 = createCharacter(rng2, slot);

  assertEqual(c1.x, c2.x, 'createCharacter deterministic x');
  assertEqual(c1.y, c2.y, 'createCharacter deterministic y');
  assertEqual(c1.width, c2.width, 'createCharacter deterministic width');
  assertEqual(c1.height, c2.height, 'createCharacter deterministic height');
  assertEqual(c1.attributes.skinTone, c2.attributes.skinTone, 'createCharacter deterministic skinTone');
  assertEqual(c1.attributes.hairColor, c2.attributes.hairColor, 'createCharacter deterministic hairColor');
  assertEqual(c1.attributes.hairStyle, c2.attributes.hairStyle, 'createCharacter deterministic hairStyle');
  assertEqual(c1.attributes.shirtColor, c2.attributes.shirtColor, 'createCharacter deterministic shirtColor');
  assertEqual(c1.attributes.hat, c2.attributes.hat, 'createCharacter deterministic hat');
  assertEqual(c1.attributes.glasses, c2.attributes.glasses, 'createCharacter deterministic glasses');
  assertEqual(c1.attributes.holdingItem, c2.attributes.holdingItem, 'createCharacter deterministic holdingItem');
}

/* ========== Test: createCharacter with overrides ========== */

function testCreateCharacterOverrides() {
  const rng = mulberry32(100);
  const slot = { x: 500, y: 700 };
  const overrides = {
    hat: 'beret',
    hatColor: '#8B0000',
    glasses: true,
    holdingItem: 'tube',
  };

  const c = createCharacter(rng, slot, overrides);

  assertEqual(c.attributes.hat, 'beret', 'override hat applied');
  assertEqual(c.attributes.hatColor, '#8B0000', 'override hatColor applied');
  assertEqual(c.attributes.glasses, true, 'override glasses applied');
  assertEqual(c.attributes.holdingItem, 'tube', 'override holdingItem applied');
  assert(typeof c.attributes.skinTone === 'number', 'non-overridden skinTone exists');
  assert(typeof c.attributes.shirtColor === 'string', 'non-overridden shirtColor exists');
}

/* ========== Test: createCharacter hat null clears hatColor ========== */

function testCharacterNoHatClearsHatColor() {
  const rng = mulberry32(55);
  const slot = { x: 300, y: 500 };
  const c = createCharacter(rng, slot, { hat: null });
  assertEqual(c.attributes.hatColor, null, 'null hat clears hatColor');
}

/* ========== Test: createCharacter bounding box within world ========== */

function testCharacterBoundsInWorld() {
  const rng = mulberry32(77);
  const slots = [
    { x: 50, y: 200 },
    { x: 800, y: 500 },
    { x: 1550, y: 950 },
  ];

  for (const slot of slots) {
    const c = createCharacter(rng, slot);
    assert(c.x >= -100 && c.x + c.width <= WORLD_W + 100,
      `char at slot (${slot.x},${slot.y}) x bounds ok: ${c.x} to ${c.x + c.width}`);
    assert(c.y >= -100 && c.y + c.height <= WORLD_H + 100,
      `char at slot (${slot.x},${slot.y}) y bounds ok: ${c.y} to ${c.y + c.height}`);
  }
}

/* ========== Test: two characters from same seed + different slots ========== */

function testCharactersDifferentSlots() {
  const rng = mulberry32(42);
  const c1 = createCharacter(rng, { x: 100, y: 300 });
  const c2 = createCharacter(rng, { x: 800, y: 600 });

  assert(c1.x !== c2.x || c1.y !== c2.y,
    'characters at different slots have different positions');
}

/* ========== Test: describeCharacter returns a string ========== */

function testDescribeCharacter() {
  const rng = mulberry32(42);
  const c = createCharacter(rng, { x: 400, y: 600 });
  const desc = describeCharacter(c);
  assert(typeof desc === 'string' && desc.length > 10,
    'describeCharacter returns a meaningful string');
  assert(desc.startsWith('A person'),
    'describeCharacter starts with "A person"');
}

/* ========== Test: createScene museum ========== */

function testCreateSceneMuseum() {
  const rng = mulberry32(42);
  const scene = createScene('museum', rng);
  assertEqual(scene.name, 'Museum Gallery', 'museum scene name');
  assertEqual(scene.characterSlots.length, 18, 'museum has 18 character slots');
  assert(scene.layers.background.length > 0, 'museum has background layer items');
  assert(scene.layers.furniture.length > 0, 'museum has furniture layer items');
  assert(Array.isArray(scene.layers.foreground), 'museum has foreground layer array');
}

/* ========== Test: createScene kitchen ========== */

function testCreateSceneKitchen() {
  const rng = mulberry32(42);
  const scene = createScene('kitchen', rng);
  assertEqual(scene.name, 'Restaurant Kitchen', 'kitchen scene name');
  assertEqual(scene.characterSlots.length, 16, 'kitchen has 16 character slots');
  assert(scene.layers.background.length > 0, 'kitchen has background layer items');
  assert(scene.layers.furniture.length > 0, 'kitchen has furniture layer items');
}

/* ========== Test: createScene library ========== */

function testCreateSceneLibrary() {
  const rng = mulberry32(42);
  const scene = createScene('library', rng);
  assertEqual(scene.name, 'Reading Room', 'library scene name');
  assertEqual(scene.characterSlots.length, 18, 'library has 18 character slots');
  assert(scene.layers.background.length > 0, 'library has background layer items');
  assert(scene.layers.furniture.length > 0, 'library has furniture layer items');
}

/* ========== Test: createScene deterministic ========== */

function testCreateSceneDeterministic() {
  const s1 = createScene('museum', mulberry32(42));
  const s2 = createScene('museum', mulberry32(42));

  assertEqual(s1.characterSlots.length, s2.characterSlots.length,
    'museum deterministic slot count');
  assertEqual(s1.characterSlots[0].x, s2.characterSlots[0].x,
    'museum deterministic first slot x');
  assertEqual(s1.characterSlots[0].y, s2.characterSlots[0].y,
    'museum deterministic first slot y');
}

/* ========== Test: createScene unknown type defaults to museum ========== */

function testCreateSceneUnknownType() {
  const rng = mulberry32(42);
  const scene = createScene('unknown_type', rng);
  assertEqual(scene.name, 'Museum Gallery', 'unknown type defaults to museum');
}

/* ========== Test: Case data structure (all cases) ========== */

function testCaseDataStructure() {
  assert(Array.isArray(CASES), 'CASES is an array');
  assertEqual(CASES.length, 3, 'CASES has exactly 3 cases');

  for (let i = 0; i < CASES.length; i++) {
    const c = CASES[i];
    assert(typeof c.id === 'string', `case ${i} has id`);
    assert(typeof c.title === 'string', `case ${i} has title`);
    assert(typeof c.briefing === 'string', `case ${i} has briefing`);
    assert(typeof c.scene === 'object', `case ${i} has scene config`);
    assert(typeof c.scene.type === 'string', `case ${i} scene has type`);
    assert(typeof c.scene.characterSlots === 'number', `case ${i} scene has characterSlots`);
    assert(typeof c.culprit === 'object', `case ${i} has culprit`);
    assert(Array.isArray(c.clues), `case ${i} has clues array`);
    assert(typeof c.solution === 'string', `case ${i} has solution`);
  }
}

/* ========== Test: Case clue types (all cases) ========== */

function testCaseClueTypes() {
  for (let i = 0; i < CASES.length; i++) {
    const caseData = CASES[i];
    const realClues = caseData.clues.filter(
      cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
    );
    assert(realClues.length >= 3, `case ${i} (${caseData.id}) has at least 3 real clues`);

    const redHerrings = caseData.clues.filter(cl => cl.type === 'redHerring');
    assert(redHerrings.length >= 1, `case ${i} (${caseData.id}) has at least 1 red herring`);

    for (const cl of realClues) {
      assert(cl.attribute !== undefined, `case ${i} real clue has attribute: "${cl.text}"`);
      assert(cl.value !== undefined, `case ${i} real clue has value: "${cl.text}"`);
    }
  }
}

/* ========== Test: Case 1 data validates — exactly one culprit ========== */

function testCase1ExactlyOneCulprit() {
  const loaded = loadCase(0);
  assert(loaded !== null, 'loadCase(0) returns a valid result');

  const caseData = loaded.caseData;
  const characters = loaded.characters;

  assertEqual(caseData.id, 'museum_heist', 'case 1 is museum_heist');
  assert(characters.length === 18, `case 1 has 18 characters (got ${characters.length})`);

  const realClues = caseData.clues.filter(
    cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
  );
  const matches = characters.filter(c =>
    realClues.every(cl => c.attributes[cl.attribute] === cl.value)
  );
  assertEqual(matches.length, 1, 'case 1 has exactly 1 culprit matching all real clues');
}

/* ========== Test: Case 2 data validates — exactly one culprit ========== */

function testCase2ExactlyOneCulprit() {
  const loaded = loadCase(1);
  assert(loaded !== null, 'loadCase(1) returns a valid result');

  const caseData = loaded.caseData;
  const characters = loaded.characters;

  assertEqual(caseData.id, 'missing_recipe', 'case 2 is missing_recipe');
  assert(characters.length === 16, `case 2 has 16 characters (got ${characters.length})`);

  const realClues = caseData.clues.filter(
    cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
  );
  const matches = characters.filter(c =>
    realClues.every(cl => c.attributes[cl.attribute] === cl.value)
  );
  assertEqual(matches.length, 1, 'case 2 has exactly 1 culprit matching all real clues');
}

/* ========== Test: Case 3 data validates — exactly one culprit ========== */

function testCase3ExactlyOneCulprit() {
  const loaded = loadCase(2);
  assert(loaded !== null, 'loadCase(2) returns a valid result');

  const caseData = loaded.caseData;
  const characters = loaded.characters;

  assertEqual(caseData.id, 'library_whisper', 'case 3 is library_whisper');
  assert(characters.length === 18, `case 3 has 18 characters (got ${characters.length})`);

  const realClues = caseData.clues.filter(
    cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
  );
  const matches = characters.filter(c =>
    realClues.every(cl => c.attributes[cl.attribute] === cl.value)
  );
  assertEqual(matches.length, 1, 'case 3 has exactly 1 culprit matching all real clues');
}

/* ========== Test: Case 2 culprit attributes ========== */

function testCase2CulpritAttributes() {
  const loaded = loadCase(1);
  const realClues = loaded.caseData.clues.filter(
    cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
  );
  const culprit = loaded.characters.find(c =>
    realClues.every(cl => c.attributes[cl.attribute] === cl.value)
  );

  assert(culprit !== undefined, 'case 2 culprit found');
  assertEqual(culprit.attributes.hat, 'cap', 'case 2 culprit has cap');
  assertEqual(culprit.attributes.holdingItem, 'book', 'case 2 culprit holds book');
  assertEqual(culprit.attributes.accessory, 'badge', 'case 2 culprit has badge');
}

/* ========== Test: Case 3 culprit attributes ========== */

function testCase3CulpritAttributes() {
  const loaded = loadCase(2);
  const realClues = loaded.caseData.clues.filter(
    cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
  );
  const culprit = loaded.characters.find(c =>
    realClues.every(cl => c.attributes[cl.attribute] === cl.value)
  );

  assert(culprit !== undefined, 'case 3 culprit found');
  assertEqual(culprit.attributes.glasses, false, 'case 3 culprit has no glasses');
  assertEqual(culprit.attributes.holdingItem, 'bag', 'case 3 culprit holds bag');
  assertEqual(culprit.attributes.facialHair, 'mustache', 'case 3 culprit has mustache');
}

/* ========== Test: Accusation logic — correct character ========== */

function testAccusationCorrect() {
  const loaded = loadCase(0);
  const caseData = loaded.caseData;
  const characters = loaded.characters;

  const realClues = caseData.clues.filter(
    cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
  );
  const culprit = characters.find(c =>
    realClues.every(cl => c.attributes[cl.attribute] === cl.value)
  );

  assert(culprit !== undefined, 'culprit found in characters');
  const result = checkAccusation(culprit, caseData);
  assertEqual(result, true, 'checkAccusation returns true for correct culprit');
}

/* ========== Test: Accusation logic — wrong character ========== */

function testAccusationWrongPartialMatch() {
  const loaded = loadCase(0);
  const caseData = loaded.caseData;
  const characters = loaded.characters;

  const realClues = caseData.clues.filter(
    cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
  );
  const nonCulprit = characters.find(c =>
    !realClues.every(cl => c.attributes[cl.attribute] === cl.value)
  );

  assert(nonCulprit !== undefined, 'non-culprit found in characters');
  const result = checkAccusation(nonCulprit, caseData);
  assertEqual(result, false, 'checkAccusation returns false for wrong character');
}

/* ========== Test: Accusation for all 3 cases ========== */

function testAccusationAllCases() {
  for (let i = 0; i < CASES.length; i++) {
    const loaded = loadCase(i);
    const caseData = loaded.caseData;
    const characters = loaded.characters;

    const realClues = caseData.clues.filter(
      cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
    );
    const culprit = characters.find(c =>
      realClues.every(cl => c.attributes[cl.attribute] === cl.value)
    );
    assert(culprit !== undefined, `case ${i} culprit found for accusation`);
    assertEqual(checkAccusation(culprit, caseData), true,
      `checkAccusation correct for case ${i} (${caseData.id})`);

    // All non-culprits should fail
    const nonCulprits = characters.filter(c =>
      !realClues.every(cl => c.attributes[cl.attribute] === cl.value)
    );
    for (const nc of nonCulprits) {
      assertEqual(checkAccusation(nc, caseData), false,
        `checkAccusation rejects non-culprit in case ${i}`);
    }
  }
}

/* ========== Test: Star decrements on wrong accusation ========== */

function testStarDecrement() {
  const origState = Object.assign({}, gameState);

  const loaded = loadCase(0);
  gameState.screen = STATES.INSPECT;
  gameState.currentCase = loaded.caseData;
  gameState.characters = loaded.characters;
  gameState.stars = 3;

  const realClues = loaded.caseData.clues.filter(
    cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
  );
  const nonCulprit = loaded.characters.find(c =>
    !realClues.every(cl => c.attributes[cl.attribute] === cl.value)
  );
  gameState.selectedCharacter = nonCulprit;

  handleAccuse();
  assertEqual(gameState.stars, 2, 'stars decrement from 3 to 2 on wrong accusation');

  Object.assign(gameState, origState);
}

/* ========== Test: Game over at 0 stars ========== */

function testGameOverAtZeroStars() {
  const origState = Object.assign({}, gameState);

  const loaded = loadCase(0);
  gameState.screen = STATES.INSPECT;
  gameState.currentCase = loaded.caseData;
  gameState.characters = loaded.characters;
  gameState.stars = 1;

  const realClues = loaded.caseData.clues.filter(
    cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
  );
  const nonCulprit = loaded.characters.find(c =>
    !realClues.every(cl => c.attributes[cl.attribute] === cl.value)
  );
  gameState.selectedCharacter = nonCulprit;

  handleAccuse();
  assertEqual(gameState.stars, 0, 'stars reach 0');
  assertEqual(gameState.screen, STATES.FAILED, 'game over triggers FAILED state at 0 stars');

  Object.assign(gameState, origState);
}

/* ========== Test: loadCase returns deterministic results ========== */

function testLoadCaseDeterministic() {
  const loaded1 = loadCase(0);
  const loaded2 = loadCase(0);

  assertEqual(loaded1.characters.length, loaded2.characters.length,
    'loadCase deterministic character count');

  const realClues = loaded1.caseData.clues.filter(
    cl => cl.type !== 'redHerring' && cl.type !== 'flavor'
  );
  const culprit1 = loaded1.characters.find(c =>
    realClues.every(cl => c.attributes[cl.attribute] === cl.value)
  );
  const culprit2 = loaded2.characters.find(c =>
    realClues.every(cl => c.attributes[cl.attribute] === cl.value)
  );

  assertEqual(culprit1.attributes.hat, culprit2.attributes.hat,
    'loadCase deterministic culprit hat');
  assertEqual(culprit1.attributes.glasses, culprit2.attributes.glasses,
    'loadCase deterministic culprit glasses');
  assertEqual(culprit1.attributes.holdingItem, culprit2.attributes.holdingItem,
    'loadCase deterministic culprit holdingItem');
}

/* ========== Test: Case progression (case 1 → case 2) ========== */

function testCaseProgression() {
  const origState = Object.assign({}, gameState);

  // Start from title, load case 0
  gameState.screen = STATES.TITLE;
  const loaded0 = loadCase(0);
  setState({
    screen: STATES.BRIEFING,
    caseIndex: 0,
    currentCase: loaded0.caseData,
    scene: loaded0.scene,
    characters: loaded0.characters,
    stars: 3,
    score: 0,
  });
  assertEqual(gameState.caseIndex, 0, 'progression: starts at case 0');
  assertEqual(gameState.currentCase.id, 'museum_heist', 'progression: case 0 is museum');

  // Simulate solving case 0
  setState({ screen: STATES.SCENE });
  setState({ screen: STATES.SOLVED, score: 300 });
  assertEqual(gameState.score, 300, 'progression: score after case 0 solve');

  // Advance to case 1
  const loaded1 = loadCase(1);
  setState({
    screen: STATES.BRIEFING,
    caseIndex: 1,
    currentCase: loaded1.caseData,
    scene: loaded1.scene,
    characters: loaded1.characters,
    stars: 3,
  });
  assertEqual(gameState.caseIndex, 1, 'progression: advanced to case 1');
  assertEqual(gameState.currentCase.id, 'missing_recipe', 'progression: case 1 is kitchen');

  Object.assign(gameState, origState);
}

/* ========== Test: Victory triggers after case 3 solved ========== */

function testVictoryAfterCase3() {
  const origState = Object.assign({}, gameState);

  // Simulate being at the end of case 3
  gameState.screen = STATES.SCENE;
  gameState.caseIndex = 2;
  gameState.score = 600;

  // Solve case 3
  setState({ screen: STATES.SOLVED, score: 900 });
  assertEqual(gameState.screen, STATES.SOLVED, 'after case 3 solve: SOLVED state');

  // Check if next case would be victory
  const nextIndex = gameState.caseIndex + 1;
  const isLastCase = nextIndex >= CASES.length;
  assertEqual(isLastCase, true, 'case 3 is the last case');

  // Transition to victory
  setState({ screen: STATES.VICTORY });
  assertEqual(gameState.screen, STATES.VICTORY, 'transitions to VICTORY after last case');

  Object.assign(gameState, origState);
}

/* ========== Test: Score calculation ========== */

function testScoreCalculation() {
  // Perfect: 3 stars per case × 3 cases = 900
  assertEqual(calculateCaseScore(3), 300, 'perfect case score: 3 stars = 300');
  assertEqual(calculateCaseScore(2), 200, '2 stars = 200');
  assertEqual(calculateCaseScore(1), 100, '1 star = 100');
  assertEqual(calculateCaseScore(0), 0, '0 stars = 0');

  // Perfect game total
  const perfectTotal = 3 * calculateCaseScore(3);
  assertEqual(perfectTotal, 900, 'perfect game: 3 × 300 = 900');
}

/* ========== Test: Replay resets all state ========== */

function testReplayResetsState() {
  const origState = Object.assign({}, gameState);

  // Set up a completed game
  gameState.screen = STATES.SOLVED;
  gameState.caseIndex = 2;
  gameState.score = 700;
  gameState.stars = 1;
  gameState.currentCase = CASES[2];
  gameState.selectedCharacter = { id: 99999 };

  // Transition to victory
  setState({ screen: STATES.VICTORY });
  assertEqual(gameState.screen, STATES.VICTORY, 'replay: in victory state');

  // Reset (replay)
  setState({
    screen: STATES.TITLE,
    caseIndex: 0,
    score: 0,
    stars: 3,
    currentCase: null,
    scene: null,
    characters: [],
    selectedCharacter: null,
    cluesRevealed: [],
  });

  assertEqual(gameState.screen, STATES.TITLE, 'replay: screen reset to TITLE');
  assertEqual(gameState.caseIndex, 0, 'replay: caseIndex reset to 0');
  assertEqual(gameState.score, 0, 'replay: score reset to 0');
  assertEqual(gameState.stars, 3, 'replay: stars reset to 3');
  assertEqual(gameState.currentCase, null, 'replay: currentCase reset to null');
  assertEqual(gameState.scene, null, 'replay: scene reset to null');
  assertEqual(gameState.characters.length, 0, 'replay: characters reset to empty');
  assertEqual(gameState.selectedCharacter, null, 'replay: selectedCharacter reset to null');

  Object.assign(gameState, origState);
}

/* ========== Test: Case scene types match ========== */

function testCaseSceneTypes() {
  assertEqual(CASES[0].scene.type, 'museum', 'case 1 scene type is museum');
  assertEqual(CASES[1].scene.type, 'kitchen', 'case 2 scene type is kitchen');
  assertEqual(CASES[2].scene.type, 'library', 'case 3 scene type is library');
}

/* ========== Test: Case IDs are unique ========== */

function testCaseIdsUnique() {
  const ids = CASES.map(c => c.id);
  const unique = new Set(ids);
  assertEqual(unique.size, CASES.length, 'all case IDs are unique');
}

/* ========== Test: All scenes produce distinct layouts ========== */

function testScenesVisuallyDistinct() {
  const scenes = CASES.map((c, i) => {
    const rng = mulberry32(i * 1000 + 42);
    return createScene(c.scene.type, rng);
  });

  // Each scene should have a different name
  const names = scenes.map(s => s.name);
  const uniqueNames = new Set(names);
  assertEqual(uniqueNames.size, 3, 'all 3 scene types produce different names');
}

/* ========== Test: loadCase returns null for out-of-range ========== */

function testLoadCaseOutOfRange() {
  const result = loadCase(99);
  assertEqual(result, null, 'loadCase(99) returns null');
}

/* ========== Test: renderVictory function exists ========== */

function testRenderVictoryExists() {
  assert(typeof renderVictory === 'function', 'renderVictory function exists');
}

/* ========== Test: calculateCaseScore function exists ========== */

function testCalculateCaseScoreExists() {
  assert(typeof calculateCaseScore === 'function', 'calculateCaseScore function exists');
}

/* ========== Run all tests ========== */

function runAllTests() {
  // Task 01 tests — core engine
  testCoordinateTransforms();
  testHitTest();
  testMulberry32();
  testSetState();
  testStateTransitions();
  testTransitionTableComplete();
  testPalette();

  // Task 02 tests — art/characters/scenes
  testCreateCharacterDeterministic();
  testCreateCharacterOverrides();
  testCharacterNoHatClearsHatColor();
  testCharacterBoundsInWorld();
  testCharactersDifferentSlots();
  testDescribeCharacter();
  testCreateSceneMuseum();
  testCreateSceneKitchen();
  testCreateSceneLibrary();
  testCreateSceneDeterministic();
  testCreateSceneUnknownType();

  // Task 03 tests — case 1 validation
  testCaseDataStructure();
  testCaseClueTypes();
  testCase1ExactlyOneCulprit();
  testAccusationCorrect();
  testAccusationWrongPartialMatch();
  testStarDecrement();
  testGameOverAtZeroStars();
  testLoadCaseDeterministic();

  // Task 04 tests — cases 2 & 3, progression, victory, scoring, replay
  testCase2ExactlyOneCulprit();
  testCase3ExactlyOneCulprit();
  testCase2CulpritAttributes();
  testCase3CulpritAttributes();
  testAccusationAllCases();
  testCaseProgression();
  testVictoryAfterCase3();
  testScoreCalculation();
  testReplayResetsState();
  testCaseSceneTypes();
  testCaseIdsUnique();
  testScenesVisuallyDistinct();
  testLoadCaseOutOfRange();
  testRenderVictoryExists();
  testCalculateCaseScoreExists();

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
