// game.js — main loop, input, draw, map transitions
// Emberfall RPG (see DESIGN.md)

import { TILE_SIZE, TILES, createMaps, isSolid } from './world.js';
import { NPCS_BY_MAP } from './npcs.js';
import { createPlayer, useItem } from './player.js';
import { spawnEnemies, moveEnemies, playerAttackEnemy, enemyAttackPlayer } from './combat.js';
import * as ui from './ui.js';

const VERSION = '0.12.1';
console.log('Emberfall RPG v' + VERSION + ' loaded');

// Game state
const state = {
  player: createPlayer(),
  camera: { x: 0, y: 0 },
  maps: createMaps(),
  currentMapId: 'overworld',
  returnPos: null // overworld tile to return to when leaving a town/dungeon
};

function currentMap() {
  return state.maps[state.currentMapId];
}

function currentNPCs() {
  return NPCS_BY_MAP[state.currentMapId] || [];
}

// --- Map transitions ---

function enterMap(mapId, entryFrom) {
  state.returnPos = entryFrom;
  state.currentMapId = mapId;
  const map = currentMap();
  state.player.x = map.spawn.x;
  state.player.y = map.spawn.y;
  ui.addMessage(`You enter ${map.name}.`);
  draw();
}

function exitToOverworld() {
  state.currentMapId = 'overworld';
  if (state.returnPos) {
    state.player.x = state.returnPos.x;
    state.player.y = state.returnPos.y;
    state.returnPos = null;
  } else {
    const map = currentMap();
    state.player.x = map.spawn.x;
    state.player.y = map.spawn.y;
  }
  ui.addMessage('You return to the overworld.');
  draw();
}

// --- Drawing ---

function draw() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const map = currentMap();

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  // Fill canvas so no dead zone shows at world edges
  ctx.fillStyle = '#2d5a27';
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

        ctx.fillStyle = tile.color;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
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
  state.currentMapId = 'cinderwick';
  state.returnPos = { x: 16, y: 18 }; // just south of town on the overworld
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
  if (tile === TILES.WATER) {
    ui.addMessage('The water is too deep.');
    return;
  }
  if (tile.solid) {
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

  // Map transitions
  if (tile === TILES.TOWN) {
    enterMap('cinderwick', { x: state.player.x, y: state.player.y });
    return;
  }
  if (tile === TILES.EXIT) {
    exitToOverworld();
    return;
  }

  state.player.x = newX;
  state.player.y = newY;

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

  if (tile === TILES.CASTLE) {
    ui.addMessage("You see the king's castle.");
  } else if (tile === TILES.DUNGEON) {
    ui.addMessage('You enter the dark dungeon...');
  } else if (tile === TILES.PATH) {
    ui.addMessage('A dirt path.');
  } else {
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
  setupZoomPrevention();
  setupControls();
  draw();
  ui.addMessage('Welcome to Emberfall, adventurer!');
  ui.addMessage('Walk into enemies to attack them.');
  ui.addMessage('The town of Cinderwick lies at the center of the valley.');
}

window.__emberfallDebug = { state, draw };

try {
  init();
  console.log('Game initialized successfully');
} catch (e) {
  console.error('Game initialization error:', e);
}
