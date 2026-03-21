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
];
