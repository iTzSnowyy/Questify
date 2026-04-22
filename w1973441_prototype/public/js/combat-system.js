// js/combat-system.js
// This module handles the core turn-based combat logic for boss fights.

class CombatSystem {
  constructor(playerStats, boss) {
    this.player = {
      hp: playerStats.strength * 5 + playerStats.dexterity * 2 + playerStats.intelligence * 2 + 50,
      maxHp: playerStats.strength * 5 + playerStats.dexterity * 2 + playerStats.intelligence * 2 + 50,
      str: playerStats.strength,
      dex: playerStats.dexterity,
      int: playerStats.intelligence,
      defending: false,
      burn: { damage: 0, turns: 0 }
    };

    this.boss = {
      hp: boss.hp,
      maxHp: boss.hp,
      damage: boss.damage,
      cooldowns: { heavy: 0 },
      charging: false,
      burn: { damage: 0, turns: 0 }
    };

    this.log = [];
    this.turnCount = 0;
  }

  // Add a new message to the combat log for the current turn
  addLog(message, type = "system") {
    this.log.push({ message, type, turn: this.turnCount });
  }

  // Return the current combat log entries
  getLog() {
    return this.log;
  }

  // Clear the combat log for a fresh fight or reset
  clearLog() {
    this.log = [];
  }

  // Player Actions 
  // Perform a basic player attack with crit and damage calculation
  attack() {
    this.turnCount++;
    this.addLog("You performed a basic Attack!", "player");

    let damage = this.player.str * 2;
    const critChance = this.player.dex * 1.5;
    const isCrit = Math.random() * 100 < critChance;

    if (isCrit) {
      damage *= 1.5;
      this.addLog("CRIT! Super effective!", "crit");
    }

    const actualDamage = this.applyBossDodge(damage);
    this.boss.hp -= actualDamage;
    this.addLog(`Dealt ${Math.round(actualDamage)} damage!`, "player");

    this.playerTurnEnd();
  }

  // Put the player into a defensive stance that reduces the next incoming damage
  defend() {
    this.turnCount++;
    this.addLog("You take a defensive stance!", "player");
    this.player.defending = true;
    this.addLog("Next damage will be reduced by 50%!", "player");

    this.playerTurnEnd();
  }

  // Attempt to flee the battle using the player's dexterity as chance
  flee() {
    this.turnCount++;
    const fleeChance = this.player.dex * 2;
    const succeeds = Math.random() * 100 < fleeChance;

    if (succeeds) {
      this.addLog(`You successfully fled! (${fleeChance.toFixed(1)}% chance)`, "system");
      return { fled: true };
    } else {
      this.addLog(`Flee attempt failed!`, "system");
      this.playerTurnEnd();
      return { fled: false };
    }
  }

  // Damage Mechanics
  // Apply boss dodge or accuracy modifiers to damage (currently no-op)
  applyBossDodge(damage) {
    // Placeholder for future dodge or accuracy mechanics
    return damage;
  }

  // Reduce incoming damage if the player was defending this turn
  applyPlayerDefence(damage) {
    if (this.player.defending) {
      this.player.defending = false;
      damage *= 0.5;
      this.addLog("Defence reduced damage by 50%!", "player");
    }
    return damage;
  }

  // Boss AI
  // Execute the boss's turn, including burn damage and heavy attack logic
  bossTurn() {
    if (this.boss.burn.turns > 0) {
      this.boss.hp -= this.boss.burn.damage;
      this.addLog(`Boss takes ${this.boss.burn.damage} burn damage!`, "boss");
      this.boss.burn.turns--;
    }

    if (this.boss.charging) {
      const heavyDamage = 50;
      const actualDamage = Math.round(this.applyPlayerDefence(heavyDamage));
      this.player.hp -= actualDamage;
      this.addLog(`Boss performs Heavy Attack! ${Math.round(actualDamage)} damage!`, "boss");
      this.boss.charging = false;
    } else if (this.boss.cooldowns.heavy <= 0) {
      this.boss.charging = true;
      this.boss.cooldowns.heavy = 2;
      this.addLog("Boss is charging a heavy attack!", "boss");
    } else {
      const basicDamage = this.boss.damage;
      const actualDamage = Math.round(this.applyPlayerDefence(basicDamage));
      this.player.hp -= actualDamage;
      this.addLog(`Boss attacks! ${Math.round(actualDamage)} damage!`, "boss");
      this.boss.cooldowns.heavy--;
    }
  }

  // State Queries
  // End the player's turn and let the boss act next
  playerTurnEnd() {
    this.bossTurn();
    this.player.defending = false;
  }

  // Return true when the player still has HP remaining
  isPlayerAlive() {
    return this.player.hp > 0;
  }

  // Return true when the boss still has HP remaining
  isBossAlive() {
    return this.boss.hp > 0;
  }

  // Determine whether the fight has ended for either side
  isBattleOver() {
    return !this.isPlayerAlive() || !this.isBossAlive();
  }

  // Get the current player state for UI rendering
  getPlayerState() {
    return {
      hp: Math.max(0, this.player.hp),
      maxHp: this.player.maxHp,
      str: this.player.str,
      dex: this.player.dex,
      int: this.player.int,
      defending: this.player.defending,
      burn: this.player.burn
    };
  }

  // Get the current boss state for UI rendering
  getBossState() {
    return {
      hp: Math.max(0, this.boss.hp),
      maxHp: this.boss.maxHp,
      charging: this.boss.charging,
      cooldown: this.boss.cooldowns.heavy,
      burn: this.boss.burn
    };
  }
}

export { CombatSystem };