// ui.js — all DOM UI rendering: status bar, messages, combat log, inventory, dialogue

export function updateUI(state) {
  const player = state.player;
  document.getElementById('hp').textContent = `HP: ${player.hp}/${player.maxHp}`;
  document.getElementById('gold').textContent = `Gold: ${player.gold}`;
  document.getElementById('level').textContent = `LVL: ${player.level}`;
  document.getElementById('zone-name').textContent = state.maps[state.currentMapId].name;
}

export function addMessage(text) {
  const log = document.getElementById('message-log');
  const msg = document.createElement('div');
  msg.textContent = text;
  log.insertBefore(msg, log.firstChild);
  while (log.children.length > 5) {
    log.removeChild(log.lastChild);
  }
}

// --- Combat log (persistent, top of screen) ---

let combatMessages = [];

export function combatLog(msg, className = '') {
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

export function clearCombatLog() {
  combatMessages = [];
  updateCombatLogUI();
}

export function flashStatus(color) {
  const statusBar = document.getElementById('status-bar');
  if (statusBar) {
    statusBar.style.backgroundColor = color;
    setTimeout(() => {
      statusBar.style.backgroundColor = '';
    }, 100);
  }
}

// --- Dialogue panel (keyword system) ---

// dialogue: { npc, available: [keyword, ...] }
// handlers: { onKeyword(kw), onShopAction(action), onGoodbye() }
// shopActions: [{ label, action, disabled }] — rebuilt by caller each render
export function renderDialogue(dialogue, text, shopActions, handlers) {
  document.getElementById('dialogue-name').textContent = dialogue.npc.name;
  document.getElementById('dialogue-text').textContent = text;

  const row = document.getElementById('dialogue-keywords');
  row.innerHTML = '';

  dialogue.available.forEach(kw => {
    const btn = document.createElement('button');
    btn.className = 'keyword-btn';
    btn.textContent = kw;
    btn.addEventListener('click', () => handlers.onKeyword(kw));
    row.appendChild(btn);
  });

  shopActions.forEach(({ label, action, disabled }) => {
    const btn = document.createElement('button');
    btn.className = 'keyword-btn shop-btn';
    btn.textContent = label;
    btn.disabled = !!disabled;
    btn.addEventListener('click', () => handlers.onShopAction(action));
    row.appendChild(btn);
  });

  const bye = document.createElement('button');
  bye.className = 'keyword-btn goodbye-btn';
  bye.textContent = 'Goodbye';
  bye.addEventListener('click', () => handlers.onGoodbye());
  row.appendChild(bye);

  document.getElementById('dialogue-modal').classList.remove('hidden');
}

export function hideDialoguePanel() {
  document.getElementById('dialogue-modal').classList.add('hidden');
}

// --- Inventory panel ---

export function openInventory(state, onUsePotion) {
  document.getElementById('inventory-panel').classList.remove('hidden');
  renderInventory(state, onUsePotion);
}

export function closeInventory() {
  document.getElementById('inventory-panel').classList.add('hidden');
}

export function renderInventory(state, onUsePotion) {
  const grid = document.getElementById('inventory-grid');
  if (!grid) return;

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

  grid.querySelectorAll('.inventory-slot').forEach(slot => {
    slot.addEventListener('click', function () {
      const slotIndex = parseInt(this.getAttribute('data-slot'));
      if (slotIndex < potionCount) {
        onUsePotion();
      }
    });
  });
}

// --- Zhe easter egg ---

export function showZheMessage() {
  let overlay = document.getElementById('zhe-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'zhe-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.7); z-index: 1000; pointer-events: none;
    `;
    const msg = document.createElement('div');
    msg.textContent = "WHAT'S UP, ZHE?!";
    msg.style.cssText = `
      font-family: 'Arial Black', Arial, sans-serif;
      font-size: 48px; color: #ff00ff;
      text-shadow: 4px 4px 0px #00ffff; text-align: center;
      animation: pulse 0.5s infinite alternate;
    `;
    overlay.appendChild(msg);

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
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 3000);
}
