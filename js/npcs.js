// npcs.js — NPC data per map (keyword dialogue trees arrive in Phase 2)

export const NPCS_BY_MAP = {
  overworld: [
    {
      name: 'Guard',
      x: 6,
      y: 6,
      color: '#4ecdc4',
      dialogues: [
        'Halt! Who goes there?',
        'The castle is private property.',
        'Cold enough for you? It was worse last winter. Or so we say.',
        'Stay out of trouble, traveler.'
      ]
    }
  ],
  cinderwick: [
    {
      name: 'Elder Aldric',
      x: 7,
      y: 13,
      color: '#ff6b6b',
      dialogues: [
        "Welcome to Cinderwick. Don't let the cold put you off — it's warmer than it was last week.",
        "Aye, the harvest was thinner this year. Third year running.",
        "We don't talk about it much.",
        'Rest here a while, traveler. The roads are no place to linger after dark.'
      ]
    },
    {
      name: 'Trader',
      x: 6,
      y: 6,
      color: '#ffd93d',
      dialogues: [
        'Fine goods for sale! ...Soon, anyway. Still unpacking the cart.',
        'Gold is hard to come by these days.',
        'Safe travels, friend.'
      ]
    },
    {
      name: 'Healer',
      x: 17,
      y: 6,
      color: '#6bcb77',
      dialogues: [
        'You look half-frozen. Sit by the hearth a moment.',
        'I patch up the miners, mostly. What few still go down.',
        'Keep your wounds clean and your boots dry.'
      ]
    }
  ]
};
