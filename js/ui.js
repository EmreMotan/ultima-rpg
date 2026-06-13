// ui.js — all DOM UI rendering: status bar, messages, combat log, inventory, dialogue

import { ITEMS } from './player.js';

export function updateUI(state) {
  const p = state.player;
  document.getElementById('stat-hp').textContent = `${p.hp}/${p.maxHp}`;
  document.getElementById('stat-weapon').textContent = p.weapon ? ITEMS[p.weapon].name : '—';
  document.getElementById('stat-armor').textContent = p.armor ? ITEMS[p.armor].name : '—';
  document.getElementById('stat-gold').textContent = p.gold;
  document.getElementById('stat-level').textContent = p.level;
  document.getElementById('zone-name').textContent = state.maps[state.currentMapId].name;
}

export function addMessage(text) {
  const log = document.getElementById('message-log');
  const first = log.firstChild;

  // Collapse consecutive identical messages into a count
  if (first && first.dataset.msg === text) {
    const count = (parseInt(first.dataset.count) || 1) + 1;
    first.dataset.count = count;
    first.textContent = `${text} ×${count}`;
    return;
  }

  const msg = document.createElement('div');
  msg.textContent = text;
  msg.dataset.msg = text;
  log.insertBefore(msg, first);
  while (log.children.length > 5) {
    log.removeChild(log.lastChild);
  }
}

// Combat messages go through addMessage — no separate combat log element.
export function combatLog(msg) {
  addMessage(msg);
}

export function clearCombatLog() {
  // no-op: messages persist in the log panel
}

export function flashStatus() {
  // reserved for future screen-edge flash effect
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

export function openInventory(state, onItemAction) {
  document.getElementById('inventory-panel').classList.remove('hidden');
  renderInventory(state, onItemAction);
}

export function closeInventory() {
  document.getElementById('inventory-panel').classList.add('hidden');
}

let selectedSlot = null;

// Tap a slot to select it, then the hint area shows a Use/Equip button.
export function renderInventory(state, onItemAction) {
  const grid = document.getElementById('inventory-grid');
  const hint = document.getElementById('inventory-hint');
  if (!grid) return;

  const inv = state.player.inventory;
  if (selectedSlot !== null && selectedSlot >= inv.length) selectedSlot = null;

  let html = '';
  for (let i = 0; i < 12; i++) {
    const id = inv[i];
    const item = id ? ITEMS[id] : null;
    const classes = ['inventory-slot'];
    if (item) classes.push('has-item');
    if (i === selectedSlot) classes.push('selected');
    html += `<div class="${classes.join(' ')}" data-slot="${i}">${item ? item.icon : ''}</div>`;
  }
  grid.innerHTML = html;

  grid.querySelectorAll('.inventory-slot').forEach(slot => {
    slot.addEventListener('click', function () {
      const slotIndex = parseInt(this.getAttribute('data-slot'));
      if (slotIndex < inv.length) {
        selectedSlot = slotIndex === selectedSlot ? null : slotIndex;
        renderInventory(state, onItemAction);
      }
    });
  });

  if (selectedSlot !== null && inv[selectedSlot]) {
    const item = ITEMS[inv[selectedSlot]];
    const verb = item.kind === 'consumable' ? 'Use' : 'Equip';
    const slotIndex = selectedSlot;
    hint.innerHTML = '';
    const btn = document.createElement('button');
    btn.id = 'btn-item-action';
    btn.textContent = `${verb} ${item.name}`;
    btn.addEventListener('click', () => {
      selectedSlot = null;
      onItemAction(slotIndex);
    });
    hint.appendChild(btn);
  } else {
    hint.textContent = 'Select an item';
  }
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
