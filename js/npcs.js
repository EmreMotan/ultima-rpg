// npcs.js — NPC data and keyword dialogue trees
//
// NPC format:
//   greeting — shown when dialogue opens
//   keywords — { KEYWORD: { text, unlocks: [...], locked: true } }
//     locked keywords only appear after another keyword unlocks them
//   shop — optional: { type: 'store', items: [...] } or { type: 'healer' }

export const NPCS_BY_MAP = {
  overworld: [
    {
      name: 'Guard',
      x: 6,
      y: 6,
      color: '#4ecdc4',
      greeting: 'Halt! The castle is private property. Move along, traveler.',
      keywords: {
        NAME: { text: "Just 'Guard' will do. Names are for people the cold hasn't gotten to yet." },
        JOB: { text: 'I stand here. Sometimes I stand over there. The pay is terrible.' },
        CASTLE: { text: 'Empty, mostly. The court moved to Ashenmere years ago. I guard a memory.' }
      }
    }
  ],
  cinderwick: [
    {
      name: 'Elder Aldric',
      x: 7,
      y: 13,
      color: '#ff6b6b',
      greeting: "Welcome to Cinderwick. Don't let the cold put you off — it's warmer than it was last week.",
      keywords: {
        NAME: { text: "Aldric. I've advised this village for thirty years." },
        JOB: { text: 'I worry, mostly. And advise. Mostly worrying.' },
        QUEST: {
          text: "The Cavern of Roots north of here — something's wrong in it. Miners won't go back. Someone should find out why.",
          unlocks: ['BOOTS', 'ROOTS']
        },
        CAVERN: { text: "North road, past the dead oaks. You'll know the entrance by the smell." },
        BOOTS: {
          text: 'The Ashen Boots are said to be in there. Old warmth-magic in the soles. Cross any peak.',
          locked: true
        },
        ROOTS: {
          text: "North road, past the dead oaks. You'll know the entrance by the smell.",
          locked: true
        }
      }
    },
    {
      name: 'Marta',
      x: 4,
      y: 3,
      color: '#ffd93d',
      greeting: 'General store. Potions, mostly, these days. Folk buy what keeps them standing.',
      keywords: {
        NAME: { text: 'Marta. My mother ran this store, and hers before that. Warmer days, both.' },
        JOB: { text: 'I sell what people need. Lately that means potions and not much else.' },
        POTIONS: { text: 'Brewed by the healer, bottled by me. Fifteen gold and worth every coin.' }
      },
      shop: {
        type: 'store',
        items: [
          { id: 'potion', name: 'Health Potion', price: 15 },
          { id: 'short_sword', name: 'Short Sword', price: 80 },
          { id: 'leather_vest', name: 'Leather Vest', price: 60 }
        ]
      }
    },
    {
      name: 'Healer Sela',
      x: 19,
      y: 3,
      color: '#6bcb77',
      greeting: 'You look half-frozen. Sit by the hearth — healing costs gold, but the fire is free.',
      keywords: {
        NAME: { text: 'Sela. I patch up the miners, mostly. What few still go down.' },
        JOB: { text: 'Healer. Two gold for every point of hurt. I have herbs to buy and a roof to keep.' },
        MINERS: { text: "Haven't treated one in weeks. They won't go near the Cavern. Ask the Elder why." }
      },
      shop: { type: 'healer' }
    },
    {
      name: 'Farmer Wyn',
      x: 5,
      y: 8,
      color: '#b5853b',
      greeting: "Mind the rows. Not that there's much growing in them.",
      keywords: {
        NAME: { text: 'Wyn. Third generation on this dirt.' },
        JOB: { text: 'Farmer. Or I was, when things grew taller than my boot.' },
        HARVEST: { text: "Aye, the harvest was thinner this year. Third year running. We don't talk about it much." }
      }
    },
    {
      name: 'Dougan',
      x: 16,
      y: 10,
      color: '#8d99ae',
      greeting: "If you're looking for work, the mine's closed. If you're looking for trouble, it isn't.",
      keywords: {
        NAME: { text: 'Dougan. Twenty years swinging a pick in the Cavern of Roots.' },
        JOB: { text: "Miner. Was. None of us go back down. Not after what we heard." },
        CAVERN: {
          text: 'Something moves down there now. Below the second shaft. We sealed nothing — we just ran.',
          unlocks: ['HEARD']
        },
        HEARD: {
          text: 'Roots. Creaking. Like a forest growing in fast-forward, in the dark, under your feet.',
          locked: true
        }
      }
    },
    {
      name: 'Bram',
      x: 13,
      y: 17,
      color: '#f4a261',
      greeting: "I'm not supposed to talk to travelers. Are you a traveler?",
      keywords: {
        NAME: { text: "Bram! I'm seven. And a half." },
        JOB: { text: 'I collect rocks. Da says that makes me a miner. Dougan says it makes me a nuisance.' },
        SUN: { text: 'Gran says the sun was yellow when she was small. I think she made that up. It was always white.' }
      }
    },
    {
      name: 'Acolyte Lira',
      x: 8,
      y: 18,
      color: '#e0c068',
      greeting: 'Warmth of the Flame upon you, traveler. Even here, so far from the Shrines, it reaches us.',
      keywords: {
        NAME: { text: 'Lira. An acolyte of the Eternal Flame. Cinderwick is my first posting.' },
        JOB: { text: 'I tend the village brazier and lead the dawn observance. Attendance is... growing, actually.' },
        FLAME: { text: 'The sun is a god, traveler, and gods must be fed. The Church keeps the rituals. The rituals keep the light.' }
      }
    },
    {
      name: 'Pell',
      x: 18,
      y: 15,
      color: '#a8a4ce',
      greeting: 'Clear sky tonight. Good for measurements. Bad for sleeping warm.',
      keywords: {
        NAME: { text: 'Pell. Astronomer of Dusk — what remains of the order, anyway.' },
        JOB: { text: 'I measure the sun. Its light, its warmth, its... decline. Someone has to keep honest numbers.' },
        SUN: { text: 'A natural cycle. Dimming and brightening, over centuries. It will return. The numbers say... well. It will return.' }
      }
    }
  ]
};
