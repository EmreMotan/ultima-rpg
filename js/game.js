// Ultima RPG - With Combat System
// A simple tile-based RPG engine

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
  player: { x: 16, y: 16, hp: 20, maxHp: 20, gold: 0, level: 1, exp: 0 },
  camera: { x: 0, y: 0 },
  world: [],
  messages: [],
  dialogueIndex: 0,
  combatMode: false,
  combatEnemy: null,
  enemies: []
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

  updateUI();
}

function updateUI() {
  document.getElementById('hp').textContent = `HP: ${state.player.hp}/${state.player.maxHp}`;
  document.getElementById('gold').textContent = `Gold: ${state.player.gold}`;
  document.getElementById('level').textContent = `LVL: ${state.player.level}`;
}

let currentDialogueNPC = null;

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

// Combat system
let combatLog = [];

function startCombat(enemy) {
  state.combatMode = true;
  state.combatEnemy = enemy;
  combatLog = [`A ${enemy.name} attacks!`];

  showCombatModal(true);
  updateCombatUI();
}

function showCombatModal(show) {
  const modal = document.getElementById('combat-modal');
  if (modal) {
    modal.classList.toggle('hidden', !show);
  }
}

function updateCombatUI() {
  const combatModal = document.getElementById('combat-modal');
  if (!combatModal || combatModal.classList.contains('hidden')) return;

  const enemy = state.combatEnemy;
  if (!enemy) return;

  document.getElementById('combat-enemy-hp').textContent = `${enemy.name}: ${enemy.hp}/${enemy.maxHp} HP`;
  document.getElementById('combat-player-hp').textContent = `You: ${state.player.hp}/${state.player.maxHp} HP`;
  document.getElementById('combat-log').innerHTML = combatLog.join('<br>');
}

function combatAttack() {
  if (!state.combatMode || !state.combatEnemy) return;

  const enemy = state.combatEnemy;
  const playerDmg = 2 + Math.floor(Math.random() * 3); // 2-4 damage
  enemy.hp -= playerDmg;
  combatLog.push(`You hit for ${playerDmg} damage!`);

  if (enemy.hp <= 0) {
    // Victory!
    enemy.alive = false;
    const exp = enemy.exp;
    const gold = enemy.gold;

    state.player.exp += exp;
    state.player.gold += gold;
    combatLog.push(`Victory! +${exp} EXP, +${gold} Gold`);

    // Level up check
    if (state.player.exp >= state.player.level * 50) {
      state.player.level++;
      state.player.maxHp += 5;
      state.player.hp = state.player.maxHp;
      state.player.exp = 0;
      combatLog.push(`🎉 LEVEL UP! You are now level ${state.player.level}!`);
    }

    combatLog.push('Combat ended.');
    setTimeout(endCombat, 2000);
  } else {
    // Enemy attacks back
    const enemyDmg = enemy.damage + Math.floor(Math.random() * 2) - 1;
    state.player.hp -= enemyDmg;
    combatLog.push(`${enemy.name} hits you for ${enemyDmg} damage!`);

    if (state.player.hp <= 0) {
      combatLog.push('💀 You have been defeated!');
      setTimeout(() => {
        playerDefeated();
        endCombat();
      }, 2000);
    }
  }

  updateCombatUI();
}

function endCombat() {
  state.combatMode = false;
  state.combatEnemy = null;
  showCombatModal(false);
  draw();
}

function playerDefeated() {
  // Respawn at castle with partial HP
  state.player.x = 6;
  state.player.y = 6;
  state.player.hp = Math.max(1, Math.floor(state.player.maxHp / 2));
  state.player.gold = Math.floor(state.player.gold / 2);
  addMessage("You were defeated and dragged to safety...");
  addMessage(`Rescued with ${state.player.hp} HP. Lost some gold.`);
}

function addCombatHTML() {
  // Combat modal is in index.html, styles in CSS
}

function movePlayer(dx, dy) {
  if (state.combatMode) {
    // Flee from combat (costs 1 HP)
    if (Math.random() > 0.3) {
      state.player.hp -= 1;
      addMessage("You fled from combat! Lost 1 HP.");
      endCombat();
    } else {
      addMessage("Couldn't escape!");
    }
    return;
  }

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
    addMessage(`${npc.name} is in your way.`);
    return;
  }

  // Check for enemy encounter
  const enemy = state.enemies.find(e => e.alive && e.x === newX && e.y === newY);
  if (enemy) {
    startCombat(enemy);
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

  // Check for enemy encounter after movement
  const encountered = state.enemies.find(e => e.alive && e.x === newX && e.y === newY);
  if (encountered) {
    startCombat(encountered);
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
    if (currentDialogueNPC || state.combatMode) {
      if (state.combatMode) {
        combatAttack();
      } else {
        advanceDialogue();
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

  document.getElementById('btn-up').addEventListener('click', () => movePlayer(0, -1));
  document.getElementById('btn-down').addEventListener('click', () => movePlayer(0, 1));
  document.getElementById('btn-left').addEventListener('click', () => movePlayer(-1, 0));
  document.getElementById('btn-right').addEventListener('click', () => movePlayer(1, 0));
  document.getElementById('btn-action').addEventListener('click', handleAction);
}

function handleAction() {
  if (currentDialogueNPC) {
    advanceDialogue();
    return;
  }

  if (state.combatMode) {
    combatAttack();
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
  addCombatHTML();
  setupControls();
  draw();
  addMessage("Welcome, adventurer! Watch for enemies (diamonds).");
  addMessage("Press A near them to FIGHT or walk into them!");
}

init();
