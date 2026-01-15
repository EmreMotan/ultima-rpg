// Ultima RPG - With Combat System
// A simple tile-based RPG engine
// Version: 0.8.11

const VERSION = '0.8.11';
console.log('Ultima RPG v' + VERSION + ' loaded');
const TILE_SIZE = 32;
const WORLD_WIDTH = 32;
const WORLD_HEIGHT = 32;

// Grey box tile colors
const TILES = {
  GRASS:  { id: 0, color: '#2d5a27', name: 'grass' },
  WATER:  { id: 1, color: '#3a7bd5', name: 'water' },
  WALL:   { id: 2, color: '#4a4a4a', name: 'wall' },
  FLOOR:  { id: 3, color: '#5a5a5a', name: 'floor' },
  TREE:   { id: 4, color: '#1a3a17', name: 'tree' },
  PATH:   { id: 5, color: '#8b7355', name: 'path' },
  CASTLE: { id: 6, color: '#6a4a8a', name: 'castle' },
  VILLAGE:{ id: 7, color: '#8a6a4a', name: 'village' },
  DUNGEON:{ id: 8, color: '#2a2a2a', name: 'dungeon' }
};

// Enemy types
const ENEMY_TYPES = {
  SLIME: { name: "Slime", hp: 3, damage: 1, color: "#00ff00", exp: 5, gold: 2 },
  SKELETON: { name: "Skeleton", hp: 5, damage: 2, color: "#cccccc", exp: 10, gold: 5 },
  ORC: { name: "Orc", hp: 8, damage: 3, color: "#8b4513", exp: 20, gold: 10 },
  MAGE: { name: "Dark Mage", hp: 6, damage: 4, color: "#9932cc", exp: 25, gold: 15 }
};

// Game state
const state = {
  player: { x: 16, y: 16, hp: 20, maxHp: 20, gold: 0, level: 1, exp: 0, inventory: [] },
  camera: { x: 0, y: 0 },
  world: [],
  messages: [],
  dialogueIndex: 0,
  enemies: [],
  items: [] // Potions on the ground
};

// Item types
const ITEMS = {
  POTION: { id: 'potion', name: 'Potion', color: '#00ff00', heal: 5 }
};

// NPCs
const NPCs = [
  {
    name: "Elder",
    x: 16,
    y: 14,
    color: "#ff6b6b",
    dialogues: [
      "Welcome, traveler! I am the village elder.",
      "Many adventures await you in these lands.",
      "Lord British needs brave souls to help him.",
      "May the light guide your path.",
      "Beware the dungeons to the south!"
    ]
  },
  {
    name: "Guard",
    x: 6,
    y: 6,
    color: "#4ecdc4",
    dialogues: [
      "Halt! Who goes there?",
      "The castle is private property.",
      "Lord British is within, but he is busy.",
      "Stay out of trouble, traveler."
    ]
  },
  {
    name: "Trader",
    x: 16,
    y: 18,
    color: "#ffd93d",
    dialogues: [
      "Fine goods for sale! ...Just kidding, I'm broke too.",
      "Gold is hard to come by these days.",
      "I've heard of treasures in the dungeons to the south.",
      "Safe travels, friend."
    ]
  }
];

// Generate simple world
function generateWorld() {
  const world = [];
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < WORLD_WIDTH; x++) {
      let tile = TILES.GRASS;

      // Water around edges
      if (x < 2 || x >= WORLD_WIDTH - 2 || y < 2 || y >= WORLD_HEIGHT - 2) {
        tile = TILES.WATER;
      }
      // Castle in top-left
      else if (x >= 4 && x <= 8 && y >= 4 && y <= 8) {
        tile = TILES.CASTLE;
      }
      // Village in center
      else if (x >= 14 && x <= 18 && y >= 14 && y <= 18) {
        tile = TILES.VILLAGE;
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
    world.push(row);
  }
  return world;
}

// Spawn enemies
function spawnEnemies() {
  const enemies = [];
  const types = Object.keys(ENEMY_TYPES);

  // Spawn 5-8 enemies in the world
  const count = 5 + Math.floor(Math.random() * 4);

  for (let i = 0; i < count; i++) {
    let x, y, valid;
    do {
      x = 4 + Math.floor(Math.random() * (WORLD_WIDTH - 8));
      y = 4 + Math.floor(Math.random() * (WORLD_HEIGHT - 8));
      valid = true;

      // Don't spawn on special tiles
      const tile = state.world[y][x];
      if (tile === TILES.WATER || tile === TILES.CASTLE || tile === TILES.VILLAGE) {
        valid = false;
      }

      // Don't spawn on NPCs
      if (NPCs.some(n => n.x === x && n.y === y)) valid = false;

      // Don't spawn too close to player
      if (Math.abs(x - state.player.x) < 5 && Math.abs(y - state.player.y) < 5) {
        valid = false;
      }
    } while (!valid);

    const typeKey = types[Math.floor(Math.random() * types.length)];
    const type = ENEMY_TYPES[typeKey];

    enemies.push({
      id: i,
      x: x,
      y: y,
      hp: type.hp,
      maxHp: type.hp,
      damage: type.damage,
      name: type.name,
      color: type.color,
      exp: type.exp,
      gold: type.gold,
      alive: true
    });
  }
  return enemies;
}

// Move enemies
function moveEnemies() {
  if (state.combatMode) return;

  state.enemies.forEach(enemy => {
    if (!enemy.alive) return;

    // 30% chance to move each turn
    if (Math.random() > 0.3) return;

    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const newX = enemy.x + dir[0];
    const newY = enemy.y + dir[1];

    // Check bounds
    if (newX < 0 || newX >= WORLD_WIDTH || newY < 0 || newY >= WORLD_HEIGHT) return;

    // Check terrain
    const tile = state.world[newY][newX];
    if (tile === TILES.WATER || tile === TILES.WALL || tile === TILES.TREE ||
        tile === TILES.CASTLE || tile === TILES.VILLAGE) return;

    // Don't collide with other enemies
    if (state.enemies.some(e => e.alive && e.id !== enemy.id && e.x === newX && e.y === newY)) return;

    // Don't move into player's tile
    if (newX === state.player.x && newY === state.player.y) return;

    enemy.x = newX;
    enemy.y = newY;
  });
}

// Draw the game
function draw() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const tilesX = Math.ceil(canvas.width / TILE_SIZE);
  const tilesY = Math.ceil(canvas.height / TILE_SIZE);

  state.camera.x = state.player.x - Math.floor(tilesX / 2);
  state.camera.y = state.player.y - Math.floor(tilesY / 2);

  // Draw tiles
  for (let dy = 0; dy < tilesY + 1; dy++) {
    for (let dx = 0; dx < tilesX + 1; dx++) {
      const worldX = state.camera.x + dx;
      const worldY = state.camera.y + dy;

      if (worldX >= 0 && worldX < WORLD_WIDTH && worldY >= 0 && worldY < WORLD_HEIGHT) {
        const tile = state.world[worldY][worldX];
        const px = dx * TILE_SIZE;
        const py = dy * TILE_SIZE;

        ctx.fillStyle = tile.color;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // Draw player
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

  // Draw NPCs
  NPCs.forEach(npc => {
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

  // Draw enemies
  state.enemies.forEach(enemy => {
    if (!enemy.alive) return;
    const enemyScreenX = (enemy.x - state.camera.x) * TILE_SIZE;
    const enemyScreenY = (enemy.y - state.camera.y) * TILE_SIZE;
    if (enemyScreenX < -TILE_SIZE || enemyScreenX > canvas.width ||
        enemyScreenY < -TILE_SIZE || enemyScreenY > canvas.height) return;

    // Enemy body (diamond shape)
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

  // Draw items on the ground
  state.items.forEach(item => {
    const itemScreenX = (item.x - state.camera.x) * TILE_SIZE;
    const itemScreenY = (item.y - state.camera.y) * TILE_SIZE;
    if (itemScreenX < -TILE_SIZE || itemScreenX > canvas.width ||
        itemScreenY < -TILE_SIZE || itemScreenY > canvas.height) return;

    // Potion bottle shape
    ctx.fillStyle = item.type.color;
    ctx.fillRect(itemScreenX + 10, itemScreenY + 8, 12, 16);
    ctx.fillRect(itemScreenX + 12, itemScreenY + 4, 8, 4);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(itemScreenX + 10, itemScreenY + 8, 12, 16);
    ctx.strokeRect(itemScreenX + 12, itemScreenY + 4, 8, 4);
  });

  updateUI();
}

function updateUI() {
  document.getElementById('hp').textContent = `HP: ${state.player.hp}/${state.player.maxHp}`;
  document.getElementById('gold').textContent = `Gold: ${state.player.gold}`;
  document.getElementById('level').textContent = `LVL: ${state.player.level}`;
}

let currentDialogueNPC = null;

// Easter egg: Zhe's greeting
const ZHE_SEQUENCE = ['ArrowLeft', 'ArrowLeft', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ArrowUp', 'ArrowDown', 'a'];
let keyBuffer = [];

function checkZheEasterEgg(key) {
  keyBuffer.push(key);
  
  // Keep buffer at most the sequence length
  if (keyBuffer.length > ZHE_SEQUENCE.length) {
    keyBuffer.shift();
  }
  
  // Check if buffer matches sequence
  const match = keyBuffer.join(',') === ZHE_SEQUENCE.join(',');
  
  if (match) {
    showZheMessage();
    keyBuffer = []; // Reset after triggering
  }
}

function showZheMessage() {
  // Create overlay if it doesn't exist
  let overlay = document.getElementById('zhe-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'zhe-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.7);
      z-index: 1000;
      pointer-events: none;
    `;
    const msg = document.createElement('div');
    msg.id = 'zhe-message';
    msg.textContent = "WHAT'S UP, ZHE?!";
    msg.style.cssText = `
      font-family: 'Arial Black', Arial, sans-serif;
      font-size: 48px;
      color: #ff00ff;
      text-shadow: 4px 4px 0px #00ffff;
      text-align: center;
      animation: pulse 0.5s infinite alternate;
    `;
    overlay.appendChild(msg);
    
    // Add animation style
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        from { transform: scale(1); }
        to { transform: scale(1.1); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(overlay);
  }
  
  overlay.style.display = 'flex';
  
  // Hide after 3 seconds
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 3000);
}

function showDialogue(npc) {
  currentDialogueNPC = npc;
  state.dialogueIndex = 0;
  const modal = document.getElementById('dialogue-modal');
  const nameEl = document.getElementById('dialogue-name');
  const textEl = document.getElementById('dialogue-text');

  nameEl.textContent = npc.name;
  textEl.textContent = npc.dialogues[0];
  modal.classList.remove('hidden');
}

function advanceDialogue() {
  if (!currentDialogueNPC) return;

  state.dialogueIndex++;
  const modal = document.getElementById('dialogue-modal');
  const textEl = document.getElementById('dialogue-text');

  if (state.dialogueIndex >= currentDialogueNPC.dialogues.length) {
    currentDialogueNPC = null;
    modal.classList.add('hidden');
    addMessage("Goodbye, traveler.");
  } else {
    textEl.textContent = currentDialogueNPC.dialogues[state.dialogueIndex];
  }
}

function getNearbyNPC() {
  return NPCs.find(npc => {
    const dist = Math.abs(state.player.x - npc.x) + Math.abs(state.player.y - npc.y);
    return dist === 1;
  });
}

function addMessage(text) {
  const log = document.getElementById('message-log');
  const msg = document.createElement('div');
  msg.textContent = text;
  log.insertBefore(msg, log.firstChild);
  while (log.children.length > 5) {
    log.removeChild(log.lastChild);
  }
}

// Combat log - visible at top of screen
let combatMessages = [];

function combatLog(msg, className = '') {
  combatMessages.unshift({ text: msg, class: className });
  while (combatMessages.length > 6) {
    combatMessages.pop();
  }
  updateCombatLogUI();
}

function updateCombatLogUI() {
  const logEl = document.getElementById('combat-log');
  if (combatMessages.length > 0) {
    logEl.classList.remove('hidden');
    logEl.innerHTML = combatMessages.map(m => `<div class="${m.class}">${m.text}</div>`).join('');
  } else {
    logEl.classList.add('hidden');
  }
}

function clearCombatLog() {
  combatMessages = [];
  updateCombatLogUI();
}

function isInCombat() {
  // Check if player is adjacent to any alive enemy
  return state.enemies.some(e => e.alive && Math.abs(state.player.x - e.x) + Math.abs(state.player.y - e.y) <= 1);
}

// Bump combat system
function playerAttackEnemy(enemy) {
  const playerDmg = 2 + Math.floor(Math.random() * 3); // 2-4 damage
  enemy.hp -= playerDmg;
  const msg = `You hit ${enemy.name} for ${playerDmg} damage!`;
  addMessage(`⚔️ ${msg}`);
  combatLog(msg, 'player-hit');

  if (enemy.hp <= 0) {
    enemy.alive = false;
    const exp = enemy.exp;
    const gold = enemy.gold;
    state.player.exp += exp;
    state.player.gold += gold;
    const winMsg = `Victory! +${exp} EXP, +${gold} Gold`;
    addMessage(`💀 ${winMsg}`);
    combatLog(winMsg, 'victory');

    // Chance to drop potion (50%)
    if (Math.random() < 0.5) {
      state.items.push({
        x: enemy.x,
        y: enemy.y,
        type: ITEMS.POTION
      });
      addMessage(`🧪 A potion was dropped!`);
    }

    // Level up check
    if (state.player.exp >= state.player.level * 50) {
      state.player.level++;
      state.player.maxHp += 5;
      state.player.hp = state.player.maxHp;
      state.player.exp = 0;
      const levelMsg = `LEVEL UP! You are now level ${state.player.level}!`;
      addMessage(`🎉 ${levelMsg}`);
      combatLog(levelMsg, 'levelup');
    }
    draw();
    clearTimeout(window.deathTimeout);
    return true; // Enemy died
  }
  return false; // Enemy still alive
}

function enemyAttackPlayer(enemy) {
  const enemyDmg = enemy.damage + Math.floor(Math.random() * 2) - 1;
  state.player.hp -= enemyDmg;
  const msg = `${enemy.name} hits you for ${enemyDmg} damage!`;
  addMessage(`🩸 ${msg}`);
  combatLog(msg, 'enemy-hit');

  if (state.player.hp <= 0) {
    state.player.hp = 0;
    const deathMsg = "You have been defeated!";
    addMessage(`💀 ${deathMsg}`);
    combatLog(deathMsg, 'death');
    updateUI();
    window.deathTimeout = setTimeout(() => {
      playerDefeated();
      clearCombatLog();
      draw();
    }, 2000);
    return true; // Player died
  }
  return false; // Player still alive
}

function flashStatus(color) {
  const statusBar = document.getElementById('status-bar');
  if (statusBar) {
    statusBar.style.backgroundColor = color;
    setTimeout(() => {
      statusBar.style.backgroundColor = '';
    }, 100);
  }
}

function playerDefeated() {
  // Respawn at castle with partial HP
  state.player.x = 6;
  state.player.y = 6;
  state.player.hp = Math.max(1, Math.floor(state.player.maxHp / 2));
  state.player.gold = Math.floor(state.player.gold / 2);
  addMessage("💀 You were defeated and dragged to safety...");
  addMessage(`🩸 Rescued with ${state.player.hp} HP. Lost half your gold.`);
  clearCombatLog();
}

function movePlayer(dx, dy) {
  const newX = state.player.x + dx;
  const newY = state.player.y + dy;

  if (newX < 0 || newX >= WORLD_WIDTH || newY < 0 || newY >= WORLD_HEIGHT) {
    addMessage("You can't go that way.");
    return;
  }

  const tile = state.world[newY][newX];
  if (tile === TILES.WATER) {
    addMessage("The water is too deep.");
    return;
  }
  if (tile === TILES.WALL || tile === TILES.TREE) {
    addMessage("Blocked.");
    return;
  }

  const npc = NPCs.find(n => n.x === newX && n.y === newY);
  if (npc) {
    // Bump into NPC to talk
    showDialogue(npc);
    return;
  }

  // Check for items on the ground
  const itemIndex = state.items.findIndex(i => i.x === newX && i.y === newY);
  if (itemIndex !== -1) {
    const item = state.items[itemIndex];
    if (item.type.id === 'potion') {
      state.player.inventory.push('potion');
      state.items.splice(itemIndex, 1);
      addMessage(`🧪 Potion collected! (${state.player.inventory.length} in bag)`);
      renderInventory();
    }
  }

  // Bump combat - walk into enemy to attack
  const enemy = state.enemies.find(e => e.alive && e.x === newX && e.y === newY);
  if (enemy) {
    // Attack the enemy, but stay in place
    playerAttackEnemy(enemy);
    // Don't move into the enemy's tile
    draw();
    return;
  }

  if (currentDialogueNPC) {
    currentDialogueNPC = null;
    document.getElementById('dialogue-modal').classList.add('hidden');
  }

  state.player.x = newX;
  state.player.y = newY;

  // Move enemies after player moves
  moveEnemies();

  // Check if an enemy moved into your space (you were already there)
  const encountered = state.enemies.find(e => e.alive && e.x === newX && e.y === newY);
  if (encountered) {
    // Enemy moved into YOUR space - they attack first (surprise!)
    addMessage(`${encountered.name} attacks!`);
    enemyAttackPlayer(encountered);
    // You can counter-attack back!
    playerAttackEnemy(encountered);
    draw();
    return;
  }

  if (tile === TILES.CASTLE) {
    addMessage("You see Lord British's castle.");
  } else if (tile === TILES.VILLAGE) {
    addMessage("A peaceful village.");
  } else if (tile === TILES.DUNGEON) {
    addMessage("You enter the dark dungeon...");
  } else if (tile === TILES.PATH) {
    addMessage("A dirt path.");
  } else {
    addMessage("You venture forth.");
  }

  draw();
}

function setupControls() {
  document.addEventListener('keydown', (e) => {
    // Check for Zhe easter egg (only during gameplay, not dialogue)
    if (!currentDialogueNPC) {
      checkZheEasterEgg(e.key);
    }
    
    if (currentDialogueNPC) {
      advanceDialogue();
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

  // Mobile buttons - during dialogue, they advance instead of move
  document.getElementById('btn-up').addEventListener('click', function() {
    if (currentDialogueNPC) {
      advanceDialogue();
    } else {
      checkZheEasterEgg('ArrowUp');
      movePlayer(0, -1);
    }
  });

  document.getElementById('btn-down').addEventListener('click', function() {
    if (currentDialogueNPC) {
      advanceDialogue();
    } else {
      checkZheEasterEgg('ArrowDown');
      movePlayer(0, 1);
    }
  });

  document.getElementById('btn-left').addEventListener('click', function() {
    if (currentDialogueNPC) {
      advanceDialogue();
    } else {
      checkZheEasterEgg('ArrowLeft');
      movePlayer(-1, 0);
    }
  });

  document.getElementById('btn-right').addEventListener('click', function() {
    if (currentDialogueNPC) {
      advanceDialogue();
    } else {
      checkZheEasterEgg('ArrowRight');
      movePlayer(1, 0);
    }
  });

  document.getElementById('btn-action').addEventListener('click', function() {
    if (currentDialogueNPC) {
      advanceDialogue();
    } else {
      checkZheEasterEgg('a');
      handleAction();
    }
  });

  document.getElementById('btn-action').addEventListener('click', handleAction);

  // Inventory button - add both touch and click handlers
  const invBtn = document.getElementById('btn-inventory');
  if (invBtn) {
    invBtn.addEventListener('click', openInventory);
    invBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      console.log('Inventory button touch detected');
      openInventory();
    });
    console.log('Inventory button handlers attached');
  } else {
    console.log('ERROR: btn-inventory element not found!');
  }

  document.getElementById('btn-close-inventory').addEventListener('click', closeInventory);
}

function openInventory() {
  console.log('openInventory called');
  const panel = document.getElementById('inventory-panel');
  console.log('panel element:', panel);
  if (panel) {
    panel.classList.remove('hidden');
    console.log('Panel should be visible now');
  }
  renderInventory();
  addMessage("📦 Inventory opened");
}

function closeInventory() {
  console.log('Closing inventory...');
  document.getElementById('inventory-panel').classList.add('hidden');
  addMessage("📦 Inventory closed");
}

function renderInventory() {
  console.log('renderInventory called');
  const grid = document.getElementById('inventory-grid');
  console.log('grid element:', grid);
  if (!grid) {
    console.log('Grid not found!');
    return;
  }

  const potionCount = state.player.inventory.filter(i => i === 'potion').length;
  let html = '';

  for (let i = 0; i < 12; i++) {
    if (i < potionCount) {
      html += `<div class="inventory-slot has-item" data-slot="${i}">🧪</div>`;
    } else {
      html += `<div class="inventory-slot" data-slot="${i}"></div>`;
    }
  }
  grid.innerHTML = html;

  // Add click handlers to all slots
  grid.querySelectorAll('.inventory-slot').forEach(slot => {
    slot.addEventListener('click', function() {
      const slotIndex = parseInt(this.getAttribute('data-slot'));
      if (slotIndex < potionCount) {
        usePotion();
      }
    });
  });
}

function usePotion() {
  const potionIndex = state.player.inventory.indexOf('potion');
  if (potionIndex === -1) return;

  state.player.inventory.splice(potionIndex, 1);
  const healAmount = ITEMS.POTION.heal;
  const oldHp = state.player.hp;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + healAmount);
  const actualHeal = state.player.hp - oldHp;

  addMessage(`🧪 Used potion: +${actualHeal} HP`);
  updateUI();
  renderInventory();
}

function handleAction() {
  if (currentDialogueNPC) {
    advanceDialogue();
    return;
  }

  const npc = getNearbyNPC();
  if (npc) {
    showDialogue(npc);
  } else {
    addMessage("Nothing to interact with here.");
  }
}

function init() {
  state.world = generateWorld();
  state.enemies = spawnEnemies();
  setupControls();
  draw();
  addMessage("Welcome, adventurer!");
  addMessage("Walk into enemies to attack them.");
  addMessage("You died? Respawn at castle, lose half gold.");
}

try {
  init();
  console.log('Game initialized successfully');
} catch(e) {
  console.error('Game initialization error:', e);
}
