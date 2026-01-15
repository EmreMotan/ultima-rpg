// Ultima RPG - Grey Box Prototype
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
  VILLAGE:{ id: 7, color: '#8a6a4a', name: 'village' }
};

// Game state
const state = {
  player: { x: 16, y: 16, hp: 10, maxHp: 10, gold: 0, level: 1 },
  camera: { x: 0, y: 0 },
  world: [],
  messages: [],
  dialogueIndex: 0
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
      "May the light guide your path."
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
      // Simple terrain generation
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
      // Random trees
      else if (Math.random() < 0.05) {
        tile = TILES.TREE;
      }
      // Paths connecting places
      else if ((x === 6 && y >= 8 && y <= 14) || (y === 16 && x >= 8 && x <= 14)) {
        tile = TILES.PATH;
      }

      row.push(tile);
    }
    world.push(row);
  }
  return world;
}

// Draw the game
function draw() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  // Resize canvas to fit
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const tilesX = Math.ceil(canvas.width / TILE_SIZE);
  const tilesY = Math.ceil(canvas.height / TILE_SIZE);

  // Center camera on player
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

        // Add subtle border
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
  ctx.arc(
    playerScreenX + TILE_SIZE / 2,
    playerScreenY + TILE_SIZE / 2,
    TILE_SIZE / 3,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Draw player border
  ctx.strokeStyle = '#ff0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineWidth = 1;

  // Draw NPCs
  NPCs.forEach(npc => {
    const npcScreenX = (npc.x - state.camera.x) * TILE_SIZE;
    const npcScreenY = (npc.y - state.camera.y) * TILE_SIZE;

    // Check if NPC is on screen
    if (npcScreenX < -TILE_SIZE || npcScreenX > canvas.width ||
        npcScreenY < -TILE_SIZE || npcScreenY > canvas.height) {
      return;
    }

    // NPC body (square with rounded corners look)
    ctx.fillStyle = npc.color;
    ctx.fillRect(npcScreenX + 6, npcScreenY + 4, 20, 24);

    // NPC border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(npcScreenX + 6, npcScreenY + 4, 20, 24);

    // Question mark if player is adjacent
    const dist = Math.abs(state.player.x - npc.x) + Math.abs(state.player.y - npc.y);
    if (dist === 1) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('?', npcScreenX + TILE_SIZE / 2, npcScreenY - 2);
    }
  });

  // Update UI
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
    // End dialogue
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

  // Keep only last 5 messages
  while (log.children.length > 5) {
    log.removeChild(log.lastChild);
  }
}

function movePlayer(dx, dy) {
  const newX = state.player.x + dx;
  const newY = state.player.y + dy;

  // Bounds check
  if (newX < 0 || newX >= WORLD_WIDTH || newY < 0 || newY >= WORLD_HEIGHT) {
    addMessage("You can't go that way.");
    return;
  }

  // Collision check
  const tile = state.world[newY][newX];
  if (tile === TILES.WATER) {
    addMessage("The water is too deep.");
    return;
  }
  if (tile === TILES.WALL || tile === TILES.TREE) {
    addMessage("Blocked.");
    return;
  }

  // Close dialogue if open
  if (currentDialogueNPC) {
    currentDialogueNPC = null;
    document.getElementById('dialogue-modal').classList.add('hidden');
  }

  // Move
  state.player.x = newX;
  state.player.y = newY;

  // Messages for special tiles
  if (tile === TILES.CASTLE) {
    addMessage("You see Lord British's castle.");
  } else if (tile === TILES.VILLAGE) {
    addMessage("A peaceful village.");
  } else if (tile === TILES.PATH) {
    addMessage("A dirt path.");
  } else {
    addMessage("You venture forth.");
  }

  draw();
}

// Input handlers
function setupControls() {
  // Keyboard
  document.addEventListener('keydown', (e) => {
    // If dialogue is open, any key advances it
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

  // Touch buttons
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

  const npc = getNearbyNPC();
  if (npc) {
    showDialogue(npc);
  } else {
    addMessage("Nothing to interact with here.");
  }
}

// Initialize
function init() {
  state.world = generateWorld();
  setupControls();
  draw();
  addMessage("Welcome to the realm, adventurer!");
  addMessage("Use arrow keys or buttons to move.");
}

init();
