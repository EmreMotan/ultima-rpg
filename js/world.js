// world.js — tile definitions, map definitions, town/dungeon layouts

export const TILE_SIZE = 32;

export const TILES = {
  GRASS:   { id: 0,  color: '#2d5a27', name: 'grass' },
  WATER:   { id: 1,  color: '#3a7bd5', name: 'water', solid: true },
  WALL:    { id: 2,  color: '#4a4a4a', name: 'wall', solid: true },
  FLOOR:   { id: 3,  color: '#5a5a5a', name: 'floor' },
  TREE:    { id: 4,  color: '#1a3a17', name: 'tree', solid: true },
  PATH:    { id: 5,  color: '#8b7355', name: 'path' },
  CASTLE:  { id: 6,  color: '#6a4a8a', name: 'castle' },
  TOWN:    { id: 7,  color: '#8a6a4a', name: 'town' },
  DUNGEON: { id: 8,  color: '#2a2a2a', name: 'dungeon' },
  EXIT:    { id: 9,  color: '#c9a227', name: 'exit' }
};

// Generate the overworld (32x32 for now; expands to 64x64 in Phase 4)
function generateOverworldTiles(width, height) {
  const tiles = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      let tile = TILES.GRASS;

      // Water around edges
      if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) {
        tile = TILES.WATER;
      }
      // Castle in top-left
      else if (x >= 4 && x <= 8 && y >= 4 && y <= 8) {
        tile = TILES.CASTLE;
      }
      // Cinderwick in center — TOWN tiles trigger entry
      else if (x >= 15 && x <= 17 && y >= 15 && y <= 17) {
        tile = TILES.TOWN;
      }
      // Dungeon to the south
      else if (x >= 10 && x <= 22 && y >= 22 && y <= 28) {
        tile = TILES.DUNGEON;
      }
      // Random trees
      else if (Math.random() < 0.05) {
        tile = TILES.TREE;
      }
      // Paths connecting places
      else if ((x === 6 && y >= 8 && y <= 14) || (y === 16 && x >= 8 && x <= 14)) {
        tile = TILES.PATH;
      }
      // Dungeon entrance path
      else if (x >= 14 && x <= 18 && y >= 18 && y < 22) {
        tile = TILES.PATH;
      }

      row.push(tile);
    }
    tiles.push(row);
  }
  return tiles;
}

// Town layouts are authored as string grids for readability.
// Legend: W=wall G=grass P=path T=tree F=floor E=exit
const TILE_LEGEND = {
  W: TILES.WALL,
  G: TILES.GRASS,
  P: TILES.PATH,
  T: TILES.TREE,
  F: TILES.FLOOR,
  E: TILES.EXIT
};

function parseLayout(rows) {
  return rows.map(row => row.split('').map(ch => TILE_LEGEND[ch] || TILES.GRASS));
}

// Cinderwick — 24x24 starting town in the Hearthvein Valley
const CINDERWICK_LAYOUT = [
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'WGGGTGGGGGGGGGGGGGGTGGGW',
  'WGWWWWWGGGGGGGGGGWWWWWGW',
  'WGWFFFWGGGGGGGGGGWFFFWGW',
  'WGWFFFFPGGGGGGGGPFFFFWGW',
  'WGWWWWWPGGGGGGGGPWWWWWGW',
  'WGGGGGGPPPPPPPPPPGGGGGGW',
  'WGGGGGGGGGPPGGGGGGGGGGGW',
  'WGGTGGGGGGPPGGGGGGGTGGGW',
  'WGGGGGGGGGPPGGGGGGGGGGGW',
  'WGGGGGGGGGPPGGGGGGGGGGGW',
  'WGGGWWWWWGPPGGGGGGGGGGGW',
  'WGGGWFFFWGPPGGGGTGGGGGGW',
  'WGGGWFFFFPPPGGGGGGGGGGGW',
  'WGGGWWWWWGPPGGGGGGGGGGGW',
  'WGGGGGGGGGPPGGGGGGGGGGGW',
  'WGGTGGGGGGPPGGGGGGTGGGGW',
  'WGGGGGGGGGPPGGGGGGGGGGGW',
  'WGGGGGGGGGPPGGGGGGGGGGGW',
  'WGGGGGGGGGPPGGGGGGGGGGGW',
  'WGGGTGGGGGPPGGGGGGGGTGGW',
  'WGGGGGGGGGPPGGGGGGGGGGGW',
  'WGGGGGGGGGPPGGGGGGGGGGGW',
  'WWWWWWWWWWWEEWWWWWWWWWWW'
];

export function createMaps() {
  return {
    overworld: {
      id: 'overworld',
      name: 'Emberfall',
      width: 32,
      height: 32,
      tiles: generateOverworldTiles(32, 32),
      enemies: [],
      items: [],
      hasEnemies: true,
      spawn: { x: 16, y: 19 }
    },
    cinderwick: {
      id: 'cinderwick',
      name: 'Cinderwick',
      width: 24,
      height: 24,
      tiles: parseLayout(CINDERWICK_LAYOUT),
      enemies: [],
      items: [],
      hasEnemies: false,
      spawn: { x: 11, y: 22 } // just inside the south gate
    }
  };
}

export function isSolid(map, x, y) {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return true;
  return !!map.tiles[y][x].solid;
}
