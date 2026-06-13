// player.js — player state, inventory, equipment, items

// Item registry. kind: 'consumable' | 'weapon' | 'armor'
// bonus: attack bonus for weapons, DEF bonus for armor
export const ITEMS = {
  potion: { id: 'potion', kind: 'consumable', name: 'Health Potion', icon: '🧪', color: '#00ff00', heal: 10 },
  rusty_dagger: { id: 'rusty_dagger', kind: 'weapon', name: 'Rusty Dagger', icon: '🗡️', bonus: 0 },
  short_sword: { id: 'short_sword', kind: 'weapon', name: 'Short Sword', icon: '⚔️', bonus: 2 },
  broadsword: { id: 'broadsword', kind: 'weapon', name: 'Broadsword', icon: '⚔️', bonus: 4 },
  ember_blade: { id: 'ember_blade', kind: 'weapon', name: 'Ember Blade', icon: '🔥', bonus: 7 },
  leather_vest: { id: 'leather_vest', kind: 'armor', name: 'Leather Vest', icon: '🦺', bonus: 1 },
  chainmail: { id: 'chainmail', kind: 'armor', name: 'Chainmail', icon: '🛡️', bonus: 2 },
  ashen_plate: { id: 'ashen_plate', kind: 'armor', name: 'Ashen Plate', icon: '🛡️', bonus: 4 }
};

export function createPlayer() {
  return {
    x: 31,
    y: 32,
    hp: 20,
    maxHp: 20,
    str: 1,
    def: 0,
    gold: 0,
    level: 1,
    exp: 0,
    weapon: 'rusty_dagger',
    armor: null,
    inventory: [],
    ashenBoots: false,  // cross mountains — granted by Cavern of Roots
    hasRowboat: false   // cross water — granted by Greyhollow ferryman
  };
}

export function weaponBonus(player) {
  return player.weapon ? ITEMS[player.weapon].bonus : 0;
}

export function totalDef(player) {
  return player.def + (player.armor ? ITEMS[player.armor].bonus : 0);
}

// Use/equip the inventory item at index. Returns a message, or null if no-op.
export function useItem(player, index) {
  const id = player.inventory[index];
  if (!id) return null;
  const item = ITEMS[id];

  if (item.kind === 'consumable') {
    const oldHp = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + item.heal);
    const healed = player.hp - oldHp;
    if (healed === 0) return 'Already at full health.';
    player.inventory.splice(index, 1);
    return `🧪 Used ${item.name}: +${healed} HP`;
  }

  if (item.kind === 'weapon' || item.kind === 'armor') {
    const slot = item.kind;
    const previous = player[slot];
    player.inventory.splice(index, 1);
    if (previous) player.inventory.push(previous);
    player[slot] = id;
    return `${item.icon} Equipped ${item.name}.`;
  }

  return null;
}
