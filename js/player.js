// player.js — player state, inventory, items

export const ITEMS = {
  POTION: { id: 'potion', name: 'Potion', color: '#00ff00', heal: 5 }
};

export function createPlayer() {
  return {
    x: 16,
    y: 19,
    hp: 20,
    maxHp: 20,
    gold: 0,
    level: 1,
    exp: 0,
    inventory: []
  };
}

// Returns actual HP healed, or -1 if no potion in inventory
export function usePotion(player) {
  const potionIndex = player.inventory.indexOf('potion');
  if (potionIndex === -1) return -1;

  player.inventory.splice(potionIndex, 1);
  const oldHp = player.hp;
  player.hp = Math.min(player.maxHp, player.hp + ITEMS.POTION.heal);
  return player.hp - oldHp;
}
