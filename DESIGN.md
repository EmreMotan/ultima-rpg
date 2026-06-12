# Emberfall RPG — Design Specification

> This document is the source of truth for the Emberfall RPG project. Read it before making any changes. It covers the world, all planned systems, and the implementation roadmap. Work through phases in order — each phase should be fully playable before starting the next.

---

## Project Overview

A mobile-first, browser-based tile RPG inspired by Lowlander and Ultima IV. Pure HTML5 Canvas, vanilla JS, no frameworks, no build tools. Playable in one hand, portrait orientation. Target playtime: 4–6 hours.

**Live:** https://emremotan.github.io/ultima-rpg/  
**Stack:** `index.html` + `js/game.js` + `css/style.css`  
**Current version:** v0.8.12 (pre-Emberfall baseline)

### Core design principles
- One-handed portrait play is a hard constraint — all interactions must work with a single thumb
- The world holds secrets discoverable only through NPC conversation — no quest markers, no quest log
- Mobile-first means mobile-*only* quality: touch targets, no hover states, no keyboard-required interactions
- Ship incrementally — every phase ends in a playable, pushable state

---

## The World: Emberfall

### Setting

Two centuries ago, the sun began to dim. Not dramatically — just a little less warm each decade. The kingdom of **Emberfall** was once temperate and prosperous. Now its coasts are half-frozen and abandoned, its people are clustered around the **Hearthvein** (a volcanic ridge keeping the central valley livable), and its harvests have been thinning for three years running.

Nobody talks about it much.

### The Mythology (mostly invisible to the player)

The sun in Emberfall isn't a star — it's **the Ember**, a colossal living flame imprisoned in the sky by the world's first civilization as a source of endless light. The ritual required burying a **Heartstone** deep underground as an anchor.

Two centuries ago, something found the Heartstone and began slowly consuming it. As the stone erodes, the Ember weakens.

That something is **the Unbound** — a primordial darkness that existed before the Ember was lit, imprisoned underground since the world began. The dungeons the player explores are literal descents toward the source of the world's decay.

**The endgame:** Reach the Heartstone in the Deep Hearth, defeat the Unbound, rekindle the stone. The sun gets brighter — not fixed, just brighter. Cautious hope, not triumphant fanfare.

### Factions (flavor NPCs, not mechanics)

| Faction | Belief | Tone |
|---------|--------|------|
| **Church of the Eternal Flame** | The sun is a god fed by ritual. They maintain the Shrines of Ember. | Sincere, increasingly desperate |
| **Astronomers of Dusk** | It's a natural cycle. The sun will return. | Rational, losing influence |
| **The Ashborne** | The sun is dead. Something underground is eating it. | Calm in an unsettling way — and correct |

### NPC voice

Working people with dry pragmatism about the cold. Nobody speeches about the sun.

> *"Aye, the harvest was thinner this year. Third year running. We don't talk about it much."*

Church NPCs are earnest. Ashborne NPCs are unnervingly calm. King Aldric is decent and tired.

The player has no name or backstory — a traveler who blew into Cinderwick. Nobody treats you as chosen. You're just someone willing to go into the dark.

---

## World Structure

### Overworld: 64×64

Four terrain regions, each implying danger level. Hand-authored, not procedurally generated.

| Region | Location on map | Enemies |
|--------|----------------|---------|
| Hearthvein Valley | Center (starting area) | Ash Wolves, Cinder Slimes |
| Ashwood Forest | Northwest | Bandits, Shadow Foxes |
| Frostfen Marshes | Southeast | Skeletons, Bog Witches |
| Scorched Wastes | Northeast | Orcs, Ember Demons, Dark Mages |

Mountains divide regions. Water borders the map edges and internal lakes. Towns and dungeon entrances are tile types on the overworld — walking onto them triggers a map transition.

### Movement unlocks (gate terrain over time)

1. **Default** — grass, path, forest floor, town tiles, dungeon entrances
2. **Ashen Boots** (reward from Dungeon 1) — cross mountain tiles
3. **Rowboat** (bought in Greyhollow after Act 2 quest) — cross shallow water
4. **Ember Vessel** (airship; reward from King Aldric after Act 3) — cross all terrain, fast travel

This creates a natural sequence: Valley → Forest/Dungeon 1 → Marshes/Dungeon 2 → Wastes/Dungeon 3 → Deep Hearth.

### Towns (3)

| Town | Location | Specialty | Key content |
|------|----------|-----------|-------------|
| **Cinderwick** | Center-north, Valley | Starting town, farming | General store, Healer, Elder Aldric gives first quest |
| **Greyhollow** | Southwest, Marshes | Former fishing port, smugglers | Weaponsmith, Mage guild, Ferryman sells rowboat |
| **Ashenmere** | Northeast, near Wastes | Capital, political | Armorsmith, Tavern, King Aldric, Church HQ |

Each town is a separate 24×24 map. 8–12 NPCs total per town. Most have one flavor line. 3–4 have keyword dialogue with quest clues.

### Dungeons (3 + final)

| Dungeon | Floors | Boss | Reward |
|---------|--------|------|--------|
| **Cavern of Roots** | 2 | Rootspawn (giant spider variant) | Ashen Boots |
| **Sunken Crypt** | 3 | The Pale Warden (lich) | Skeleton Key → unlocks Ashenmere armory |
| **Ember Tower** | 3 | Scorch Demon | Hearthstone Fragment (quest item) |
| **The Deep Hearth** | 4 | The Unbound | Victory |

Each dungeon floor: enemies scaled to dungeon, at least one locked door + key on same floor, one chest, stairs up/down. Boss on final floor. Floors 2+ are dark (limited vision radius) unless player has Light spell or torch.

---

## Systems

### Multi-Map Architecture

The game uses a **map stack**. At any time, the player is on one of:
- The overworld
- A town interior
- A dungeon floor

**State to preserve per map:** tile grid, enemy positions/HP, chest open/closed state, NPC positions.  
**Transitions:** step onto TOWN tile → enter town; step onto DUNGEON_ENTRANCE → enter dungeon floor 1; step onto EXIT tile in a town/dungeon → return to overworld at the tile you entered from.  
**Dungeon floors:** STAIRS_DOWN and STAIRS_UP tiles connect floors within a dungeon.

### Player Stats

```
HP / MaxHP    — health (starts 20/20)
MP / MaxMP    — mana (starts 0/0; increases with level)
STR           — base attack modifier (starts 1)
DEF           — damage reduction (starts 0)
Level         — 1–10
EXP           — resets on level-up
Gold          — currency
```

### Equipment (2 slots)

- **Weapon** slot — increases attack damage
- **Armor** slot — increases DEF

Equip from inventory: tap item → "Equip" button. Swapping replaces current. No encumbrance.

**Weapon progression:**
Rusty Dagger (starting, free) → Short Sword (80g) → Broadsword (200g) → Ember Blade (500g, Ashenmere shop)

**Armor progression:**
None → Leather Vest (60g) → Chainmail (180g) → Ashen Plate (450g, unlocked via Skeleton Key)

### Combat

Bump combat stays — walk into enemy to attack. No separate combat screen.

**Damage formula:**
```
player attack = 2 + STR + weapon bonus + random(0, 2)
incoming damage = max(1, enemy.damage - player.DEF)
```

**Enemy behavior tiers:**
- *Passive* (slimes, small creatures): move toward player only if within 3 tiles
- *Aggressive* (skeletons, orcs): move toward player if within 6 tiles
- *Ranged* (dark mages, bog witches): stay at distance 2, deal damage without adjacency — attack fires if player steps within 4 tiles

**Flee:** Move in the direction away from an adjacent enemy to attempt escape. 60% success. On failure, enemy gets a free attack.

**Boss combat:** Two HP phases. At 50% HP, boss gains a new attack (telegraphed by a message one turn before it fires).

### Spells

Learned by buying scrolls at the Mage Guild (Greyhollow) or finding them in dungeons.

| Spell | MP Cost | Effect |
|-------|---------|--------|
| Heal | 3 | Restore 8 HP |
| Spark | 2 | Deal 6 magic damage to nearest enemy |
| Light | 1 | Illuminate dark dungeon floors for 20 turns |
| Unlock | 4 | Open a locked door without a key |
| Sleep | 5 | Stun adjacent enemy for 2 turns |

Mana does not regenerate passively. Restored at Healers (costs gold) or via Mana Potions (found/bought). This makes spell use a real resource decision.

**Casting:** Inventory panel → Spells tab → tap spell.

### NPC Dialogue — Keyword System

Replace sequential dialogue lines with a Ultima-style keyword system.

**Interaction:** Bump into or press A near NPC → dialogue panel opens with greeting text + up to 4 keyword buttons.

**Rules:**
- Every NPC has NAME and JOB keywords minimum
- Quest-relevant NPCs have at least one clue keyword
- Some keywords unlock new keywords in the same conversation
- 2–3 "password" keywords exist in the world — saying them to the right NPC unlocks something (shop discount, hidden passage, free item)
- No quest log, no map markers — information lives only in conversation

**Example — Elder Aldric in Cinderwick:**
```
"Welcome to Cinderwick. Don't let the cold put you off — it's warmer than it was last week."
[NAME] [JOB] [QUEST] [CAVERN]

NAME  → "Aldric. I've advised this village for thirty years."
JOB   → "I worry, mostly. And advise. Mostly worrying."
QUEST → "The Cavern of Roots north of here — something's wrong in it. Miners won't go back."
        [unlocks: BOOTS, ROOTS]
BOOTS → "The Ashen Boots are said to be in there. Old warmth-magic in the soles. Cross any peak."
CAVERN/ROOTS → "North road, past the dead oaks. You'll know the entrance by the smell."
```

### Economy

Gold earned from: enemy drops, chest loot, quest rewards.

**Shops:**
- General Store (Cinderwick) — Health Potions (15g), Mana Potions (25g), Torches (5g)
- Healer (Cinderwick, Greyhollow) — Restore full HP (cost = missing HP × 2), Restore full MP (cost = missing MP × 3)
- Weaponsmith (Greyhollow) — weapons
- Mage Guild (Greyhollow) — spell scrolls, mana potions
- Armorsmith (Ashenmere, locked behind Skeleton Key) — armor

### Inventory

12 item slots. Two tabs in the inventory panel: **Items** and **Spells**.

Item types:
- Health Potion (restores 10 HP)
- Mana Potion (restores 5 MP)
- Torch (provides light for 30 turns in dark dungeons)
- Keys (used automatically on locked doors)
- Quest items (Hearthstone Fragment, etc.) — shown in inventory, no action

### Level Up

On level up, a choice modal appears with two options (player picks one):
- **+5 MaxHP** (and full heal)
- **+1 STR** or **+1 DEF** (alternates each level-up)

EXP threshold: `level × 50` (same as current).  
MP increases automatically: every 2 levels, +5 MaxMP.

### Save System

Auto-save to `localStorage` after every map transition and NPC conversation end. One save slot.

Save includes: player stats, inventory, equipment, spells known, current map + floor, quest flags.

Title screen on first load (and after death/victory) shows **Continue** (if save exists) and **New Game**. New Game clears save.

### Death

Soft death (default): respawn at Cinderwick healer, lose half gold, keep equipment.

---

## Main Quest

Three acts. No quest log — information is gathered through NPC conversation only.

### Act 1 — The Cavern
- **Hook:** Elder Aldric in Cinderwick mentions miners stopped returning from the Cavern of Roots.
- **Goal:** Descend 2 floors, defeat Rootspawn.
- **Reward:** Ashen Boots. Mountain pass to the west opens.

### Act 2 — The Ferryman's Price
- **Hook:** Greyhollow ferryman Osric will sell you a Rowboat only if you bring him the Skeleton Key from the Sunken Crypt (he wants to open an old lockbox of his own).
- **Goal:** Descend 3 floors, defeat the Pale Warden, retrieve Skeleton Key.
- **Reward:** Rowboat (unlocks water travel) + Skeleton Key also opens the Ashenmere armory with the best armor.

### Act 3 — Into the Wastes
- **Hook:** Commander Veth in Ashenmere: the entrance to the Deep Hearth only opens for someone carrying a Hearthstone Fragment. The last known Fragment is in the Ember Tower.
- **Goal:** Descend 3 floors, defeat the Scorch Demon, retrieve Fragment. Then reach the Deep Hearth, descend 4 floors, defeat the Unbound.
- **Reward:** Victory screen. Time played. "The sky above Emberfall grows, just slightly, brighter."

### Side Content
- **The Hermit** (overworld NPC, behind mountain pass, requires Ashen Boots): teaches Sleep spell for free if you bring him a Mana Potion.
- **Password: "EMBERVEIL"** — learned from an Ashborne NPC in Greyhollow's tavern; spoken to the Ashenmere Church priest unlocks a hidden storeroom with 200g and a spell scroll.
- **Hidden chest** on overworld behind a mountain pass: 200g and a Mana Potion.

---

## UI Specification

### Status bar (top)
```
HP: 14/20  MP: 3/10  [weapon name]  [armor name]  Gold: 85  LVL: 4
```
Zone name displayed as a subtitle below the status bar: *"Cinderwick"* / *"Cavern of Roots — Floor 2"*

### Inventory panel
Two tabs: **Items** and **Spells**.
- Items: grid of 12 slots. Tap item → context shows "Use" (consumables) or "Equip" (equipment).
- Spells: list of learned spells with MP cost. Tap to cast. Grayed out if insufficient MP.

### Dialogue panel
NPC name at top. Greeting text. Up to 4 keyword buttons below. Tapping a keyword replaces the greeting text with the response. New keywords that unlock appear in the button row. "Goodbye" button always present to close.

### Combat log
3-line persistent log at top of screen (current behavior). Add:
- Red screen-edge flash on player taking damage
- Gold flash on level-up

### Controls (unchanged)
▲ ◀ ▶ ▼ dpad + A (action) + 📦 (inventory)

---

## File Structure (target)

```
index.html
js/
  game.js       ← main loop, input, draw, map transitions
  world.js      ← map definitions, town/dungeon layouts
  combat.js     ← combat, enemy AI
  npcs.js       ← NPC data, keyword dialogue trees
  player.js     ← player state, inventory, equipment, spells
  ui.js         ← all DOM/canvas UI rendering
css/
  style.css
DESIGN.md       ← this file
```

The current monolithic `game.js` should be split into these modules as part of the Phase 1 refactor. Use ES modules (`type="module"` on the script tag).

---

## Implementation Roadmap

Work through these phases in order. Each phase is a shippable improvement.

### Phase 1 — Multi-map system + module split
- Refactor `game.js` into the module structure above
- Implement map stack: overworld, town maps, dungeon floors
- Cinderwick town interior (24×24, walkable, exits back to overworld)
- Map transition on TOWN tile entry/exit
- Zone name shown in status bar
- **Milestone:** Player can walk into Cinderwick and back out

### Phase 2 — Cinderwick town + shops
- 8 NPCs in Cinderwick with keyword dialogue system
- General Store: buy Health Potions
- Healer: restore HP for gold
- Elder Aldric with full Act 1 keyword tree
- **Milestone:** Economy works; Act 1 hook is in place

### Phase 3 — Equipment system
- Weapon and armor item types
- Equipment slots in player state
- DEF applied to incoming damage calculation
- Inventory panel redesign (Items tab with Equip button)
- Starting weapon: Rusty Dagger (equipped automatically)
- **Milestone:** Equipment meaningfully changes combat

### Phase 4 — Expanded overworld (64×64)
- Hand-author the full 64×64 overworld with all 4 regions
- Place all town and dungeon entrance tiles
- Mountain tiles block movement (until Ashen Boots)
- Water tiles block movement (until Rowboat)
- Enemy types vary by region
- **Milestone:** World feels large and regionally distinct

### Phase 5 — Dungeon system (Cavern of Roots)
- Dungeon floor maps (20×20)
- STAIRS_DOWN / STAIRS_UP tiles with floor transitions
- Locked doors + keys on same floor
- Chests (auto-open, contain loot)
- Lighting system: dark floors, 3-tile vision radius
- Rootspawn boss fight (2-phase)
- Ashen Boots reward, mountain movement unlocked
- **Milestone:** First dungeon fully completable

### Phase 6 — Mana + spells
- MP stat added to player
- Heal, Spark, Light spells (starter three)
- Spells tab in inventory panel
- Mana Potions as loot
- Healer in Cinderwick can restore MP
- **Milestone:** New verb available to player

### Phase 7 — Greyhollow + Act 2
- Greyhollow town interior + NPCs
- Weaponsmith shop
- Mage Guild (sell spell scrolls: Unlock, Sleep)
- Ferryman Osric keyword dialogue + rowboat quest
- Sunken Crypt dungeon (3 floors, Pale Warden boss)
- Rowboat item, water movement unlocked
- **Milestone:** Act 2 completable end-to-end

### Phase 8 — Save system
- `localStorage` auto-save after map transitions and dialogue
- Title screen with Continue / New Game
- Save includes all player state + quest flags + map state
- **Milestone:** Game is retainable across sessions

### Phase 9 — Ashenmere + Act 3 + victory
- Ashenmere town interior + NPCs + King Aldric
- Armorsmith (locked behind Skeleton Key)
- Ember Tower dungeon (3 floors, Scorch Demon boss)
- The Deep Hearth dungeon (4 floors, The Unbound boss)
- Victory screen with time played
- **Milestone:** Game is completable start to finish

### Phase 10 — Polish + side content
- Hermit NPC on overworld (requires Ashen Boots)
- EMBERVEIL password chain
- Hidden overworld chest
- Boss second-phase attack patterns
- Ranged enemy behavior (dark mages, bog witches)
- Environmental storytelling in dungeons (journals, scorch marks)
- Hardcore mode toggle on new game screen
- Version bump to 1.0
- **Milestone:** Shippable v1.0

---

## Publishing Workflow

1. Increment `VERSION` in `js/game.js`
2. Update `?v=x.x.x` on the script tag in `index.html`
3. `git add` relevant files, `git commit`, `git push origin main`
4. GitHub Pages auto-deploys in ~1–2 minutes

---

## Out of Scope (do not build)

- Random/procedural world generation
- Party system
- Crafting
- Skill trees
- Dialogue trees deeper than 2 levels of keywords
- Online features
- Sound / music (future consideration)
