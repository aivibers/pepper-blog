/* characters.js — character generator factory and pixel-art drawing */

/** Attribute pools for random selection */
const HAIR_STYLES = ['short', 'long', 'bald', 'ponytail'];
const HAT_TYPES = [null, null, null, 'beret', 'tophat', 'cap', 'beanie'];
const HOLDING_ITEMS = [null, null, null, 'book', 'cup', 'phone', 'bag', 'tube', 'umbrella', 'flower'];
const FACIAL_HAIR_TYPES = [null, null, null, null, 'beard', 'mustache'];
const ACCESSORY_TYPES = [null, null, null, null, 'scarf', 'necklace', 'badge'];

/** Character dimensions in pixel-art units (each pixel = PIXEL_SIZE world units) */
const CHAR_PX_W = 12;
const CHAR_PX_H = 24;
/** Character dimensions in world units */
const CHAR_WORLD_W = CHAR_PX_W * PIXEL_SIZE; // 48
const CHAR_WORLD_H = CHAR_PX_H * PIXEL_SIZE; // 96

/** Pick a random element from an array using seeded RNG */
function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Darken a hex color by subtracting from each channel.
 * @param {string} hex - #RRGGBB
 * @returns {string}
 */
function darken(hex) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
  return '#' + r.toString(16).padStart(2, '0') +
               g.toString(16).padStart(2, '0') +
               b.toString(16).padStart(2, '0');
}

/**
 * Map a hex color to a human-readable name.
 * @param {string} hex
 * @returns {string}
 */
function colorName(hex) {
  if (!hex) return '';
  const h = hex.toLowerCase();
  const map = {
    '#1a1a1a': 'black',    '#4a3728': 'dark brown', '#8b4513': 'brown',
    '#daa520': 'golden',   '#d2691e': 'auburn',     '#a0522d': 'sienna',
    '#f4a460': 'sandy',    '#808080': 'grey',       '#ffffff': 'white',
    '#f0883e': 'orange',   '#f85149': 'red',        '#7ee787': 'green',
    '#79c0ff': 'blue',     '#d2a8ff': 'purple',     '#ffa657': 'amber',
    '#8b949e': 'grey',     '#e6edf3': 'white',      '#484f58': 'dark grey',
    '#da3633': 'crimson',
  };
  return map[h] || hex;
}

/**
 * Join a list with commas and "and" before the last item.
 * @param {string[]} items
 * @returns {string}
 */
function joinList(items) {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return items[0] + ' and ' + items[1];
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
}

/**
 * Create a character with randomized pixel-art attributes.
 * @param {function} rng   — seeded RNG (returns 0..1)
 * @param {{ x: number, y: number }} slot — world position (bottom-center)
 * @param {object} [overrides={}] — forced attributes (e.g. culprit traits)
 * @returns {object} { id, x, y, width, height, attributes }
 */
function createCharacter(rng, slot, overrides) {
  overrides = overrides || {};

  const attributes = {
    skinTone:    Math.floor(rng() * PALETTE.skin.length),
    hairColor:   pick(rng, PALETTE.hair),
    hairStyle:   pick(rng, HAIR_STYLES),
    hat:         pick(rng, HAT_TYPES),
    hatColor:    pick(rng, PALETTE.clothing),
    glasses:     rng() < 0.25,
    shirtColor:  pick(rng, PALETTE.clothing),
    pantsColor:  pick(rng, PALETTE.clothing),
    holdingItem: pick(rng, HOLDING_ITEMS),
    facialHair:  pick(rng, FACIAL_HAIR_TYPES),
    accessory:   pick(rng, ACCESSORY_TYPES),
  };

  // Apply overrides
  Object.assign(attributes, overrides);

  // Clear hatColor when no hat
  if (!attributes.hat) attributes.hatColor = null;

  return {
    id:     Math.floor(rng() * 90000) + 10000,
    x:      slot.x - CHAR_WORLD_W / 2,
    y:      slot.y - CHAR_WORLD_H,
    width:  CHAR_WORLD_W,
    height: CHAR_WORLD_H,
    attributes: attributes,
  };
}

/**
 * Draw a character at their world position.
 * Draw order: legs → body → arms → held item → head → hair → hat → glasses → facial hair → accessory
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} character
 * @param {number} scale — worldToScreen scale factor
 */
function drawCharacter(ctx, character, scale) {
  const a  = character.attributes;
  const cx = character.x;
  const cy = character.y;
  const skin = PALETTE.skin[a.skinTone] || PALETTE.skin[0];

  /** Draw a pixel-art rect at (pxX, pxY) relative to character top-left */
  const px = (pxX, pxY, pxW, pxH, color) => {
    drawPixelRect(ctx, cx + pxX * PIXEL_SIZE, cy + pxY * PIXEL_SIZE,
                  pxW, pxH, color, scale);
  };

  // === LEGS ===
  px(3, 16, 3, 6, a.pantsColor);    // left leg
  px(7, 16, 3, 6, a.pantsColor);    // right leg
  px(3, 22, 3, 2, '#1a1a1a');       // left shoe
  px(7, 22, 3, 2, '#1a1a1a');       // right shoe

  // === BODY (shirt) ===
  px(2, 9, 8, 7, a.shirtColor);

  // === ARMS ===
  px(0, 9, 2, 5, a.shirtColor);     // left arm
  px(10, 9, 2, 5, a.shirtColor);    // right arm
  px(0, 14, 2, 1, skin);            // left hand
  px(10, 14, 2, 1, skin);           // right hand

  // === HELD ITEM ===
  if (a.holdingItem) {
    _drawHeldItem(px, a.holdingItem);
  }

  // === HEAD ===
  px(3, 2, 6, 6, skin);

  // === NECK ===
  px(5, 8, 2, 1, skin);

  // === EYES ===
  px(4, 4, 1, 1, '#1a1a1a');
  px(7, 4, 1, 1, '#1a1a1a');

  // === MOUTH ===
  px(5, 6, 2, 1, darken(skin));

  // === HAIR ===
  _drawHairStyle(px, a.hairStyle, a.hairColor);

  // === HAT ===
  if (a.hat) {
    _drawHatStyle(px, a.hat, a.hatColor);
  }

  // === GLASSES ===
  if (a.glasses) {
    px(3, 4, 1, 1, '#333333');       // left frame
    px(4, 4, 1, 1, '#4488ff');       // left lens
    px(5, 4, 2, 1, '#333333');       // bridge
    px(7, 4, 1, 1, '#4488ff');       // right lens
    px(8, 4, 1, 1, '#333333');       // right frame
  }

  // === FACIAL HAIR ===
  if (a.facialHair === 'beard') {
    px(4, 7, 4, 2, a.hairColor);
  } else if (a.facialHair === 'mustache') {
    px(4, 6, 4, 1, a.hairColor);
  }

  // === ACCESSORY ===
  if (a.accessory === 'scarf') {
    px(2, 8, 8, 1, PALETTE.red);
  } else if (a.accessory === 'necklace') {
    px(4, 9, 4, 1, PALETTE.gold);
  } else if (a.accessory === 'badge') {
    px(3, 10, 2, 2, PALETTE.gold);
  }
}

/** @private Draw hair based on style */
function _drawHairStyle(px, style, color) {
  switch (style) {
    case 'short':
      px(3, 2, 6, 2, color);        // top
      px(3, 2, 1, 3, color);        // left side
      px(8, 2, 1, 3, color);        // right side
      break;
    case 'long':
      px(3, 2, 6, 2, color);        // top
      px(2, 2, 1, 7, color);        // left long
      px(9, 2, 1, 7, color);        // right long
      break;
    case 'ponytail':
      px(3, 2, 6, 2, color);        // top
      px(9, 2, 1, 5, color);        // ponytail body
      px(10, 4, 1, 4, color);       // ponytail end
      break;
    case 'bald':
      break;
  }
}

/** @private Draw hat based on type */
function _drawHatStyle(px, type, color) {
  switch (type) {
    case 'beret':
      px(2, 1, 8, 2, color);
      px(3, 0, 5, 1, color);
      break;
    case 'tophat':
      px(4, 0, 4, 3, color);        // tall crown
      px(3, 2, 6, 1, color);        // brim
      break;
    case 'cap':
      px(3, 1, 6, 2, color);        // crown
      px(2, 2, 8, 1, color);        // brim
      break;
    case 'beanie':
      px(3, 0, 6, 3, color);        // body
      px(5, 0, 2, 1, PALETTE.text); // pom-pom
      break;
  }
}

/** @private Draw held item near right hand */
function _drawHeldItem(px, item) {
  switch (item) {
    case 'book':
      px(10, 11, 3, 4, '#8B4513');
      px(11, 11, 2, 4, '#A0522D');
      break;
    case 'cup':
      px(10, 12, 2, 3, '#FFFFFF');
      px(12, 13, 1, 1, '#FFFFFF');   // handle
      break;
    case 'phone':
      px(10, 12, 2, 3, '#333333');
      px(10, 12, 2, 1, '#4488ff');   // screen
      break;
    case 'bag':
      px(10, 12, 3, 5, '#8B6914');
      px(11, 11, 1, 1, '#8B6914');   // handle
      break;
    case 'tube':
      px(11, 7, 1, 8, PALETTE.metal);
      break;
    case 'umbrella':
      px(11, 5, 1, 10, '#333333');   // shaft
      px(9, 5, 4, 1, '#333333');     // canopy edge
      break;
    case 'flower':
      px(11, 9, 1, 5, '#228B22');    // stem
      px(10, 8, 3, 2, '#FF69B4');    // bloom
      break;
  }
}

/**
 * Return a human-readable description of a character.
 * @param {object} character
 * @returns {string}
 */
function describeCharacter(character) {
  const a = character.attributes;
  const parts = [];

  // Hair
  if (a.hairStyle === 'bald') {
    parts.push('a bald head');
  } else {
    parts.push(a.hairStyle + ' ' + colorName(a.hairColor) + ' hair');
  }

  // Hat
  if (a.hat) {
    parts.push('a ' + colorName(a.hatColor) + ' ' + a.hat);
  }

  // Glasses
  if (a.glasses) parts.push('glasses');

  // Shirt
  parts.push('a ' + colorName(a.shirtColor) + ' shirt');

  // Facial hair
  if (a.facialHair) parts.push('a ' + a.facialHair);

  // Accessory
  if (a.accessory) parts.push('a ' + a.accessory);

  let text = 'A person with ' + joinList(parts) + '.';

  if (a.holdingItem) {
    text += " They're holding a " + a.holdingItem + '.';
  }

  return text;
}
