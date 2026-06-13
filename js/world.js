// world.js — tile definitions, map definitions, overworld layout

export const TILE_SIZE = 32;

export const TILES = {
  GRASS:    { id: 0,  color: '#2d5a27', name: 'grass' },
  WATER:    { id: 1,  color: '#3a7bd5', name: 'water',    solid: true },
  WALL:     { id: 2,  color: '#4a4a4a', name: 'wall',     solid: true },
  FLOOR:    { id: 3,  color: '#5a5a5a', name: 'floor' },
  TREE:     { id: 4,  color: '#1a3a17', name: 'tree',     solid: true },
  PATH:     { id: 5,  color: '#8b7355', name: 'path' },
  TOWN:     { id: 7,  color: '#8a6a4a', name: 'town' },
  DUNGEON:  { id: 8,  color: '#2a2a2a', name: 'dungeon' },
  EXIT:     { id: 9,  color: '#c9a227', name: 'exit' },
  MOUNTAIN: { id: 10, color: '#6a5a50', name: 'mountain', solid: true },
  MARSH:    { id: 11, color: '#4a5a1a', name: 'marsh' },
  SCORCHED: { id: 12, color: '#2a1808', name: 'scorched' },
  FOREST:   { id: 13, color: '#1f4a1f', name: 'forest' }
};

// ── Overworld 64×64 ──────────────────────────────────────────────────────────
//
// Regions:
//   Hearthvein Valley  — center  (x 20-45, y 18-41)  GRASS
//   Ashwood Forest     — NW      (x  2-17, y  2-41)  FOREST + scattered TREE
//   Scorched Wastes    — NE      (x 48-61, y  2-41)  SCORCHED
//   Frostfen Marshes   — S       (x  2-61, y 44-61)  MARSH
//   Mountains          — borders  solid, passable with Ashen Boots
//
// Key locations (x, y):
//   Cinderwick        (28-34, 22-24)   — Valley town
//   Greyhollow        ( 5-9,  46-48)   — SW Marshes town
//   Ashenmere         (49-53,  8-10)   — NE Wastes capital
//   Cavern of Roots   (31, 13)         — dungeon entrance, north of valley
//   Sunken Crypt      (14, 54)         — dungeon, SW marshes
//   Ember Tower       (55, 22)         — dungeon, NE wastes
//   Deep Hearth       (44, 57)         — final dungeon, SE marshes
//   Hermit            (12,  8)         — overworld NPC, behind mountain pass
//
// Player spawn: (31, 32) — south of Cinderwick

function generateOverworldTiles(W, H) {
  const t = Array.from({ length: H }, () => Array(W).fill(TILES.GRASS));

  function set(x, y, tile) {
    if (x >= 0 && x < W && y >= 0 && y < H) t[y][x] = tile;
  }
  function rect(x1, y1, x2, y2, tile) {
    for (let y = Math.max(0, y1); y <= Math.min(H - 1, y2); y++)
      for (let x = Math.max(0, x1); x <= Math.min(W - 1, x2); x++)
        t[y][x] = tile;
  }
  function hline(x1, x2, y, tile) {
    for (let x = x1; x <= x2; x++) set(x, y, tile);
  }
  function vline(x, y1, y2, tile) {
    for (let y = y1; y <= y2; y++) set(x, y, tile);
  }

  // ── Water border ────────────────────────────────────
  rect(0, 0, W - 1, 1, TILES.WATER);
  rect(0, H - 2, W - 1, H - 1, TILES.WATER);
  rect(0, 2, 1, H - 3, TILES.WATER);
  rect(W - 2, 2, W - 1, H - 3, TILES.WATER);

  // ── Ashwood Forest (NW) ─────────────────────────────
  rect(2, 2, 17, 41, TILES.FOREST);   // west strip between mountains
  rect(2, 2, 29, 15, TILES.FOREST);   // north forest above mountain wall

  // ── Scorched Wastes (NE) ────────────────────────────
  rect(48, 2, 61, 41, TILES.SCORCHED);  // east strip
  rect(34, 2, 61, 15, TILES.SCORCHED);  // north wastes above mountain wall

  // ── Frostfen Marshes (S) ────────────────────────────
  rect(2, 44, 61, 61, TILES.MARSH);

  // ── Coastal water (SW, near Greyhollow) ─────────────
  rect(2, 52, 8, 61, TILES.WATER);

  // ── Internal lake (south of valley) ─────────────────
  rect(28, 48, 36, 54, TILES.WATER);

  // ── Mountain walls ──────────────────────────────────

  // North wall — gap at x=28-33 (path to Cavern of Roots)
  rect(2, 16, 27, 17, TILES.MOUNTAIN);
  rect(34, 16, 61, 17, TILES.MOUNTAIN);

  // Corner peaks flanking the gap
  rect(16, 14, 19, 17, TILES.MOUNTAIN);
  rect(44, 14, 47, 17, TILES.MOUNTAIN);

  // West wall (Forest / Valley border)
  rect(18, 18, 19, 41, TILES.MOUNTAIN);

  // East wall (Valley / Wastes border)
  rect(46, 18, 47, 41, TILES.MOUNTAIN);

  // South wall (Valley / Marshes border) — gap at x=29-33 (south road)
  rect(20, 42, 28, 43, TILES.MOUNTAIN);
  rect(34, 42, 45, 43, TILES.MOUNTAIN);

  // NW corner mountains (thicken border)
  rect(2, 16, 3, 41, TILES.MOUNTAIN);

  // NE corner mountains
  rect(61, 16, 61, 41, TILES.MOUNTAIN);

  // ── Scatter blocking trees in forest ────────────────
  // Deterministic pattern — roughly 1 in 8 forest tiles
  for (let y = 2; y <= 41; y++) {
    for (let x = 2; x <= 29; x++) {
      if (t[y][x] === TILES.FOREST && (x * 7 + y * 13) % 8 === 0) {
        t[y][x] = TILES.TREE;
      }
    }
  }

  // ── Paths ────────────────────────────────────────────

  // Main N-S path (Cavern → Cinderwick → south → marsh road)
  vline(31, 12, 41, TILES.PATH);

  // E-W cross path through valley
  hline(20, 45, 31, TILES.PATH);

  // Short east spur toward Wastes entrance
  hline(47, 56, 12, TILES.PATH);

  // SW marsh road from valley south to Greyhollow
  vline(31, 43, 47, TILES.PATH);
  hline(9, 31, 47, TILES.PATH);

  // Greyhollow dock path
  vline(7, 44, 47, TILES.PATH);

  // ── Towns ────────────────────────────────────────────
  rect(28, 22, 34, 24, TILES.TOWN);   // Cinderwick
  rect(5, 46, 9, 48, TILES.TOWN);     // Greyhollow
  rect(49, 8, 53, 10, TILES.TOWN);    // Ashenmere

  // ── Dungeon entrances ────────────────────────────────
  set(31, 12, TILES.DUNGEON);   // Cavern of Roots
  set(14, 54, TILES.DUNGEON);   // Sunken Crypt
  set(55, 22, TILES.DUNGEON);   // Ember Tower
  set(44, 57, TILES.DUNGEON);   // Deep Hearth

  // ── Overwrite paths that landed on mountains/water ──
  // (paths drawn before mountains in some spots — fix)
  // N-S path gap in north wall is already clear (x=28-33 excluded)
  // South gap for path
  set(31, 42, TILES.PATH);
  set(31, 43, TILES.PATH);

  return t;
}

// ── Cinderwick (24×24 town interior) ─────────────────────────────────────────

const TILE_LEGEND = {
  W: TILES.WALL, G: TILES.GRASS, P: TILES.PATH,
  T: TILES.TREE, F: TILES.FLOOR, E: TILES.EXIT
};
function parseLayout(rows) {
  return rows.map(row => row.split('').map(ch => TILE_LEGEND[ch] || TILES.GRASS));
}

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

// ── Map registry ──────────────────────────────────────────────────────────────

export function createMaps() {
  return {
    overworld: {
      id: 'overworld',
      name: 'Emberfall',
      width: 64,
      height: 64,
      tiles: generateOverworldTiles(64, 64),
      enemies: [],
      items: [],
      hasEnemies: true,
      spawn: { x: 31, y: 32 }
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
      spawn: { x: 11, y: 22 }
    }
  };
}

export function isSolid(map, x, y) {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return true;
  return !!map.tiles[y][x].solid;
}
