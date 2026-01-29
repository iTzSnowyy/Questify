// js/bosses.js
import { auth, onAuthStateChanged } from "./firebase-config.js";
import { getUserProfile, addReward, updateCharacterUI } from "./rewards.js";

const fightBtn = document.getElementById("fight-boss-btn");
const bossResult = document.getElementById("boss-result");

let currentUser = null;

onAuthStateChanged(auth, async user => {
  currentUser = user;
});

if (fightBtn) {
  fightBtn.addEventListener("click", async () => {
    bossResult.textContent = "";
    if (!currentUser) {
      bossResult.textContent = "You must be logged in.";
      return;
    }

    const profile = await getUserProfile(currentUser.uid);
    if (!profile) {
      bossResult.textContent = "Profile not found.";
      return;
    }

    const stats = profile.stats || { strength: 5, dexterity: 5, intelligence: 5 };
    const playerPower = stats.strength * 2 + stats.dexterity + stats.intelligence;
    const bossPower = 100; // Slacking Dragon baseline

    if (playerPower >= bossPower) {
      const XP_REWARD = 50;
      const COIN_REWARD = 20;
      const result = await addReward(currentUser.uid, XP_REWARD, COIN_REWARD);
      await updateCharacterUI(currentUser.uid);

      let msg = `You defeated the Slacking Dragon! +${XP_REWARD} XP, +${COIN_REWARD} coins.`;
      if (result?.leveledUp) {
        msg += ` You reached level ${result.level}!`;
      }
      alert(msg);
      bossResult.textContent = "";
    } else {
      bossResult.textContent = `You were defeated... Your power (${playerPower}) is lower than the boss (${bossPower}). Try leveling up or improving your stats.`;
    }
  });
}
