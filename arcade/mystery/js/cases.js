/* cases.js — case definitions: clues, suspects, dialogue, solutions */

const CASES = [
  {
    id: 'museum_heist',
    title: 'The Museum Heist',
    briefing: 'A priceless painting has vanished from the East Wing of the Grand Gallery. Security cameras caught nothing. The thief is still among the visitors. Find them before they slip away.',
    scene: {
      type: 'museum',
      characterSlots: 18,
    },
    culprit: {
      hat: 'beret',
      hatColor: '#8B0000',
      glasses: true,
      holdingItem: 'tube',
    },
    clues: [
      { text: 'Witnesses say the thief wore a dark red beret', attribute: 'hat', value: 'beret' },
      { text: 'Security noticed someone with glasses near the painting', attribute: 'glasses', value: true },
      { text: 'A cylindrical object was seen being carried out', attribute: 'holdingItem', value: 'tube' },
      { text: 'A guard recalls seeing a blue coat in the area', type: 'redHerring' },
      { text: 'The suspect was last seen near the east wall', type: 'flavor' },
    ],
    solution: 'The art student with the beret and painting tube!',
  },
  {
    id: 'missing_recipe',
    title: 'The Missing Recipe',
    briefing: "Chef Bernard's legendary soufflé recipe has disappeared from the kitchen safe. One of the staff took it. The kitchen is chaos \u2014 find the thief before service starts.",
    scene: {
      type: 'kitchen',
      characterSlots: 16,
    },
    culprit: {
      hat: 'cap',
      hatColor: '#e6edf3',
      holdingItem: 'book',
      accessory: 'badge',
      shirtColor: '#e6edf3',
    },
    clues: [
      { text: 'The recipe was in a small leather-bound book', attribute: 'holdingItem', value: 'book' },
      { text: 'Only staff wear ID badges in the kitchen', attribute: 'accessory', value: 'badge' },
      { text: "They were wearing a white chef's cap", attribute: 'hat', value: 'cap' },
      { text: 'Someone mentioned seeing red shoes near the exit', type: 'redHerring' },
    ],
    solution: "The kitchen porter with the chef's cap, badge, and recipe book!",
  },
  {
    id: 'library_whisper',
    title: 'The Library Whisper',
    briefing: 'A rare first edition has been slipped off the shelf and hidden somewhere in the reading room. The librarian noticed it missing during the afternoon check. The culprit is still here, pretending to read.',
    scene: {
      type: 'library',
      characterSlots: 18,
    },
    culprit: {
      glasses: false,
      holdingItem: 'bag',
      facialHair: 'mustache',
      shirtColor: '#484f58',
    },
    clues: [
      { text: 'The suspect was NOT wearing glasses \u2014 unusual for a bookworm', attribute: 'glasses', value: false },
      { text: 'They had a large bag \u2014 big enough to hide a book', attribute: 'holdingItem', value: 'bag' },
      { text: 'A distinctive mustache was noticed', attribute: 'facialHair', value: 'mustache' },
      { text: 'They were sitting near the window', type: 'flavor' },
      { text: 'Someone saw a person in green leave the rare books section', type: 'redHerring' },
    ],
    solution: 'The mustachioed patron with the large bag \u2014 no glasses, just audacity!',
  },
];
