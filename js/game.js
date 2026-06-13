// game.js — main loop, input, draw, map transitions
// Emberfall RPG (see DESIGN.md)

import { TILE_SIZE, TILES, createMaps } from './world.js';
import { NPCS_BY_MAP } from './npcs.js';
import { ITEMS, createPlayer, useItem } from './player.js';
import { spawnEnemies, moveEnemies, playerAttackEnemy, enemyAttackPlayer } from './combat.js';
import * as ui from './ui.js';

const VERSION = '0.14.0';
console.log('Emberfall RPG v' + VERSION + ' loaded');

// Game state
const state = {
  player: createPlayer(),
  camera: { x: 0, y: 0 },
  maps: createMaps(),
  currentMapId: 'overworld',
  mapStack: []  // [{mapId, x, y}] — stack of positions to return to on EXIT/STAIRS_UP
};

function currentMap() {
  return state.maps[state.currentMapId];
}

function currentNPCs() {
  return NPCS_BY_MAP[state.currentMapId] || [];
}

function isVisible(wx, wy) {
  const map = currentMap();
  if (!map.dark) return true;
  return Math.max(Math.abs(wx - state.player.x), Math.abs(wy - state.player.y)) <= 4;
}

// --- Map transitions ---

// Dungeon map → next floor ID
const DUNGEON_NEXT = { cavern_1: 'cavern_2' };
// Overworld DUNGEON tile position → first floor map ID
function getDungeonForTile(x, y) {
  if (x === 31 && y === 12) return 'cavern_1';
  return null;
}

function pushAndEnter(mapId, returnX, returnY) {
  state.mapStack.push({ mapId: state.currentMapId, x: returnX, y: returnY });
  state.currentMapId = mapId;
  const map = currentMap();
  state.player.x = map.spawn.x;
  state.player.y = map.spawn.y;
}

function popMap() {
  if (state.mapStack.length === 0) return;
  const prev = state.mapStack.pop();
  state.currentMapId = prev.mapId;
  state.player.x = prev.x;
  state.player.y = prev.y;
}

// --- Drawing ---

function draw() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const map = currentMap();

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  // Fill canvas background (black for dark dungeons, grass green for overworld)
  ctx.fillStyle = map.dark ? '#000' : '#2d5a27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tilesX = Math.ceil(canvas.width / TILE_SIZE);
  const tilesY = Math.ceil(canvas.height / TILE_SIZE);

  state.camera.x = state.player.x - Math.floor(tilesX / 2);
  state.camera.y = state.player.y - Math.floor(tilesY / 2);

  // Tiles
  for (let dy = 0; dy < tilesY + 1; dy++) {
    for (let dx = 0; dx < tilesX + 1; dx++) {
      const worldX = state.camera.x + dx;
      const worldY = state.camera.y + dy;

      if (worldX >= 0 && worldX < map.width && worldY >= 0 && worldY < map.height) {
        const tile = map.tiles[worldY][worldX];
        const px = dx * TILE_SIZE;
        const py = dy * TILE_SIZE;

        // Lighting: hide tiles outside vision radius in dark dungeons
        if (map.dark) {
          const vdx = worldX - state.player.x;
          const vdy = worldY - state.player.y;
          if (Math.max(Math.abs(vdx), Math.abs(vdy)) > 4) {
            ctx.fillStyle = '#000';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            continue;
          }
        }

        ctx.fillStyle = tile.color;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Special tile icons
        if (tile === TILES.STAIRS_UP || tile === TILES.STAIRS_DOWN || tile === TILES.CHEST || tile === TILES.LOCKED_DOOR) {
          ctx.save();
          ctx.fillStyle = tile === TILES.LOCKED_DOOR ? '#ff6666' : '#fff';
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const icon = tile === TILES.STAIRS_UP ? '↑' : tile === TILES.STAIRS_DOWN ? '↓' : tile === TILES.CHEST ? '◆' : '🔒';
          ctx.fillText(icon, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
          ctx.restore();
        }
      }
    }
  }

  // Player
  const playerScreenX = (state.player.x - state.camera.x) * TILE_SIZE;
  const playerScreenY = (state.player.y - state.camera.y) * TILE_SIZE;

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(playerScreenX + TILE_SIZE / 2, playerScreenY + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineWidth = 1;

  // NPCs
  currentNPCs().forEach(npc => {
    const npcScreenX = (npc.x - state.camera.x) * TILE_SIZE;
    const npcScreenY = (npc.y - state.camera.y) * TILE_SIZE;
    if (npcScreenX < -TILE_SIZE || npcScreenX > canvas.width ||
        npcScreenY < -TILE_SIZE || npcScreenY > canvas.height) return;

    ctx.fillStyle = npc.color;
    ctx.fillRect(npcScreenX + 6, npcScreenY + 4, 20, 24);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(npcScreenX + 6, npcScreenY + 4, 20, 24);

    const dist = Math.abs(state.player.x - npc.x) + Math.abs(state.player.y - npc.y);
    if (dist === 1) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('?', npcScreenX + TILE_SIZE / 2, npcScreenY - 2);
    }
  });

  // Enemies
  currentMap().enemies.forEach(enemy => {
    if (!enemy.alive) return;
    if (!isVisible(enemy.x, enemy.y)) return;
    const enemyScreenX = (enemy.x - state.camera.x) * TILE_SIZE;
    const enemyScreenY = (enemy.y - state.camera.y) * TILE_SIZE;
    if (enemyScreenX < -TILE_SIZE || enemyScreenX > canvas.width ||
        enemyScreenY < -TILE_SIZE || enemyScreenY > canvas.height) return;

    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.moveTo(enemyScreenX + TILE_SIZE / 2, enemyScreenY + 4);
    ctx.lineTo(enemyScreenX + TILE_SIZE - 4, enemyScreenY + TILE_SIZE / 2);
    ctx.lineTo(enemyScreenX + TILE_SIZE / 2, enemyScreenY + TILE_SIZE - 4);
    ctx.lineTo(enemyScreenX + 4, enemyScreenY + TILE_SIZE / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Items on the ground
  currentMap().items.forEach(item => {
    if (!isVisible(item.x, item.y)) return;
    const itemScreenX = (item.x - state.camera.x) * TILE_SIZE;
    const itemScreenY = (item.y - state.camera.y) * TILE_SIZE;
    if (itemScreenX < -TILE_SIZE || itemScreenX > canvas.width ||
        itemScreenY < -TILE_SIZE || itemScreenY > canvas.height) return;

    ctx.fillStyle = item.type.color;
    ctx.fillRect(itemScreenX + 10, itemScreenY + 8, 12, 16);
    ctx.fillRect(itemScreenX + 12, itemScreenY + 4, 8, 4);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(itemScreenX + 10, itemScreenY + 8, 12, 16);
    ctx.strokeRect(itemScreenX + 12, itemScreenY + 4, 8, 4);
  });

  ui.updateUI(state);
}

// --- Dialogue (keyword system) ---

let currentDialogue = null; // { npc, available: [keyword, ...] }

function getShopActions(npc) {
  if (!npc.shop) return [];

  if (npc.shop.type === 'store') {
    return npc.shop.items.map(item => ({
      label: `Buy ${item.name} — ${item.price}g`,
      action: { kind: 'buy', item },
      disabled: state.player.gold < item.price || state.player.inventory.length >= 12
    }));
  }

  if (npc.shop.type === 'healer') {
    const missing = state.player.maxHp - state.player.hp;
    const cost = missing * 2;
    return [{
      label: missing === 0 ? 'Heal — not needed' : `Heal full HP — ${cost}g`,
      action: { kind: 'heal' },
      disabled: missing === 0 || state.player.gold < cost
    }];
  }

  return [];
}

const dialogueHandlers = {
  onKeyword(kw) {
    const entry = currentDialogue.npc.keywords[kw];
    (entry.unlocks || []).forEach(unlocked => {
      if (!currentDialogue.available.includes(unlocked)) {
        currentDialogue.available.push(unlocked);
      }
    });
    renderCurrentDialogue(entry.text);
  },
  onShopAction(action) {
    if (action.kind === 'buy') {
      const { item } = action;
      if (state.player.gold < item.price || state.player.inventory.length >= 12) return;
      state.player.gold -= item.price;
      state.player.inventory.push(item.id);
      ui.addMessage(`🧪 Bought ${item.name} for ${item.price}g.`);
      ui.updateUI(state);
      renderCurrentDialogue(`${item.name}. Good choice. Anything else?`);
    } else if (action.kind === 'heal') {
      const missing = state.player.maxHp - state.player.hp;
      const cost = missing * 2;
      if (missing === 0 || state.player.gold < cost) return;
      state.player.gold -= cost;
      state.player.hp = state.player.maxHp;
      ui.addMessage(`💚 Healed to full for ${cost}g.`);
      ui.updateUI(state);
      renderCurrentDialogue('There. Good as new — or close enough, these days.');
    }
  },
  onGoodbye() {
    closeDialogue();
  }
};

function renderCurrentDialogue(text) {
  ui.renderDialogue(currentDialogue, text, getShopActions(currentDialogue.npc), dialogueHandlers);
}

function showDialogue(npc) {
  currentDialogue = {
    npc,
    available: Object.keys(npc.keywords).filter(kw => !npc.keywords[kw].locked)
  };
  renderCurrentDialogue(npc.greeting);
}

function closeDialogue() {
  currentDialogue = null;
  ui.hideDialoguePanel();
}

function getNearbyNPC() {
  return currentNPCs().find(npc => {
    const dist = Math.abs(state.player.x - npc.x) + Math.abs(state.player.y - npc.y);
    return dist === 1;
  });
}

// --- Death ---

function playerDefeated() {
  // Respawn in Cinderwick with partial HP, lose half gold
  state.mapStack = [{ mapId: 'overworld', x: 31, y: 25 }];
  state.currentMapId = 'cinderwick';
  const map = currentMap();
  state.player.x = map.spawn.x;
  state.player.y = map.spawn.y;
  state.player.hp = Math.max(1, Math.floor(state.player.maxHp / 2));
  state.player.gold = Math.floor(state.player.gold / 2);
  ui.addMessage('💀 You were defeated and dragged to safety in Cinderwick...');
  ui.addMessage(`🩸 Rescued with ${state.player.hp} HP. Lost half your gold.`);
  ui.clearCombatLog();
  draw();
}

// --- Movement ---

function movePlayer(dx, dy) {
  const map = currentMap();
  const newX = state.player.x + dx;
  const newY = state.player.y + dy;

  if (newX < 0 || newX >= map.width || newY < 0 || newY >= map.height) {
    ui.addMessage("You can't go that way.");
    return;
  }

  const tile = map.tiles[newY][newX];

  // Locked door: intercept before solid check
  if (tile === TILES.LOCKED_DOOR) {
    const keyIdx = state.player.inventory.indexOf('dungeon_key');
    if (keyIdx !== -1) {
      state.player.inventory.splice(keyIdx, 1);
      map.tiles[newY][newX] = TILES.FLOOR;
      ui.addMessage('🗝️ The door grinds open.');
      state.player.x = newX;
      state.player.y = newY;
      draw();
    } else {
      ui.addMessage('🔒 The door is locked. You need a key.');
    }
    return;
  }

  // Movement gating
  if (tile === TILES.WATER) {
    if (!state.player.hasRowboat) {
      ui.addMessage('The water is too deep. You need a boat.');
      return;
    }
  } else if (tile === TILES.MOUNTAIN) {
    if (!state.player.ashenBoots) {
      ui.addMessage('The mountains bar your path.');
      return;
    }
  } else if (tile.solid) {
    ui.addMessage('Blocked.');
    return;
  }

  const npc = currentNPCs().find(n => n.x === newX && n.y === newY);
  if (npc) {
    showDialogue(npc);
    return;
  }

  // Items on the ground
  const itemIndex = map.items.findIndex(i => i.x === newX && i.y === newY);
  if (itemIndex !== -1) {
    const item = map.items[itemIndex];
    if (state.player.inventory.length >= 12) {
      ui.addMessage('🎒 Your bag is full.');
    } else {
      state.player.inventory.push(item.type.id);
      map.items.splice(itemIndex, 1);
      ui.addMessage(`${item.type.icon} ${item.type.name} collected! (${state.player.inventory.length} in bag)`);
      ui.renderInventory(state, handleItemAction);
    }
  }

  // Bump combat — walk into enemy to attack, stay in place
  const enemy = map.enemies.find(e => e.alive && e.x === newX && e.y === newY);
  if (enemy) {
    playerAttackEnemy(state, enemy);
    draw();
    return;
  }

  if (currentDialogue) {
    closeDialogue();
  }

  // Map transitions (before moving player)
  if (tile === TILES.TOWN) {
    pushAndEnter('cinderwick', state.player.x, state.player.y + 1);
    ui.addMessage('You enter Cinderwick.');
    draw();
    return;
  }
  if (tile === TILES.EXIT || tile === TILES.STAIRS_UP) {
    popMap();
    const zoneName = currentMap().name;
    ui.addMessage(tile === TILES.EXIT ? 'You return to the overworld.' : `You ascend. ${zoneName}.`);
    draw();
    return;
  }
  if (tile === TILES.DUNGEON) {
    const dungeonId = getDungeonForTile(newX, newY);
    if (dungeonId) {
      pushAndEnter(dungeonId, newX, newY + 1);
      ui.addMessage('You descend into the darkness...');
      draw();
      return;
    }
    // Unimplemented dungeon — fall through to move there
  }
  if (tile === TILES.STAIRS_DOWN) {
    const nextId = DUNGEON_NEXT[state.currentMapId];
    if (nextId) {
      pushAndEnter(nextId, state.player.x, state.player.y);
      ui.addMessage('You descend deeper into the cavern...');
      draw();
    }
    return;
  }

  state.player.x = newX;
  state.player.y = newY;

  // Open chest on step
  const chest = currentMap().chests?.find(c => c.x === newX && c.y === newY && !c.open);
  if (chest) {
    chest.open = true;
    chest.loot.forEach(itemId => {
      if (state.player.inventory.length < 12) {
        state.player.inventory.push(itemId);
        ui.addMessage(`📦 You open the chest! Found: ${ITEMS[itemId].name}`);
      }
    });
    if (chest.loot.includes('ashen_boots')) {
      state.player.ashenBoots = true;
      ui.addMessage('🥾 Old warmth-magic in the soles. You can now cross mountain passes!');
    }
    ui.renderInventory(state, handleItemAction);
  }

  moveEnemies(state);

  // An enemy may have moved into your tile — surprise attack
  const encountered = map.enemies.find(e => e.alive && e.x === newX && e.y === newY);
  if (encountered) {
    ui.addMessage(`${encountered.name} attacks!`);
    enemyAttackPlayer(state, encountered, playerDefeated);
    playerAttackEnemy(state, encountered);
    draw();
    return;
  }

  if (tile === TILES.DUNGEON) {
    ui.addMessage('A dark entrance looms before you. You are not yet ready.');
  } else if (tile === TILES.FOREST) {
    ui.addMessage('The forest floor is cold and quiet.');
  } else if (tile === TILES.MARSH) {
    ui.addMessage('Your boots sink into the marsh.');
  } else if (tile === TILES.SCORCHED) {
    ui.addMessage('The ground here is burnt and lifeless.');
  } else if (tile === TILES.MOUNTAIN) {
    ui.addMessage('You cross the mountain pass.');
  } else if (tile !== TILES.PATH && tile !== TILES.GRASS) {
    ui.addMessage('You venture forth.');
  }

  draw();
}

// --- Inventory ---

function handleItemAction(slotIndex) {
  const msg = useItem(state.player, slotIndex);
  if (!msg) return;
  ui.addMessage(msg);
  ui.updateUI(state);
  ui.renderInventory(state, handleItemAction);
}

// --- Action button ---

function handleAction() {
  if (currentDialogue) {
    closeDialogue();
    return;
  }

  const npc = getNearbyNPC();
  if (npc) {
    showDialogue(npc);
  } else {
    ui.addMessage('Nothing to interact with here.');
  }
}

// --- Easter egg: Zhe's greeting ---

const ZHE_SEQUENCE = ['ArrowLeft', 'ArrowLeft', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ArrowUp', 'ArrowDown', 'a'];
let keyBuffer = [];

function checkZheEasterEgg(key) {
  keyBuffer.push(key);
  if (keyBuffer.length > ZHE_SEQUENCE.length) {
    keyBuffer.shift();
  }
  if (keyBuffer.join(',') === ZHE_SEQUENCE.join(',')) {
    ui.showZheMessage();
    keyBuffer = [];
  }
}

// --- Controls ---

function setupZoomPrevention() {
  // iOS Safari ignores user-scalable=no; block pinch and double-tap zoom directly
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    // Buttons handle rapid taps via touch-action: manipulation; don't eat their clicks
    if (e.target.closest('button, .inventory-slot')) return;
    const now = Date.now();
    if (now - lastTouchEnd < 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
}

function setupControls() {
  document.addEventListener('keydown', (e) => {
    if (!currentDialogue) {
      checkZheEasterEgg(e.key);
    }

    if (currentDialogue) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        closeDialogue();
      }
      e.preventDefault();
      return;
    }

    switch (e.key) {
      case 'ArrowUp': case 'w': movePlayer(0, -1); break;
      case 'ArrowDown': case 's': movePlayer(0, 1); break;
      case 'ArrowLeft': case 'a': movePlayer(-1, 0); break;
      case 'ArrowRight': case 'd': movePlayer(1, 0); break;
      case ' ': case 'Enter': handleAction(); break;
    }
  });

  // Mobile buttons — during dialogue they advance instead of move
  const dpad = [
    ['btn-up', 'ArrowUp', 0, -1],
    ['btn-down', 'ArrowDown', 0, 1],
    ['btn-left', 'ArrowLeft', -1, 0],
    ['btn-right', 'ArrowRight', 1, 0]
  ];
  dpad.forEach(([id, key, dx, dy]) => {
    document.getElementById(id).addEventListener('click', () => {
      if (currentDialogue) {
        closeDialogue();
      } else {
        checkZheEasterEgg(key);
        movePlayer(dx, dy);
      }
    });
  });

  document.getElementById('btn-action').addEventListener('click', () => {
    if (currentDialogue) {
      closeDialogue();
    } else {
      checkZheEasterEgg('a');
      handleAction();
    }
  });

  document.getElementById('btn-inventory').addEventListener('click', () => ui.openInventory(state, handleItemAction));

  document.getElementById('btn-close-inventory').addEventListener('click', ui.closeInventory);
}

// --- Init ---

function init() {
  const overworld = state.maps.overworld;
  overworld.enemies = spawnEnemies(overworld, NPCS_BY_MAP.overworld, state.player);

  const cavern1 = state.maps.cavern_1;
  cavern1.enemies = spawnEnemies(cavern1, [], state.player);

  const cavern2 = state.maps.cavern_2;
  cavern2.enemies = spawnEnemies(cavern2, [], state.player);
  cavern2.enemies.push({
    id: 99, x: 9, y: 12,
    hp: 20, maxHp: 20, damage: 3,
    name: 'Rootspawn', color: '#4a7a3a',
    exp: 100, gold: 50,
    alive: true, isBoss: true
  });

  setupZoomPrevention();
  setupControls();
  draw();
  ui.addMessage('The Hearthvein Valley. Cold, but warmer than beyond the peaks.');
  ui.addMessage('Cinderwick lies to the north.');
}

window.__emberfallDebug = { state, draw };

try {
  init();
  console.log('Game initialized successfully');
} catch (e) {
  console.error('Game initialization error:', e);
}
