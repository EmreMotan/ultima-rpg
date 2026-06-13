// combat.js — bump combat, enemy spawning and AI

import { TILES, isSolid } from './world.js';
import { ITEMS, weaponBonus, totalDef } from './player.js';
import { addMessage, combatLog, clearCombatLog, updateUI } from './ui.js';

export const ENEMY_TYPES = {
  // Hearthvein Valley
  CINDER_SLIME: { name: 'Cinder Slime', hp: 3,  damage: 1, color: '#ff6600', exp: 5,  gold: 2  },
  ASH_WOLF:     { name: 'Ash Wolf',     hp: 5,  damage: 2, color: '#9a9a9a', exp: 8,  gold: 3  },
  // Ashwood Forest
  BANDIT:       { name: 'Bandit',       hp: 6,  damage: 2, color: '#8b4513', exp: 12, gold: 8  },
  SHADOW_FOX:   { name: 'Shadow Fox',   hp: 4,  damage: 2, color: '#5a3a7a', exp: 10, gold: 4  },
  // Frostfen Marshes
  SKELETON:     { name: 'Skeleton',     hp: 5,  damage: 2, color: '#cccccc', exp: 10, gold: 5  },
  BOG_WITCH:    { name: 'Bog Witch',    hp: 6,  damage: 4, color: '#3a8a3a', exp: 20, gold: 12 },
  // Scorched Wastes
  ORC:          { name: 'Orc',          hp: 8,  damage: 3, color: '#8b4513', exp: 20, gold: 10 },
  EMBER_DEMON:  { name: 'Ember Demon',  hp: 10, damage: 4, color: '#ff4400', exp: 30, gold: 15 },
  DARK_MAGE:    { name: 'Dark Mage',    hp: 6,  damage: 4, color: '#9932cc', exp: 25, gold: 15 }
};

// Which enemy types appear on each tile id
const REGION_ENEMIES = {
  [13]: ['BANDIT', 'SHADOW_FOX'],   // FOREST
  [11]: ['SKELETON', 'BOG_WITCH'],  // MARSH
  [12]: ['ORC', 'EMBER_DEMON', 'DARK_MAGE'], // SCORCHED
};
function regionEnemies(tileId) {
  return REGION_ENEMIES[tileId] || ['CINDER_SLIME', 'ASH_WOLF'];
}

const BLOCKED_SPAWN_TILES = new Set([
  TILES.TOWN, TILES.DUNGEON, TILES.CHEST, TILES.STAIRS_UP, TILES.STAIRS_DOWN
]);

export function spawnEnemies(map, npcs, player) {
  const enemies = [];
  if (!map.hasEnemies) return enemies;

  const count = map.enemyCount ?? 40;
  const safeRadius = map.enemySpawnRadius ?? 9;
  let attempts = 0;

  for (let i = 0; i < count; i++) {
    let x, y, valid;
    do {
      x = 1 + Math.floor(Math.random() * (map.width - 2));
      y = 1 + Math.floor(Math.random() * (map.height - 2));
      valid = true;

      const tile = map.tiles[y][x];
      if (tile.solid || BLOCKED_SPAWN_TILES.has(tile)) valid = false;
      if (npcs.some(n => n.x === x && n.y === y)) valid = false;
      if (Math.abs(x - player.x) < safeRadius && Math.abs(y - player.y) < safeRadius) valid = false;
      if (++attempts > 5000) return enemies; // safety exit
    } while (!valid);

    const pool = regionEnemies(map.tiles[y][x].id);
    const typeKey = pool[Math.floor(Math.random() * pool.length)];
    const type = ENEMY_TYPES[typeKey];
    enemies.push({
      id: i,
      x, y,
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

export function moveEnemies(state) {
  const map = state.maps[state.currentMapId];

  map.enemies.forEach(enemy => {
    if (!enemy.alive) return;
    if (Math.random() > 0.3) return; // 30% chance to move each turn

    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const newX = enemy.x + dir[0];
    const newY = enemy.y + dir[1];

    if (isSolid(map, newX, newY)) return;
    const tile = map.tiles[newY][newX];
    if (tile === TILES.TOWN) return;
    if (map.enemies.some(e => e.alive && e.id !== enemy.id && e.x === newX && e.y === newY)) return;
    if (newX === state.player.x && newY === state.player.y) return;

    enemy.x = newX;
    enemy.y = newY;
  });
}

// Returns true if the enemy died
export function playerAttackEnemy(state, enemy) {
  const map = state.maps[state.currentMapId];
  // player attack = 2 + STR + weapon bonus + random(0, 2)
  const playerDmg = 2 + state.player.str + weaponBonus(state.player) + Math.floor(Math.random() * 3);
  enemy.hp -= playerDmg;
  const msg = `You hit ${enemy.name} for ${playerDmg} damage!`;
  addMessage(`⚔️ ${msg}`);
  combatLog(msg, 'player-hit');

  // Boss phase 2 at 50% HP
  if (enemy.isBoss && !enemy.phase2 && enemy.hp > 0 && enemy.hp <= enemy.maxHp / 2) {
    enemy.phase2 = true;
    enemy.damage = 6;
    addMessage(`⚠️ The roots writhe violently! ${enemy.name} grows stronger!`);
  }

  if (enemy.hp <= 0) {
    enemy.alive = false;
    state.player.exp += enemy.exp;
    state.player.gold += enemy.gold;
    const winMsg = `Victory! +${enemy.exp} EXP, +${enemy.gold} Gold`;
    addMessage(`💀 ${winMsg}`);
    combatLog(winMsg, 'victory');

    // Chance to drop potion (50%)
    if (Math.random() < 0.5) {
      map.items.push({ x: enemy.x, y: enemy.y, type: ITEMS.potion });
      addMessage('🧪 A potion was dropped!');
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
    clearTimeout(window.deathTimeout);
    return true;
  }
  return false;
}

// Returns true if the player died
export function enemyAttackPlayer(state, enemy, onDeath) {
  // incoming damage = max(1, enemy damage - player DEF), with the old ±1 variance
  const enemyDmg = Math.max(1, enemy.damage + Math.floor(Math.random() * 2) - 1 - totalDef(state.player));
  state.player.hp -= enemyDmg;
  const msg = `${enemy.name} hits you for ${enemyDmg} damage!`;
  addMessage(`🩸 ${msg}`);
  combatLog(msg, 'enemy-hit');

  if (state.player.hp <= 0) {
    state.player.hp = 0;
    const deathMsg = 'You have been defeated!';
    addMessage(`💀 ${deathMsg}`);
    combatLog(deathMsg, 'death');
    updateUI(state);
    window.deathTimeout = setTimeout(() => {
      onDeath();
      clearCombatLog();
    }, 2000);
    return true;
  }
  return false;
}
