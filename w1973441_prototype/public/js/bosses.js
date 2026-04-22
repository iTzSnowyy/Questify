// js/bosses.js
import { auth, onAuthStateChanged, db, doc, updateDoc, getDoc } from "./firebase-config.js";
import { getUserProfile, addReward, updateCharacterUI } from "./rewards.js";
import { CombatSystem } from "./combat-system.js";
import { getEquipmentBonuses } from "./shop-items.js";
import { getAvatarById } from "./avatars.js";

// Cache page elements for boss list and fight interface
const bossListEl = document.getElementById("boss-list");
const combatSection = document.getElementById("combat-section");
const bossName = document.getElementById("boss-name");
const combatLog = document.getElementById("combat-log");
const playerHpEl = document.getElementById("player-hp");
const playerMaxHpEl = document.getElementById("player-max-hp");
const playerHpBar = document.getElementById("player-hp-bar");
const playerStrEl = document.getElementById("player-str");
const playerDexEl = document.getElementById("player-dex");
const playerIntEl = document.getElementById("player-int");
const playerEffectsEl = document.getElementById("player-effects");
const playerStrBonusEl = document.getElementById("player-str-bonus");
const playerDexBonusEl = document.getElementById("player-dex-bonus");
const playerIntBonusEl = document.getElementById("player-int-bonus");
const bossHpEl = document.getElementById("boss-hp");
const bossMaxHpEl = document.getElementById("boss-max-hp");
const bossHpBar = document.getElementById("boss-hp-bar");
const bossStatusEl = document.getElementById("boss-status");
const bossEffectsEl = document.getElementById("boss-effects");
const bossAvatarEl = document.getElementById("boss-avatar");
const playerAvatarEl = document.getElementById("player-avatar");

const attackBtn = document.getElementById("attack-btn");
const defendBtn = document.getElementById("defend-btn");
const fleeBtn = document.getElementById("flee-btn");

let currentUser = null;
let currentBoss = null;
let combat = null;

// Boss definitions with unlock order and rewards
const BOSSES = [
  {
    id: "easy",
    name: "Slacking Dragon",
    hp: 180,
    damage: 16,
    description: "A gentler opener to warm up your stats.",
    rewardXp: 30,
    rewardCoins: 10,
    requiredLevel: 1,
    avatar: "assets/slacking_dragon.png"
  },
  {
    id: "medium",
    name: "Procrastination Phoenix",
    hp: 400,
    damage: 28,
    description: "A serious challenge. Build up your strength!",
    rewardXp: 60,
    rewardCoins: 25,
    requiredLevel: 3,
    avatar: "assets/procrastinating_phoenix.png"
  },
  {
    id: "hard",
    name: "Distraction Demon",
    hp: 600,
    damage: 35,
    description: "The ultimate test. Max out your stats to prevail.",
    rewardXp: 100,
    rewardCoins: 50,
    requiredLevel: 5,
    avatar: "assets/distraction_demon.png"
  }
];

onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) {
    renderBosses();
  }
});

// Render the boss selection cards and lock later bosses until prerequisites are met
async function renderBosses() {
  bossListEl.innerHTML = "";
  for (let i = 0; i < BOSSES.length; i++) {
    const boss = BOSSES[i];
    const card = document.createElement("div");
    card.className = "card";

    const prevBoss = i > 0 ? BOSSES[i - 1] : null;
    const isUnlocked = !prevBoss || await isBossDefeated(prevBoss.id);

    card.innerHTML = `
      <h3>${boss.name}</h3>
      <p>HP: ${boss.hp} | Damage: ${boss.damage}</p>
      <p>${boss.description}</p>
      <p>Recommended Level: ${boss.requiredLevel}+</p>
      ${isUnlocked ? `<button class="fight-btn btn" data-boss-id="${boss.id}">Fight!</button>` : `<p class="boss-locked">Locked: Defeat ${prevBoss.name} first.</p>`}
    `;

    if (isUnlocked) {
      card.querySelector(".fight-btn").addEventListener("click", () => startCombat(boss));
    }

    bossListEl.appendChild(card);
  }
}

// Check whether the user has cleared a given boss
async function isBossDefeated(bossId) {
  if (!currentUser) return false;
  const profile = await getUserProfile(currentUser.uid);
  return profile?.defeatedBosses?.includes(bossId) || false;
}

// Initialize a fight and show the combat UI
async function startCombat(boss) {
  currentBoss = boss;
  const profile = await getUserProfile(currentUser.uid);
  const stats = profile.stats || { strength: 5, dexterity: 5, intelligence: 5 };

  combat = new CombatSystem(stats, boss);

  bossName.textContent = boss.name;
  bossAvatarEl.src = boss.avatar;
  playerStrEl.textContent = stats.strength;
  playerDexEl.textContent = stats.dexterity;
  playerIntEl.textContent = stats.intelligence;

  const bonuses = getEquipmentBonuses(profile.equipment);
  playerStrBonusEl.textContent = bonuses.strength;
  playerDexBonusEl.textContent = bonuses.dexterity;
  playerIntBonusEl.textContent = bonuses.intelligence;

  if (profile.avatarId) {
    const playerAvatar = getAvatarById(profile.avatarId);
    if (playerAvatar) {
      playerAvatarEl.src = playerAvatar.imageSrc;
    }
  }

  combatLog.innerHTML = `<div class="log-entry system">Combat begins! Defeat ${boss.name} to advance!</div>`;

  bossListEl.style.display = "none";
  combatSection.style.display = "block";

  updateUI();

  attackBtn.onclick = () => handleAction("attack");
  defendBtn.onclick = () => handleAction("defend");
  fleeBtn.onclick = () => handleAction("flee");
}

// Process a chosen combat action and progress the encounter
function handleAction(action) {
  if (!combat || combat.isBattleOver()) return;

  switch (action) {
    case "attack":
      combat.attack();
      break;
    case "defend":
      combat.defend();
      break;
    case "flee": {
      const result = combat.flee();
      if (result.fled) {
        endCombat();
        return;
      }
      break;
    }
  }

  updateUI();

  if (combat.isBattleOver()) {
    setTimeout(async () => {
      if (combat.isPlayerAlive()) {
        await victory();
      } else {
        await defeat();
      }
    }, 500);
  }
}

// Refresh health, status, and combat log each turn
function updateUI() {
  const playerState = combat.getPlayerState();
  const bossState = combat.getBossState();
  const logs = combat.getLog();

  playerHpEl.textContent = playerState.hp;
  playerMaxHpEl.textContent = playerState.maxHp;
  playerHpBar.style.width = `${(playerState.hp / playerState.maxHp) * 100}%`;

  bossHpEl.textContent = bossState.hp;
  bossMaxHpEl.textContent = bossState.maxHp;
  bossHpBar.style.width = `${(bossState.hp / bossState.maxHp) * 100}%`;

  playerEffectsEl.innerHTML = "";
  if (playerState.defending) {
    playerEffectsEl.innerHTML += `<span class="effect-badge defend">DEFENDING</span>`;
  }
  if (playerState.burn.turns > 0) {
    playerEffectsEl.innerHTML += `<span class="effect-badge burn">BURN (${playerState.burn.turns})</span>`;
  }

  bossEffectsEl.innerHTML = "";
  if (bossState.burn.turns > 0) {
    bossEffectsEl.innerHTML += `<span class="effect-badge burn">BURN (${bossState.burn.turns})</span>`;
  }

  bossStatusEl.innerHTML = "";
  if (bossState.charging) {
    bossStatusEl.innerHTML = `Charging Heavy Attack!`;
  } else if (bossState.cooldown > 0) {
    bossStatusEl.innerHTML = `Heavy attack ready in ${bossState.cooldown} turns`;
  }

  combatLog.innerHTML = "";
  logs.forEach(log => {
    const entry = document.createElement("div");
    entry.className = `log-entry ${log.type}`;
    entry.textContent = log.message;
    combatLog.appendChild(entry);
  });
  combatLog.scrollTop = combatLog.scrollHeight;
}

// Reward the player and update user profile after a win
async function victory() {
  combatLog.innerHTML += `<div class="log-entry system log-victory">VICTORY! ${currentBoss.name} has been defeated!</div>`;

  const profile = await getUserProfile(currentUser.uid);
  const defeatedBosses = profile.defeatedBosses || [];
  if (!defeatedBosses.includes(currentBoss.id)) {
    defeatedBosses.push(currentBoss.id);
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, { defeatedBosses });
  }

  const result = await addReward(currentUser.uid, currentBoss.rewardXp, currentBoss.rewardCoins);
  await updateCharacterUI(currentUser.uid);

  let msg = `Victory! +${currentBoss.rewardXp} XP, +${currentBoss.rewardCoins} coins.`;
  if (result?.leveledUp) {
    msg += `You reached level ${result.level}!`;
  }

  setTimeout(() => {
    alert(msg);
    endCombat();
  }, 500);
}

// Show defeat feedback and reset the boss screen
async function defeat() {
  combatLog.innerHTML += `<div class="log-entry boss log-defeat">DEFEAT! ${currentBoss.name} has bested you!</div>`;
  setTimeout(() => {
    alert("Defeat! Your journey ends here... for now. Try leveling up and come back stronger!");
    endCombat();
  }, 500);
}

// Hide combat UI and show the boss list again
function endCombat() {
  combatSection.style.display = "none";
  bossListEl.style.display = "block";
  combat = null;
  renderBosses();
}
